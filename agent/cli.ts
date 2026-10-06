#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { THEME_IDS, type ImageShape, type ThemeId } from "../src/engine/spec.ts";
import { comfyHealth } from "./comfy.ts";
import { config, deckDir } from "./config.ts";
import { consoleEmit } from "./events.ts";
import { listModels } from "./ollama.ts";
import { exportDeck, generateDeck, makeIcons, makePictures, repaintPictures, restyleIcons, type IconMode, type Quality } from "./pipeline.ts";

const HELP = `Agent Grafik: presentasi, ikon dan gambar dengan AI lokal (Ollama + ComfyUI FLUX.2)

  npm run agent -- deck "<brief>" [opsi]        deck baru → src/decks/generated/<slug>/
      --slides 8   --lang id|en   --theme ${THEME_IDS.join("|")}   --author "Nama"
      --sources materi.md   --icons lucide|solid|outline   --no-images   --review
      --quality turbo|full   --model gemma3:27b   --slug nama [--overwrite]   --export
  npm run agent -- icons "roket, tim kerja, ide" [--style solid|outline]   → output/icons/
  npm run agent -- image "<deskripsi>" [--theme free|${THEME_IDS.join("|")}] [--shape wide|portrait|square] [--count 1-4]
  npm run agent -- repaint <slug> [slide-id] [--review]    lukis ulang gambar deck
  npm run agent -- restyle <slug> lucide|solid|outline      ganti gaya ikon deck
  npm run agent -- export <slug>                             PPTX + PDF + laporan QA
  npm run agent -- status                                    cek Ollama, ComfyUI dan GPU
`;

const { values: flags, positionals } = parseArgs({
  allowPositionals: true,
  allowNegative: true,
  options: {
    slides: { type: "string" },
    lang: { type: "string" },
    theme: { type: "string" },
    author: { type: "string" },
    sources: { type: "string" },
    icons: { type: "string" },
    images: { type: "boolean", default: true },
    review: { type: "boolean", default: false },
    quality: { type: "string" },
    model: { type: "string" },
    slug: { type: "string" },
    overwrite: { type: "boolean", default: false },
    export: { type: "boolean", default: false },
    style: { type: "string" },
    shape: { type: "string" },
    count: { type: "string" },
    help: { type: "boolean", short: "h", default: false },
  },
});

function pick<T extends string>(value: string | undefined, allowed: readonly T[], name: string): T | undefined {
  if (value === undefined) return undefined;
  if ((allowed as readonly string[]).includes(value)) return value as T;
  throw new Error(`--${name} harus salah satu dari: ${allowed.join(", ")}`);
}

const controller = new AbortController();
process.on("SIGINT", () => {
  if (controller.signal.aborted) process.exit(130);
  console.error("\nMembatalkan… (Ctrl+C lagi untuk keluar paksa)");
  controller.abort();
});

async function status() {
  const [models, comfy] = await Promise.all([listModels().catch((error: Error) => error), comfyHealth()]);
  if (models instanceof Error) console.log(`Ollama   ✖ ${config.ollamaUrl}: ${models.message}`);
  else {
    const names = new Set(models.map((model) => model.name.replace(/:latest$/, "")));
    const need = [config.plannerModel, config.reviewModel, config.embedModel];
    console.log(`Ollama   ✔ ${config.ollamaUrl}`);
    for (const model of need) console.log(`  ${names.has(model.replace(/:latest$/, "")) ? "✔" : "✖"} ${model}`);
  }
  console.log(`ComfyUI  ${comfy.ok ? "✔" : "✖"} ${config.comfyUrl}: ${comfy.message}`);
  for (const device of comfy.devices) console.log(`  ${device.name}: ${device.vramFreeGb} / ${device.vramTotalGb} GB VRAM bebas`);
}

async function main() {
  const [command, ...args] = positionals;
  const quality = pick<Quality>(flags.quality, ["turbo", "full"], "quality");
  const signal = controller.signal;

  switch (command) {
    case "deck": {
      const brief = args.join(" ").trim();
      if (!brief) throw new Error('Tulis brief, mis. npm run agent -- deck "Pengantar keamanan siber untuk UMKM"');
      const { slug } = await generateDeck(
        {
          brief,
          sources: flags.sources ? fs.readFileSync(flags.sources, "utf8") : undefined,
          slides: flags.slides ? Number(flags.slides) : undefined,
          lang: pick(flags.lang, ["id", "en"] as const, "lang"),
          theme: pick<ThemeId>(flags.theme, THEME_IDS, "theme"),
          author: flags.author,
          slug: flags.slug,
          overwrite: flags.overwrite,
          model: flags.model,
          icons: pick<IconMode>(flags.icons, ["lucide", "solid", "outline"], "icons"),
          images: flags.images,
          review: flags.review,
          quality,
        },
        consoleEmit,
        signal,
      );
      console.log(`\nDeck: ${path.join(deckDir(slug), "deck.json")}`);
      console.log(`Studio: npm run dev → http://localhost:5173/?deck=${slug}`);
      if (flags.export) await exportDeck(slug, consoleEmit, signal);
      return;
    }
    case "icons": {
      const concepts = args.join(" ").split(/[,\n;]/);
      await makeIcons(concepts, { style: pick(flags.style, ["solid", "outline"] as const, "style"), quality }, consoleEmit, signal);
      return;
    }
    case "image": {
      const style = pick<ThemeId | "free">(flags.theme, ["free", ...THEME_IDS], "theme");
      const shape = pick<ImageShape>(flags.shape, ["wide", "portrait", "square"], "shape");
      await makePictures(args.join(" "), { style, shape, count: flags.count ? Number(flags.count) : 1, quality }, consoleEmit, signal);
      return;
    }
    case "repaint": {
      const [slug, slideId] = args;
      if (!slug) throw new Error("Sebutkan slug deck.");
      await repaintPictures(slug, { slideId, review: flags.review, quality }, consoleEmit, signal);
      return;
    }
    case "restyle": {
      const [slug, mode] = args;
      if (!slug) throw new Error("Sebutkan slug deck.");
      const icons = pick<IconMode>(mode, ["lucide", "solid", "outline"], "icons") ?? "solid";
      await restyleIcons(slug, icons, consoleEmit, signal, quality);
      return;
    }
    case "export": {
      if (!args[0]) throw new Error("Sebutkan slug deck.");
      await exportDeck(args[0], consoleEmit, signal);
      return;
    }
    case "status":
      await status();
      return;
    default:
      console.log(HELP);
      if (command && !flags.help) process.exitCode = 1;
  }
}

main().catch((error: Error) => {
  consoleEmit({ type: "error", message: error.message });
  process.exit(error.name === "AbortError" ? 130 : 1);
});
