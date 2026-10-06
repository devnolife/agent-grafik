import path from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** Endpoints and models. Everything is overridable through the environment; nothing comes from a request. */
export const config = {
  ollamaUrl: (process.env.OLLAMA_URL ?? "http://127.0.0.1:11434").replace(/\/+$/, ""),
  comfyUrl: (process.env.COMFYUI_URL ?? "http://127.0.0.1:8188").replace(/\/+$/, ""),
  plannerModel: process.env.AGENT_PLANNER_MODEL ?? "gemma4:latest",
  embedModel: process.env.AGENT_EMBED_MODEL ?? "bge-m3",
  reviewModel: process.env.AGENT_REVIEW_MODEL ?? "qwen2.5vl",
  /** FLUX.2 [dev] files as installed in ComfyUI. */
  flux: {
    unet: process.env.AGENT_FLUX_UNET ?? "flux2_dev_fp8mixed.safetensors",
    textEncoder: process.env.AGENT_FLUX_TEXT_ENCODER ?? "mistral_3_small_flux2_fp8.safetensors",
    vae: process.env.AGENT_FLUX_VAE ?? "flux2-vae.safetensors",
    turboLora: process.env.AGENT_FLUX_TURBO_LORA ?? "Flux2TurboComfyv2.safetensors",
  },
  decksDir: path.join(ROOT, "src", "decks", "generated"),
  outputDir: path.join(ROOT, "output"),
};

export const deckDir = (slug: string) => path.join(config.decksDir, slug);
export const assetsDir = (slug: string) => path.join(config.decksDir, slug, "assets");
