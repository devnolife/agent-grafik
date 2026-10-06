import { config } from "./config.ts";
import { AbortError } from "./events.ts";

const THINKING_MODELS = /qwen3|deepseek-r1|phi4-reasoning|gemma4/i;

async function request(path: string, body: unknown, signal?: AbortSignal): Promise<Response> {
  let response: Response;
  try {
    response = await fetch(`${config.ollamaUrl}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal,
    });
  } catch (error) {
    if (signal?.aborted) throw new AbortError();
    throw new Error(`Ollama tidak dapat dihubungi di ${config.ollamaUrl} (${(error as Error).message}).`);
  }
  if (!response.ok) {
    const detail = (await response.text().catch(() => "")).slice(0, 300);
    throw new Error(`Ollama ${path} → HTTP ${response.status}: ${detail}`);
  }
  return response;
}

export interface ChatJsonOptions {
  model: string;
  system: string;
  user: string;
  schema: object;
  signal?: AbortSignal;
  /** Called with the running character count while the model streams. */
  onProgress?: (characters: number) => void;
  temperature?: number;
  numCtx?: number;
  /** Seconds the model stays in VRAM after the call; 0 frees the GPU for image generation. */
  keepAlive?: number | string;
}

/** Stream a chat completion constrained to a JSON schema; returns the raw text. */
export async function chatJson(options: ChatJsonOptions): Promise<string> {
  const body: Record<string, unknown> = {
    model: options.model,
    stream: true,
    format: options.schema,
    messages: [
      { role: "system", content: options.system },
      { role: "user", content: options.user },
    ],
    options: { temperature: options.temperature ?? 0.4, num_ctx: options.numCtx ?? 16384 },
    keep_alive: options.keepAlive ?? "5m",
  };
  if (THINKING_MODELS.test(options.model)) body.think = false;

  const response = await request("/api/chat", body, options.signal);
  const reader = response.body?.getReader();
  if (!reader) throw new Error("Ollama tidak mengirim stream.");
  const decoder = new TextDecoder();
  let buffered = "";
  let text = "";

  for (; ;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffered += decoder.decode(value, { stream: true });
    let newline: number;
    while ((newline = buffered.indexOf("\n")) >= 0) {
      const line = buffered.slice(0, newline).trim();
      buffered = buffered.slice(newline + 1);
      if (!line) continue;
      const chunk = JSON.parse(line) as { message?: { content?: string }; error?: string };
      if (chunk.error) throw new Error(`Ollama: ${chunk.error}`);
      if (chunk.message?.content) {
        text += chunk.message.content;
        options.onProgress?.(text.length);
      }
    }
  }
  return text;
}

/** L2-normalised embeddings, one vector per input. */
export async function embed(inputs: string[], signal?: AbortSignal): Promise<Float32Array[]> {
  if (!inputs.length) return [];
  const response = await request("/api/embed", { model: config.embedModel, input: inputs, keep_alive: "10m" }, signal);
  const data = (await response.json()) as { embeddings?: number[][] };
  if (!data.embeddings || data.embeddings.length !== inputs.length) throw new Error("Ollama mengembalikan embedding yang tidak lengkap.");
  return data.embeddings.map((vector) => {
    const out = Float32Array.from(vector);
    let norm = 0;
    for (const value of out) norm += value * value;
    norm = Math.sqrt(norm) || 1;
    for (let i = 0; i < out.length; i++) out[i] /= norm;
    return out;
  });
}

export async function listModels(signal?: AbortSignal): Promise<{ name: string; sizeGb: number }[]> {
  const response = await fetch(`${config.ollamaUrl}/api/tags`, { signal: signal ?? AbortSignal.timeout(5000) });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data = (await response.json()) as { models?: { name: string; size: number }[] };
  return (data.models ?? []).map((model) => ({ name: model.name, sizeGb: Math.round((model.size / 1e9) * 10) / 10 }));
}

/** Free the VRAM a model holds (used before handing the GPUs to the image model). */
export async function unload(model: string): Promise<void> {
  await fetch(`${config.ollamaUrl}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, keep_alive: 0 }),
    signal: AbortSignal.timeout(15000),
  }).catch(() => undefined);
}

/** Ask a vision model about one or more PNG/JPEG files (base64). */
export async function askVision(
  model: string,
  prompt: string,
  images: string[],
  signal?: AbortSignal,
  keepAlive: number | string = 0,
): Promise<string> {
  const response = await request(
    "/api/chat",
    {
      model,
      stream: false,
      messages: [{ role: "user", content: prompt, images }],
      options: { temperature: 0, num_ctx: 8192 },
      keep_alive: keepAlive,
    },
    signal,
  );
  const data = (await response.json()) as { message?: { content?: string } };
  return data.message?.content?.trim() ?? "";
}
