import { randomUUID } from "node:crypto";
import { config } from "./config.ts";
import { AbortError } from "./events.ts";

/**
 * ComfyUI client for FLUX.2 [dev].
 *
 * The server is shared: never call the global /interrupt, only cancel our own prompt ids.
 * Pictures come back through PreviewImage (ComfyUI's temp folder), so nothing is left on its disk.
 * PreviewImage node ids are unique per job; the dispatcher in front of both GPUs needs that to
 * route /view to the right instance.
 */

export interface FluxJob {
  prompt: string;
  width: number;
  height: number;
  seed: number;
  /** Variations of the same prompt (different noise). */
  batch?: number;
}

export interface FluxSettings {
  turbo: boolean;
  steps: number;
  guidance: number;
}

export const FLUX_TURBO: FluxSettings = { turbo: true, steps: 8, guidance: 2.5 };
export const FLUX_FULL: FluxSettings = { turbo: false, steps: 28, guidance: 4 };

export type ComfyStatus = { state: "queued"; ahead: number } | { state: "running" };

type Graph = Record<string, { class_type: string; inputs: Record<string, unknown> }>;
type Link = [string, number];

const CLIENT_ID = `agent-grafik-${randomUUID().slice(0, 8)}`;

export interface FluxGraph {
  graph: Graph;
  outputs: string[];
  /** Regroup the pictures of every output node into one list per job (batch order). */
  split: (images: Buffer[][]) => Buffer[][];
}

/**
 * One prompt graph for many jobs. The text encoder and FLUX.2 do not fit on one GPU together and the
 * server runs with --disable-smart-memory, so the graph is ordered to load each model once:
 * every prompt is encoded first (a no-op ConditioningAverage chain gates the samplers), then all
 * sampling, then one VAE decode per picture size.
 */
export function fluxGraph(jobs: FluxJob[], settings: FluxSettings = FLUX_TURBO): FluxGraph {
  const graph: Graph = {};
  const node = (id: string, classType: string, inputs: Record<string, unknown>): Link => {
    graph[id] = { class_type: classType, inputs };
    return [id, 0];
  };

  const unet = node("unet", "UNETLoader", { unet_name: config.flux.unet, weight_dtype: "default" });
  const model = settings.turbo
    ? node("turbo", "LoraLoaderModelOnly", { model: unet, lora_name: config.flux.turboLora, strength_model: 1 })
    : unet;
  const clip = node("clip", "CLIPLoader", { clip_name: config.flux.textEncoder, type: "flux2", device: "default" });
  const vae = node("vae", "VAELoader", { vae_name: config.flux.vae });
  const sampler = node("sampler", "KSamplerSelect", { sampler_name: "euler" });

  const texts = jobs.map((job, index) => node(`t${index}`, "CLIPTextEncode", { text: job.prompt, clip }));
  let gate = texts[0];
  texts.slice(1).forEach((text, index) => {
    gate = node(`gate${index + 1}`, "ConditioningAverage", { conditioning_to: text, conditioning_from: gate, conditioning_to_strength: 1 });
  });

  const latents = jobs.map((job, index) => {
    const text =
      jobs.length > 1
        ? node(`c${index}`, "ConditioningAverage", { conditioning_to: texts[index], conditioning_from: gate, conditioning_to_strength: 1 })
        : texts[index];
    const conditioning = node(`g${index}`, "FluxGuidance", { conditioning: text, guidance: settings.guidance });
    return node(`s${index}`, "SamplerCustomAdvanced", {
      noise: node(`n${index}`, "RandomNoise", { noise_seed: job.seed }),
      guider: node(`m${index}`, "BasicGuider", { model, conditioning }),
      sampler,
      sigmas: node(`k${index}`, "Flux2Scheduler", { steps: settings.steps, width: job.width, height: job.height }),
      latent_image: node(`l${index}`, "EmptyFlux2LatentImage", { width: job.width, height: job.height, batch_size: job.batch ?? 1 }),
    });
  });

  const groups = new Map<string, number[]>();
  jobs.forEach((job, index) => {
    const key = `${job.width}x${job.height}`;
    groups.set(key, [...(groups.get(key) ?? []), index]);
  });
  const members = [...groups.values()];
  const outputs = members.map((indexes, group) => {
    let batch = latents[indexes[0]];
    indexes.slice(1).forEach((index, step) => {
      batch = node(`b${group}_${step}`, "LatentBatch", { samples1: batch, samples2: latents[index] });
    });
    const image = node(`d${group}`, "VAEDecode", { samples: batch, vae });
    const id = `p${group}_${randomUUID().slice(0, 12)}`;
    node(id, "PreviewImage", { images: image });
    return id;
  });

  const split = (images: Buffer[][]) => {
    const perJob: Buffer[][] = jobs.map(() => []);
    images.forEach((list, group) => {
      let cursor = 0;
      for (const index of members[group]) {
        const count = jobs[index].batch ?? 1;
        perJob[index] = list.slice(cursor, cursor + count);
        cursor += count;
      }
    });
    return perJob;
  };

  return { graph, outputs, split };
}

async function call(path: string, init: RequestInit & { timeoutMs?: number } = {}): Promise<Response> {
  const timeout = AbortSignal.timeout(init.timeoutMs ?? 30_000);
  try {
    return await fetch(`${config.comfyUrl}${path}`, {
      ...init,
      signal: init.signal ? AbortSignal.any([init.signal, timeout]) : timeout,
    });
  } catch (error) {
    if (init.signal?.aborted) throw new AbortError();
    throw new Error(`ComfyUI tidak dapat dihubungi di ${config.comfyUrl} (${(error as Error).message}).`);
  }
}

const postJson = (path: string, body: unknown, signal?: AbortSignal) =>
  call(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal });

function sleep(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) return reject(new AbortError());
    const onAbort = () => {
      clearTimeout(timer);
      reject(new AbortError());
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

/** Cancel only our own prompt: drop it from the queue, and stop it if it is the one running. */
export async function cancelPrompt(promptId: string): Promise<void> {
  await Promise.allSettled([
    postJson("/queue", { delete: [promptId] }),
    postJson("/interrupt", { prompt_id: promptId }),
  ]);
}

interface HistoryEntry {
  outputs?: Record<string, { images?: { filename: string; subfolder: string; type: string }[] }>;
  status?: { status_str?: string; completed?: boolean; messages?: [string, Record<string, unknown>][] };
}

function failureMessage(entry: HistoryEntry): string {
  for (const [kind, data] of entry.status?.messages ?? []) {
    if (kind === "execution_error") return `${data.node_type ?? "node"}: ${String(data.exception_message ?? "").trim()}`;
    if (kind === "execution_interrupted") return "dihentikan di ComfyUI";
  }
  return "eksekusi gagal";
}

async function queuePosition(promptId: string, signal?: AbortSignal): Promise<ComfyStatus | null> {
  const response = await call("/queue", { signal, timeoutMs: 10_000 }).catch(() => null);
  if (!response?.ok) return null;
  const queue = (await response.json()) as { queue_running?: unknown[][]; queue_pending?: unknown[][] };
  if (queue.queue_running?.some((entry) => entry[1] === promptId)) return { state: "running" };
  const pending = [...(queue.queue_pending ?? [])].sort((a, b) => Number(a[0]) - Number(b[0]));
  const index = pending.findIndex((entry) => entry[1] === promptId);
  return index >= 0 ? { state: "queued", ahead: index + (queue.queue_running?.length ?? 0) } : null;
}

export interface RunOptions {
  signal?: AbortSignal;
  onStatus?: (status: ComfyStatus) => void;
  /** Give up (and cancel the prompt) after this long. */
  timeoutMs?: number;
}

/** Queue a graph, wait for it, and download every picture per output node (PNG bytes). */
export async function runGraph(graph: Graph, outputs: string[], options: RunOptions = {}): Promise<Buffer[][]> {
  const { signal } = options;
  const response = await postJson("/prompt", { prompt: graph, client_id: CLIENT_ID }, signal);
  const queued = (await response.json().catch(() => ({}))) as {
    prompt_id?: string;
    error?: { message?: string; details?: string };
    node_errors?: Record<string, { errors?: { message?: string; details?: string }[] }>;
  };
  if (!response.ok || !queued.prompt_id) {
    const nodeError = Object.values(queued.node_errors ?? {})[0]?.errors?.[0];
    const detail = nodeError ? `${nodeError.message} ${nodeError.details ?? ""}` : (queued.error?.message ?? `HTTP ${response.status}`);
    throw new Error(`ComfyUI menolak workflow: ${detail.trim()}`);
  }

  const promptId = queued.prompt_id;
  const deadline = Date.now() + (options.timeoutMs ?? 20 * 60_000);
  let lastState = "";
  try {
    for (let tick = 0; ; tick++) {
      await sleep(tick === 0 ? 1500 : 1000, signal);
      if (Date.now() > deadline) throw new Error("ComfyUI terlalu lama (batas waktu habis).");

      const history = await call(`/history/${promptId}`, { signal, timeoutMs: 15_000 }).catch((error) => {
        if (signal?.aborted) throw error;
        return null;
      });
      const entry = history?.ok ? ((await history.json()) as Record<string, HistoryEntry>)[promptId] : undefined;
      if (entry?.status?.status_str === "error") throw new Error(`ComfyUI gagal: ${failureMessage(entry)}`);
      if (entry?.status?.completed) {
        return await Promise.all(
          outputs.map(async (id) => {
            const images = entry.outputs?.[id]?.images ?? [];
            if (!images.length) throw new Error("ComfyUI tidak mengembalikan gambar.");
            return Promise.all(images.map((image) => download(image, signal)));
          }),
        );
      }

      if (options.onStatus && tick % 3 === 0) {
        const status = await queuePosition(promptId, signal);
        const key = status ? `${status.state}:${status.state === "queued" ? status.ahead : ""}` : "";
        if (status && key !== lastState) {
          lastState = key;
          options.onStatus(status);
        }
      }
    }
  } catch (error) {
    if ((error as Error).name === "AbortError" || !(error as Error).message.startsWith("ComfyUI gagal")) {
      await cancelPrompt(promptId);
    }
    throw error;
  }
}

async function download(image: { filename: string; subfolder: string; type: string }, signal?: AbortSignal): Promise<Buffer> {
  const query = new URLSearchParams({ filename: image.filename, subfolder: image.subfolder, type: image.type });
  for (let attempt = 0; ; attempt++) {
    const response = await call(`/view?${query}`, { signal, timeoutMs: 60_000 });
    if (response.ok) return Buffer.from(await response.arrayBuffer());
    if (attempt >= 2) throw new Error(`Gambar ${image.filename} tidak bisa diunduh (HTTP ${response.status}).`);
    await sleep(800, signal);
  }
}

export interface RenderOptions extends RunOptions {
  settings?: FluxSettings;
  /** Graphs in flight at once; the dispatcher puts each on the GPU with the shortest queue. */
  lanes?: number;
  /** Jobs per graph. Smaller chunks show results sooner but reload the models more often. */
  chunkSize?: number;
  /** Called as soon as the chunk holding this job is done. */
  onResult?: (index: number, images: Buffer[]) => void | Promise<void>;
}

/** Render many jobs on both GPUs; returns the pictures of every job (batch order). */
export async function renderFlux(jobs: FluxJob[], options: RenderOptions = {}): Promise<Buffer[][]> {
  const results: Buffer[][] = jobs.map(() => []);
  if (!jobs.length) return results;
  const lanes = Math.max(1, options.lanes ?? 2);
  const size = Math.max(1, options.chunkSize ?? Math.ceil(jobs.length / lanes));
  const chunks: number[][] = [];
  for (let start = 0; start < jobs.length; start += size) {
    chunks.push(jobs.slice(start, start + size).map((_, offset) => start + offset));
  }

  const controller = new AbortController();
  const signal = options.signal ? AbortSignal.any([options.signal, controller.signal]) : controller.signal;
  let next = 0;
  const lane = async (_: unknown, laneIndex: number) => {
    // Let the dispatcher see the previous lane's prompt first, so the next one lands on the other GPU.
    if (laneIndex > 0) await sleep(laneIndex * 2000, signal);
    while (next < chunks.length) {
      const indexes = chunks[next++];
      const plan = fluxGraph(
        indexes.map((index) => jobs[index]),
        options.settings,
      );
      const images = plan.split(await runGraph(plan.graph, plan.outputs, { ...options, signal }));
      for (const [offset, index] of indexes.entries()) {
        results[index] = images[offset];
        await options.onResult?.(index, images[offset]);
      }
    }
  };

  try {
    await Promise.all(Array.from({ length: Math.min(lanes, chunks.length) }, lane));
  } catch (error) {
    controller.abort();
    throw error;
  }
  return results;
}

export interface ComfyHealth {
  ok: boolean;
  message: string;
  devices: { name: string; vramFreeGb: number; vramTotalGb: number }[];
  /** The FLUX.2 files configured in config.ts are installed. */
  models: boolean;
}

const gb = (bytes: unknown) => Math.round((Number(bytes) / 1024 ** 3) * 10) / 10;

export async function comfyHealth(): Promise<ComfyHealth> {
  try {
    const [stats, unet, lora] = await Promise.all([
      call("/system_stats", { timeoutMs: 5000 }).then((r) => r.json()),
      call("/object_info/UNETLoader", { timeoutMs: 8000 }).then((r) => r.json()),
      call("/object_info/LoraLoaderModelOnly", { timeoutMs: 8000 }).then((r) => r.json()),
    ]);
    const devices = ((stats as { devices?: Record<string, unknown>[] }).devices ?? []).map((device) => ({
      name: String(device.name ?? "").replace(/^cuda:\d+\s*/, "").replace(/\s*:.*$/, ""),
      vramFreeGb: gb(device.vram_free),
      vramTotalGb: gb(device.vram_total),
    }));
    const options = (info: unknown, node: string, input: string): string[] => {
      const spec = (info as Record<string, { input?: { required?: Record<string, unknown[]> } }>)[node]?.input?.required?.[input];
      return Array.isArray(spec?.[0]) ? (spec[0] as string[]) : [];
    };
    const models =
      options(unet, "UNETLoader", "unet_name").includes(config.flux.unet) &&
      options(lora, "LoraLoaderModelOnly", "lora_name").includes(config.flux.turboLora);
    return { ok: true, message: models ? "FLUX.2 siap" : "Model FLUX.2 tidak ditemukan", devices, models };
  } catch (error) {
    return { ok: false, message: (error as Error).message, devices: [], models: false };
  }
}

/** Stable 32-bit seed from a string, so re-running a deck repaints the same pictures. */
export function seedFrom(text: string): number {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export const randomSeed = () => Math.floor(Math.random() * 2 ** 32);
