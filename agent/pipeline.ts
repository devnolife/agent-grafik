import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { IMAGE_SIZES, isValidSlug, slugify, type DeckSpec, type ImageShape, type SlideSpec, type ThemeId } from "../src/engine/spec.ts";
import { getTheme, iconPrompt, imagePrompt, THEMES, type IconStyle } from "../src/engine/themes.ts";
import { comfyHealth, FLUX_FULL, FLUX_TURBO, randomSeed, renderFlux, seedFrom, type ComfyStatus, type FluxSettings } from "./comfy.ts";
import { ROOT, assetsDir, config } from "./config.ts";
import { AbortError, throwIfAborted, type Emit, type ResultFile } from "./events.ts";
import { deckSaver, iconSubject, readDeck, removeAsset, saveJpeg, traceIcon, uniqueSlug, writeDeck } from "./media.ts";
import { askVision, unload } from "./ollama.ts";
import { planDeck, type PlanOptions } from "./planner.ts";

/** "lucide" keeps the built-in line icons; "solid" / "outline" draws every icon with FLUX.2 and traces it to SVG. */
export type IconMode = "lucide" | IconStyle;
export type Quality = "turbo" | "full";

export interface DeckJobOptions extends PlanOptions {
  icons?: IconMode;
  images?: boolean;
  /** Ask the vision model to reject pictures that contain text or UI (one repaint each). */
  review?: boolean;
  quality?: Quality;
  /** Replace an existing generated deck with the same slug instead of picking a new slug. */
  overwrite?: boolean;
}

type Saver = ReturnType<typeof deckSaver>;

const settingsFor = (quality: Quality | undefined): FluxSettings => (quality === "full" ? FLUX_FULL : FLUX_TURBO);
const ICON_SIZE = 640;

function queueLog(emit: Emit) {
  return (status: ComfyStatus) => {
    if (status.state === "queued" && status.ahead > 0) emit({ type: "log", message: `Menunggu GPU: ${status.ahead} antrean di depan.` });
  };
}

/* ------------------------------------------------------------------------------------------ */
/* Icons                                                                                       */
/* ------------------------------------------------------------------------------------------ */

const DEFAULT_ICON: Record<string, string> = { stats: "trending-up", closing: "arrow-right" };

/** Every icon the layouts will show, grouped by Lucide name (missing names get the layout's default). */
function iconGroups(deck: DeckSpec) {
  const groups = new Map<string, { iconSrc?: string }[]>();
  const add = (name: string, target: { iconSrc?: string }) => groups.set(name, [...(groups.get(name) ?? []), target]);
  for (const slide of deck.slides) {
    for (const item of slide.items ?? []) {
      item.icon ||= DEFAULT_ICON[slide.layout] ?? "sparkles";
      add(item.icon, item);
    }
    slide.columns?.forEach((column, index) => {
      column.icon ||= index === 1 ? "circle-check-big" : "circle-dashed";
      add(column.icon, column);
    });
  }
  return [...groups].map(([name, targets]) => ({ name, targets }));
}

async function paintIcons(deck: DeckSpec, style: IconStyle, settings: FluxSettings, emit: Emit, save: Saver, signal?: AbortSignal) {
  const groups = iconGroups(deck);
  if (!groups.length) return;
  emit({ type: "stage", stage: "icons", message: `Menggambar ${groups.length} ikon ${style === "outline" ? "garis" : "solid"} (FLUX.2 → SVG)` });
  emit({ type: "progress", stage: "icons", value: 0, total: groups.length });
  const dir = assetsDir(deck.slug);
  let done = 0;
  await renderFlux(
    groups.map(({ name }) => ({
      prompt: iconPrompt(iconSubject(name), style),
      width: ICON_SIZE,
      height: ICON_SIZE,
      seed: seedFrom(`${style}:${name}`),
      batch: 2,
    })),
    {
      settings,
      signal,
      chunkSize: 6,
      onStatus: queueLog(emit),
      onResult: async (index, images) => {
        const { name, targets } = groups[index];
        const file = `icon-${style}-${name}.svg`;
        const verdict = await traceIcon(images, path.join(dir, file), signal);
        if (verdict.ok) for (const target of targets) target.iconSrc = file;
        else emit({ type: "log", message: `Ikon "${name}" tetap Lucide (${verdict.reason}).` });
        emit({ type: "progress", stage: "icons", value: ++done, total: groups.length });
        save.request();
      },
    },
  );
}

/* ------------------------------------------------------------------------------------------ */
/* Pictures                                                                                    */
/* ------------------------------------------------------------------------------------------ */

const REVIEW_PROMPT =
  "Look at this picture carefully. Does it show any readable letters, words, numbers, logos, watermarks, " +
  "or computer screens with a user interface? Answer with exactly one word: YES or NO.";

/** Returns the slides whose picture the vision model flagged. Skips quietly if the model is unavailable. */
async function reviewPictures(deck: DeckSpec, slides: SlideSpec[], emit: Emit, signal?: AbortSignal): Promise<SlideSpec[]> {
  emit({ type: "stage", stage: "review", message: `Memeriksa gambar dengan ${config.reviewModel}` });
  const flagged: SlideSpec[] = [];
  try {
    for (const [index, slide] of slides.entries()) {
      const file = path.join(assetsDir(deck.slug), slide.image?.src ?? "");
      const picture = (await fs.readFile(file)).toString("base64");
      const answer = await askVision(config.reviewModel, REVIEW_PROMPT, [picture], signal, "2m");
      if (/^\W*yes\b/i.test(answer)) {
        flagged.push(slide);
        emit({ type: "log", message: `Slide ${slide.id}: ada teks/UI di gambar, dilukis ulang.` });
      }
      emit({ type: "progress", stage: "review", value: index + 1, total: slides.length });
    }
  } catch (error) {
    if (signal?.aborted) throw error;
    emit({ type: "log", message: `Pemeriksaan gambar dilewati: ${(error as Error).message}` });
  } finally {
    await unload(config.reviewModel);
  }
  return flagged;
}

async function paintPictures(
  deck: DeckSpec,
  slides: SlideSpec[],
  options: { settings: FluxSettings; fresh: boolean; review: boolean },
  emit: Emit,
  save: Saver,
  signal?: AbortSignal,
) {
  if (!slides.length) return;
  const theme = getTheme(deck.theme);
  const dir = assetsDir(deck.slug);
  const stale: string[] = [];

  const paint = async (targets: SlideSpec[], fresh: boolean) => {
    let done = 0;
    emit({ type: "progress", stage: "images", value: 0, total: targets.length });
    const seeds = targets.map((slide) => (fresh ? randomSeed() : seedFrom(`${deck.slug}:${slide.id}:${slide.image?.prompt}`)));
    await renderFlux(
      targets.map((slide, index) => ({
        prompt: imagePrompt(slide.image?.prompt ?? slide.title, theme),
        ...IMAGE_SIZES.portrait,
        seed: seeds[index],
      })),
      {
        settings: options.settings,
        signal,
        chunkSize: Math.max(2, Math.ceil(targets.length / 4)),
        onStatus: queueLog(emit),
        onResult: async (index, [png]) => {
          const slide = targets[index];
          if (!slide.image) return;
          const file = `${slide.id}-${seeds[index].toString(36)}.jpg`;
          await saveJpeg(png, path.join(dir, file), signal);
          if (slide.image.src && slide.image.src !== file) stale.push(slide.image.src);
          slide.image.src = file;
          emit({ type: "progress", stage: "images", value: ++done, total: targets.length });
          save.request();
        },
      },
    );
  };

  emit({ type: "stage", stage: "images", message: `Melukis ${slides.length} gambar (FLUX.2 [dev], tema ${theme.name})` });
  await paint(slides, options.fresh);
  if (options.review) {
    const flagged = await reviewPictures(deck, slides, emit, signal);
    if (flagged.length) {
      emit({ type: "stage", stage: "images", message: `Melukis ulang ${flagged.length} gambar` });
      await paint(flagged, true);
    }
  }
  await save.flush();
  await Promise.all(stale.map((file) => removeAsset(dir, file)));
}

/* ------------------------------------------------------------------------------------------ */
/* Jobs                                                                                        */
/* ------------------------------------------------------------------------------------------ */

async function withSaver<T>(deck: DeckSpec, emit: Emit, work: (save: Saver) => Promise<T>): Promise<T> {
  const save = deckSaver(deck, emit);
  try {
    const result = await work(save);
    await save.flush();
    return result;
  } catch (error) {
    await save.flush().catch(() => undefined);
    throw error;
  }
}

/** Brief → plan (Ollama) → deck.json → AI icons → AI pictures. The studio shows each step as it lands. */
export async function generateDeck(options: DeckJobOptions, emit: Emit, signal?: AbortSignal): Promise<{ slug: string; warnings: string[] }> {
  let icons = options.icons ?? "lucide";
  let images = options.images ?? true;
  if (icons !== "lucide" || images) {
    const health = await comfyHealth();
    if (!health.ok || !health.models) {
      emit({ type: "log", message: `ComfyUI tidak siap (${health.message}); slide dibuat tanpa ikon/gambar AI.` });
      icons = "lucide";
      images = false;
    }
  }

  const requested = options.slug && isValidSlug(options.slug) ? options.slug : undefined;
  emit({ type: "stage", stage: "plan", message: `Menyusun alur dan isi slide (${options.model ?? config.plannerModel})` });
  const { deck, warnings, model } = await planDeck({ ...options, slug: requested }, emit, signal);
  if (requested && options.overwrite) await fs.rm(assetsDir(requested), { recursive: true, force: true });
  else deck.slug = await uniqueSlug(deck.slug);
  deck.meta = {
    brief: options.brief.trim().slice(0, 600),
    model,
    imageModel: images ? `FLUX.2 [dev]${options.quality === "full" ? "" : " Turbo"}` : undefined,
    generatedAt: new Date().toISOString(),
    warnings: warnings.length ? warnings : undefined,
  };
  await writeDeck(deck);
  emit({ type: "deck", slug: deck.slug });
  for (const warning of warnings) emit({ type: "log", message: `Catatan: ${warning}` });

  const settings = settingsFor(options.quality);
  await withSaver(deck, emit, async (save) => {
    if (icons !== "lucide") await paintIcons(deck, icons, settings, emit, save, signal);
    if (images) {
      const slides = deck.slides.filter((slide) => slide.image);
      await paintPictures(deck, slides, { settings, fresh: false, review: options.review ?? false }, emit, save, signal);
    }
  });

  emit({ type: "done", slug: deck.slug, message: `"${deck.title}" siap: ${deck.slides.length} slide.` });
  return { slug: deck.slug, warnings };
}

/** Repaint one slide's picture (or every picture of the deck) with new seeds, e.g. after a theme change. */
export async function repaintPictures(
  slug: string,
  options: { slideId?: string; review?: boolean; quality?: Quality },
  emit: Emit,
  signal?: AbortSignal,
) {
  const deck = await readDeck(slug);
  const slides = deck.slides.filter((slide) => slide.image && (!options.slideId || slide.id === options.slideId));
  if (!slides.length) throw new Error(options.slideId ? `Slide ${options.slideId} tidak punya gambar.` : "Deck ini tidak punya gambar.");
  await withSaver(deck, emit, (save) =>
    paintPictures(deck, slides, { settings: settingsFor(options.quality), fresh: true, review: options.review ?? false }, emit, save, signal),
  );
  emit({ type: "done", slug, message: slides.length === 1 ? "Gambar baru siap." : `${slides.length} gambar baru siap.` });
}

/** Switch a deck's icon style; "lucide" drops the generated SVGs from the spec. */
export async function restyleIcons(slug: string, mode: IconMode, emit: Emit, signal?: AbortSignal, quality?: Quality) {
  const deck = await readDeck(slug);
  if (mode === "lucide") {
    for (const slide of deck.slides) {
      for (const target of [...(slide.items ?? []), ...(slide.columns ?? [])]) delete target.iconSrc;
    }
    await writeDeck(deck);
    emit({ type: "deck", slug });
  } else {
    await withSaver(deck, emit, (save) => paintIcons(deck, mode, settingsFor(quality), emit, save, signal));
  }
  emit({ type: "done", slug, message: mode === "lucide" ? "Ikon kembali ke Lucide." : "Ikon baru siap." });
}

export async function setDeckTheme(slug: string, theme: ThemeId): Promise<void> {
  if (!THEMES[theme]) throw new Error(`Tema tidak dikenal: ${theme}`);
  const deck = await readDeck(slug);
  deck.theme = theme;
  await writeDeck(deck);
}

const fileUrl = (...parts: string[]) => `/api/agent/files/${parts.map(encodeURIComponent).join("/")}`;

/** A standalone icon set in output/icons/<set>/, one SVG per concept. */
export async function makeIcons(
  concepts: string[],
  options: { style?: IconStyle; quality?: Quality },
  emit: Emit,
  signal?: AbortSignal,
): Promise<ResultFile[]> {
  const style = options.style ?? "solid";
  const list = [...new Set(concepts.map((concept) => concept.trim()).filter(Boolean))].slice(0, 24);
  if (!list.length) throw new Error("Tulis minimal satu konsep ikon.");
  const set = `${new Date().toISOString().slice(0, 10)}-${slugify(list[0], "ikon").slice(0, 28)}-${randomSeed().toString(36).slice(0, 4)}`;
  const dir = path.join(config.outputDir, "icons", set);
  const names = new Set<string>();
  const files: ResultFile[] = [];
  let done = 0;

  emit({ type: "stage", stage: "icons", message: `Menggambar ${list.length} ikon ${style === "outline" ? "garis" : "solid"}` });
  emit({ type: "progress", stage: "icons", value: 0, total: list.length });
  await renderFlux(
    list.map((concept) => ({ prompt: iconPrompt(concept, style), width: ICON_SIZE, height: ICON_SIZE, seed: randomSeed(), batch: 2 })),
    {
      settings: settingsFor(options.quality),
      signal,
      chunkSize: 6,
      onStatus: queueLog(emit),
      onResult: async (index, images) => {
        let name = slugify(list[index], "ikon");
        for (let n = 2; names.has(name); n++) name = `${slugify(list[index], "ikon")}-${n}`;
        names.add(name);
        const verdict = await traceIcon(images, path.join(dir, `${name}.svg`), signal);
        if (verdict.ok) files.push({ name: `${name}.svg`, url: fileUrl("icons", set, `${name}.svg`), path: path.join(dir, `${name}.svg`) });
        else emit({ type: "log", message: `"${list[index]}" gagal dijadikan SVG (${verdict.reason}).` });
        emit({ type: "progress", stage: "icons", value: ++done, total: list.length });
      },
    },
  );
  emit({ type: "done", message: `${files.length} dari ${list.length} ikon siap di output/icons/${set}/.`, files });
  return files;
}

/** Standalone pictures in output/images/. `style` "free" sends the prompt as written; a theme adds its art direction. */
export async function makePictures(
  prompt: string,
  options: { style?: ThemeId | "free"; shape?: ImageShape; count?: number; quality?: Quality },
  emit: Emit,
  signal?: AbortSignal,
): Promise<ResultFile[]> {
  const subject = prompt.trim();
  if (!subject) throw new Error("Tulis deskripsi gambar.");
  const style = options.style ?? "free";
  const full = style === "free" ? subject : imagePrompt(subject, getTheme(style));
  const size = IMAGE_SIZES[options.shape ?? "wide"];
  const count = Math.min(Math.max(options.count ?? 1, 1), 4);
  const seed = randomSeed();
  const base = `${slugify(subject, "gambar").slice(0, 36)}-${seed.toString(36)}`;
  const dir = path.join(config.outputDir, "images");

  emit({ type: "stage", stage: "images", message: `Melukis ${count} gambar ${size.width}×${size.height}` });
  const [images] = await renderFlux([{ prompt: full, ...size, seed, batch: count }], {
    settings: settingsFor(options.quality),
    signal,
    onStatus: queueLog(emit),
  });
  const files: ResultFile[] = [];
  for (const [index, png] of images.entries()) {
    const name = `${base}${images.length > 1 ? `-${index + 1}` : ""}.jpg`;
    await saveJpeg(png, path.join(dir, name), signal);
    files.push({ name, url: fileUrl("images", name), path: path.join(dir, name) });
  }
  emit({ type: "done", message: `${files.length} gambar siap di output/images/.`, files });
  return files;
}

/** Full export (scripts/export.mjs): PPTX + PDF + QA report in output/<slug>/. */
export async function exportDeck(slug: string, emit: Emit, signal?: AbortSignal): Promise<ResultFile[]> {
  if (!isValidSlug(slug)) throw new Error(`Slug tidak valid: ${slug}`);
  throwIfAborted(signal);
  emit({ type: "stage", stage: "export", message: "Ekspor PPTX + PDF + QA" });

  const code = await new Promise<number>((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(ROOT, "scripts", "export.mjs"), slug], {
      cwd: ROOT,
      stdio: ["ignore", "pipe", "pipe"],
      signal,
    });
    let total = 0;
    let captured = 0;
    let buffered = "";
    const onLine = (line: string) => {
      const deckLine = line.match(/^\[deck\] .*?: (\d+) slide/);
      if (deckLine) total = Number(deckLine[1]);
      if (line.startsWith("[capture]") && total) emit({ type: "progress", stage: "export", value: ++captured, total });
      if (/^\[(build|deck|pptx|pdf|render|qa|done)\]/.test(line) || /error|gagal/i.test(line)) emit({ type: "log", message: line });
    };
    const read = (chunk: Buffer) => {
      buffered += chunk.toString();
      const lines = buffered.split("\n");
      buffered = lines.pop() ?? "";
      lines.map((line) => line.trim()).filter(Boolean).forEach(onLine);
    };
    child.stdout.on("data", read);
    child.stderr.on("data", read);
    child.on("error", (error) => reject(error.name === "AbortError" ? new AbortError() : error));
    child.on("close", (status) => resolve(status ?? 1));
  });

  const outDir = path.join(config.outputDir, slug);
  const names = [`${slug}.pptx`, `${slug}.pdf`, "qa-report.md"];
  const files: ResultFile[] = [];
  for (const name of names) {
    const exists = await fs.access(path.join(outDir, name)).then(() => true, () => false);
    if (exists) files.push({ name, url: fileUrl("export", slug, name), path: path.join(outDir, name) });
  }
  if (!files.some((file) => file.name.endsWith(".pptx"))) throw new Error(`Ekspor gagal (kode ${code}). Lihat log di atas.`);

  const report = await fs.readFile(path.join(outDir, "qa-report.md"), "utf8").catch(() => "");
  const qa = report.match(/Blocker (\d+) · Major (\d+) · Minor (\d+)/);
  const summary = qa ? ` QA: ${qa[1]} blocker, ${qa[2]} major, ${qa[3]} minor.` : "";
  emit({ type: "done", slug, message: `Ekspor selesai.${summary}`, files });
  return files;
}
