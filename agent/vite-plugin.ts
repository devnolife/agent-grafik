import { randomUUID } from "node:crypto";
import fs from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import path from "node:path";
import type { Logger, Plugin, ViteDevServer } from "vite";
import { isValidSlug, THEME_IDS, type ImageShape, type ThemeId } from "../src/engine/spec.ts";
import { comfyHealth, type ComfyHealth } from "./comfy.ts";
import { config } from "./config.ts";
import type { AgentEvent, Emit } from "./events.ts";
import { listModels } from "./ollama.ts";
import {
  exportDeck,
  generateDeck,
  makeIcons,
  makePictures,
  repaintPictures,
  restyleIcons,
  setDeckTheme,
  type IconMode,
  type Quality,
} from "./pipeline.ts";

/**
 * Dev-server API for the studio's AI panel (`/api/agent/*`), plus an SSE stream of job events.
 *
 * Runs before Vite's own host check, so it validates Host and Origin itself (DNS rebinding / CSRF),
 * accepts only JSON bodies, and never takes a path or model setting from a request that it has not
 * checked against a fixed list.
 */

type JobKind = "deck" | "repaint" | "restyle" | "icons" | "image" | "export";
type JobStatus = "running" | "done" | "error" | "cancelled";

interface Job {
  id: string;
  kind: JobKind;
  label: string;
  slug?: string;
  status: JobStatus;
  startedAt: number;
  events: AgentEvent[];
  controller: AbortController;
}

export type JobSnapshot = Omit<Job, "controller">;

export type StreamMessage =
  | { type: "snapshot"; job: JobSnapshot | null }
  | { type: "job"; job: JobSnapshot }
  | { type: "event"; id: string; event: AgentEvent }
  | { type: "status"; id: string; status: JobStatus };

export interface AgentStatus {
  ollama: { ok: boolean; url: string; models: string[]; planner: string; review: string };
  comfy: ComfyHealth;
}

class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const snapshot = ({ controller: _, ...job }: Job): JobSnapshot => ({ ...job, events: [...job.events] });

function createJobs(logger: Logger) {
  let current: Job | null = null;
  const clients = new Set<ServerResponse>();
  const broadcast = (message: StreamMessage) => {
    const data = `data: ${JSON.stringify(message)}\n\n`;
    for (const client of clients) client.write(data);
  };

  return {
    get current() {
      return current;
    },
    start(kind: JobKind, label: string, slug: string | undefined, run: (emit: Emit, signal: AbortSignal) => Promise<unknown>) {
      if (current?.status === "running") throw new HttpError(409, `Masih ada proses berjalan: ${current.label}.`);
      const job: Job = {
        id: randomUUID(),
        kind,
        label,
        slug,
        status: "running",
        startedAt: Date.now(),
        events: [],
        controller: new AbortController(),
      };
      current = job;
      const emit: Emit = (event) => {
        if (event.type === "deck") job.slug = event.slug;
        job.events.push(event);
        if (job.events.length > 400) job.events.splice(0, job.events.length - 400);
        broadcast({ type: "event", id: job.id, event });
        if (event.type === "stage" || event.type === "done") logger.info(`[agent] ${event.message}`, { timestamp: true });
      };
      broadcast({ type: "job", job: snapshot(job) });
      logger.info(`[agent] mulai: ${label}`, { timestamp: true });

      void run(emit, job.controller.signal)
        .then(
          () => {
            job.status = "done";
          },
          (error: Error) => {
            job.status = error.name === "AbortError" ? "cancelled" : "error";
            emit({ type: "error", message: job.status === "cancelled" ? "Dibatalkan." : error.message });
            if (job.status === "error") logger.error(`[agent] ${error.stack ?? error.message}`, { timestamp: true });
          },
        )
        .finally(() => broadcast({ type: "status", id: job.id, status: job.status }));
      return job;
    },
    cancel() {
      if (current?.status !== "running") return false;
      current.controller.abort();
      return true;
    },
    subscribe(req: IncomingMessage, res: ServerResponse) {
      res.writeHead(200, {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      });
      res.write(`retry: 3000\n\ndata: ${JSON.stringify({ type: "snapshot", job: current ? snapshot(current) : null } satisfies StreamMessage)}\n\n`);
      clients.add(res);
      const ping = setInterval(() => res.write(": ping\n\n"), 15_000);
      req.on("close", () => {
        clearInterval(ping);
        clients.delete(res);
      });
    },
  };
}

/* ------------------------------------------------------------------------------------------ */
/* Request helpers                                                                             */
/* ------------------------------------------------------------------------------------------ */

function hostAllowed(host: string | undefined, allowed: string[] | true | undefined): boolean {
  if (allowed === true) return true;
  if (!host) return false;
  const name = host
    .replace(/:\d+$/, "")
    .replace(/^\[|\]$/g, "")
    .toLowerCase();
  if (name === "localhost" || name.endsWith(".localhost")) return true;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(name) || name.includes(":")) return true;
  return (allowed ?? []).some((entry) => (entry.startsWith(".") ? name === entry.slice(1) || name.endsWith(entry) : name === entry));
}

function sameOrigin(req: IncomingMessage): boolean {
  const origin = req.headers.origin;
  if (!origin) return req.headers["sec-fetch-site"] === undefined || req.headers["sec-fetch-site"] === "same-origin";
  try {
    return new URL(origin).host === req.headers.host;
  } catch {
    return false;
  }
}

async function readJson(req: IncomingMessage, limit = 256 * 1024): Promise<Record<string, unknown>> {
  if (!/^application\/json\b/i.test(req.headers["content-type"] ?? "")) throw new HttpError(415, "Content-Type harus application/json.");
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req as AsyncIterable<Buffer>) {
    size += chunk.length;
    if (size > limit) throw new HttpError(413, "Data terlalu besar (maks. 256 KB).");
    chunks.push(chunk);
  }
  let body: unknown;
  try {
    body = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
  } catch {
    throw new HttpError(400, "JSON tidak valid.");
  }
  if (typeof body !== "object" || body === null || Array.isArray(body)) throw new HttpError(400, "Body harus objek JSON.");
  return body as Record<string, unknown>;
}

function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
}

const text = (value: unknown, max: number): string | undefined => (typeof value === "string" ? value.slice(0, max) : undefined);
const flag = (value: unknown): boolean | undefined => (typeof value === "boolean" ? value : undefined);
function oneOf<T extends string>(value: unknown, allowed: readonly T[]): T | undefined {
  return typeof value === "string" && (allowed as readonly string[]).includes(value) ? (value as T) : undefined;
}
function integer(value: unknown, min: number, max: number): number | undefined {
  return typeof value === "number" && Number.isInteger(value) ? Math.min(Math.max(value, min), max) : undefined;
}
function slugOf(value: unknown): string {
  if (!isValidSlug(value)) throw new HttpError(400, "Slug deck tidak valid.");
  return value;
}

const ICON_MODES = ["lucide", "solid", "outline"] as const;
const QUALITIES = ["turbo", "full"] as const;

/* ------------------------------------------------------------------------------------------ */
/* Files from output/                                                                          */
/* ------------------------------------------------------------------------------------------ */

const TYPES: Record<string, string> = {
  ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ".pdf": "application/pdf",
  ".md": "text/markdown; charset=utf-8",
  ".svg": "image/svg+xml",
  ".jpg": "image/jpeg",
};

/** Only three shapes of path are served, all inside output/. */
function resolveOutputFile(parts: string[]): string {
  const [area, ...rest] = parts;
  const name = /^[\w-][\w.-]{0,100}$/;
  let file: string | undefined;
  if (area === "export" && rest.length === 2 && isValidSlug(rest[0])) {
    const [slug, base] = rest;
    if ([`${slug}.pptx`, `${slug}.pdf`, "qa-report.md"].includes(base)) file = path.join(config.outputDir, slug, base);
  } else if (area === "icons" && rest.length === 2 && name.test(rest[0]) && name.test(rest[1]) && rest[1].endsWith(".svg")) {
    file = path.join(config.outputDir, "icons", rest[0], rest[1]);
  } else if (area === "images" && rest.length === 1 && name.test(rest[0]) && rest[0].endsWith(".jpg")) {
    file = path.join(config.outputDir, "images", rest[0]);
  }
  const root = path.resolve(config.outputDir) + path.sep;
  if (!file || !path.resolve(file).startsWith(root)) throw new HttpError(404, "Berkas tidak ada.");
  return file;
}

function serveFile(res: ServerResponse, file: string, download: boolean) {
  const stat = fs.statSync(file, { throwIfNoEntry: false });
  if (!stat?.isFile()) throw new HttpError(404, "Berkas tidak ada.");
  const extension = path.extname(file).toLowerCase();
  res.statusCode = 200;
  res.setHeader("Content-Type", TYPES[extension] ?? "application/octet-stream");
  res.setHeader("Content-Length", stat.size);
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Content-Security-Policy", "default-src 'none'; style-src 'unsafe-inline'; img-src 'self'");
  const disposition = download || extension === ".pptx" ? "attachment" : "inline";
  res.setHeader("Content-Disposition", `${disposition}; filename="${path.basename(file)}"`);
  fs.createReadStream(file).pipe(res);
}

function library() {
  const urlOf = (...parts: string[]) => `/api/agent/files/${parts.map(encodeURIComponent).join("/")}`;
  const read = (dir: string) => fs.readdirSync(dir, { withFileTypes: true }).filter((entry) => !entry.name.startsWith("."));
  const iconsDir = path.join(config.outputDir, "icons");
  const imagesDir = path.join(config.outputDir, "images");
  const icons = fs.existsSync(iconsDir)
    ? read(iconsDir)
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort()
      .reverse()
      .slice(0, 12)
      .map((set) => ({
        set,
        files: read(path.join(iconsDir, set))
          .filter((entry) => entry.name.endsWith(".svg"))
          .map((entry) => ({ name: entry.name, url: urlOf("icons", set, entry.name) })),
      }))
    : [];
  const images = fs.existsSync(imagesDir)
    ? read(imagesDir)
      .filter((entry) => entry.isFile() && entry.name.endsWith(".jpg"))
      .map((entry) => ({ name: entry.name, time: fs.statSync(path.join(imagesDir, entry.name)).mtimeMs }))
      .sort((a, b) => b.time - a.time)
      .slice(0, 24)
      .map(({ name }) => ({ name, url: urlOf("images", name) }))
    : [];
  return { icons, images };
}

/* ------------------------------------------------------------------------------------------ */
/* Routes                                                                                      */
/* ------------------------------------------------------------------------------------------ */

let statusCache: { at: number; value: Promise<AgentStatus> } | undefined;

function agentStatus(): Promise<AgentStatus> {
  if (!statusCache || Date.now() - statusCache.at > 5000) {
    statusCache = {
      at: Date.now(),
      value: Promise.all([listModels().catch(() => null), comfyHealth()]).then(([models, comfy]) => ({
        ollama: {
          ok: Boolean(models),
          url: config.ollamaUrl,
          models: (models ?? []).map((model) => model.name),
          planner: config.plannerModel,
          review: config.reviewModel,
        },
        comfy,
      })),
    };
  }
  return statusCache.value;
}

async function route(req: IncomingMessage, res: ServerResponse, server: ViteDevServer, jobs: ReturnType<typeof createJobs>) {
  const url = new URL(req.url ?? "/", "http://localhost");
  const name = url.pathname.slice("/api/agent/".length);

  if (!hostAllowed(req.headers.host, server.config.server.allowedHosts)) throw new HttpError(403, "Host tidak diizinkan.");
  if (!sameOrigin(req)) throw new HttpError(403, "Permintaan lintas situs ditolak.");

  if (req.method === "GET") {
    if (name === "status") return sendJson(res, 200, await agentStatus());
    if (name === "events") return jobs.subscribe(req, res);
    if (name === "library") return sendJson(res, 200, library());
    if (name.startsWith("files/")) {
      const parts = name.slice("files/".length).split("/").map((part) => decodeURIComponent(part));
      return serveFile(res, resolveOutputFile(parts), url.searchParams.has("download"));
    }
    throw new HttpError(404, "Tidak ada.");
  }
  if (req.method !== "POST") throw new HttpError(405, "Metode tidak didukung.");

  const body = await readJson(req);
  const busySlug = jobs.current?.status === "running" ? jobs.current.slug : undefined;
  const start = (kind: JobKind, label: string, slug: string | undefined, run: (emit: Emit, signal: AbortSignal) => Promise<unknown>) => {
    const job = jobs.start(kind, label, slug, run);
    sendJson(res, 202, { id: job.id });
  };

  switch (name) {
    case "deck": {
      const brief = text(body.brief, 4000)?.trim();
      if (!brief || brief.length < 8) throw new HttpError(400, "Brief terlalu pendek.");
      const status = await agentStatus();
      const model = text(body.model, 120);
      if (model && !status.ollama.models.includes(model)) throw new HttpError(400, `Model "${model}" tidak ada di Ollama.`);
      const options = {
        brief,
        sources: text(body.sources, 60_000),
        slides: integer(body.slides, 3, 20),
        lang: oneOf(body.lang, ["id", "en"] as const),
        theme: oneOf<ThemeId>(body.theme, THEME_IDS),
        author: text(body.author, 80)?.trim() || undefined,
        model: model || undefined,
        icons: oneOf<IconMode>(body.icons, ICON_MODES),
        images: flag(body.images),
        review: flag(body.review),
        quality: oneOf<Quality>(body.quality, QUALITIES),
      };
      return start("deck", `Deck: ${brief.slice(0, 60)}`, undefined, (emit, signal) => generateDeck(options, emit, signal));
    }
    case "repaint": {
      const slug = slugOf(body.slug);
      const slideId = text(body.slideId, 40);
      const options = { slideId, review: flag(body.review), quality: oneOf<Quality>(body.quality, QUALITIES) };
      return start("repaint", slideId ? `Gambar baru: ${slideId}` : "Gambar ulang semua", slug, (emit, signal) =>
        repaintPictures(slug, options, emit, signal),
      );
    }
    case "restyle": {
      const slug = slugOf(body.slug);
      const mode = oneOf<IconMode>(body.icons, ICON_MODES);
      if (!mode) throw new HttpError(400, "Gaya ikon tidak dikenal.");
      return start("restyle", `Gaya ikon: ${mode}`, slug, (emit, signal) => restyleIcons(slug, mode, emit, signal));
    }
    case "icons": {
      const raw = Array.isArray(body.concepts) ? body.concepts.filter((item) => typeof item === "string").join("\n") : text(body.concepts, 4000);
      const concepts = (raw ?? "").split(/[\n,;]/).map((item) => item.trim().slice(0, 120)).filter(Boolean);
      if (!concepts.length) throw new HttpError(400, "Tulis minimal satu konsep ikon.");
      const style = oneOf(body.style, ["solid", "outline"] as const);
      return start("icons", `Ikon: ${concepts.slice(0, 3).join(", ")}`, undefined, (emit, signal) =>
        makeIcons(concepts, { style, quality: oneOf<Quality>(body.quality, QUALITIES) }, emit, signal),
      );
    }
    case "image": {
      const prompt = text(body.prompt, 1200)?.trim();
      if (!prompt) throw new HttpError(400, "Tulis deskripsi gambar.");
      const options = {
        style: oneOf<ThemeId | "free">(body.style, ["free", ...THEME_IDS]),
        shape: oneOf<ImageShape>(body.shape, ["wide", "portrait", "square"]),
        count: integer(body.count, 1, 4),
        quality: oneOf<Quality>(body.quality, QUALITIES),
      };
      return start("image", `Gambar: ${prompt.slice(0, 60)}`, undefined, (emit, signal) => makePictures(prompt, options, emit, signal));
    }
    case "export": {
      const slug = slugOf(body.slug);
      return start("export", `Ekspor ${slug}`, slug, (emit, signal) => exportDeck(slug, emit, signal));
    }
    case "theme": {
      const slug = slugOf(body.slug);
      const theme = oneOf<ThemeId>(body.theme, THEME_IDS);
      if (!theme) throw new HttpError(400, "Tema tidak dikenal.");
      if (busySlug === slug) throw new HttpError(409, "Deck ini sedang diproses; ganti tema setelah selesai.");
      await setDeckTheme(slug, theme);
      return sendJson(res, 200, { ok: true });
    }
    case "cancel":
      return sendJson(res, 200, { cancelled: jobs.cancel() });
    default:
      throw new HttpError(404, "Tidak ada.");
  }
}

export function agentPlugin(): Plugin {
  return {
    name: "agent-grafik-api",
    apply: "serve",
    configureServer(server) {
      const jobs = createJobs(server.config.logger);
      server.middlewares.use((req, res, next) => {
        if (!req.url?.startsWith("/api/agent/")) return next();
        route(req, res, server, jobs).catch((error: Error) => {
          const status = error instanceof HttpError ? error.status : 500;
          if (status === 500) server.config.logger.error(`[agent] ${error.stack ?? error.message}`);
          if (!res.headersSent) sendJson(res, status, { error: error.message });
          else res.end();
        });
      });
    },
  };
}
