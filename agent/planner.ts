import { DECK_SCHEMA, normalizeDeck, type DeckSpec, type NormalizeOptions } from "../src/engine/spec.ts";
import type { ThemeId } from "../src/engine/spec.ts";
import { config } from "./config.ts";
import { throwIfAborted, type Emit } from "./events.ts";
import { chatJson } from "./ollama.ts";

export interface PlanOptions {
  brief: string;
  /** Reference material the deck must stay faithful to (pasted text). */
  sources?: string;
  slides?: number;
  lang?: "id" | "en";
  theme?: ThemeId;
  author?: string;
  slug?: string;
  model?: string;
  maxImages?: number;
}

const LANGUAGE = { id: "Indonesian (Bahasa Indonesia)", en: "English" } as const;

export function buildPrompt(options: Required<Pick<PlanOptions, "brief" | "slides" | "lang" | "maxImages">> & { sources?: string }) {
  const language = LANGUAGE[options.lang];
  const withSections = options.slides >= 10;
  const system = `You are a senior presentation designer. Turn the brief into a slide deck, returned as JSON that matches the schema.

LANGUAGE
- Every visible text and every speaker note is written in ${language}. Image prompts are ALWAYS in English.

STRUCTURE
- Exactly ${options.slides} slides. Slide 1 uses layout "cover"; the last slide uses layout "closing".
- ${withSections ? 'Use "section" dividers sparingly (at most 2).' : 'Do not use "section" slides.'}
- One idea per slide. Titles are complete takeaway sentences of at most 11 words, never topic labels:
  write "Regular cleaning keeps panels producing at full power", not "Maintenance Tips".
- Vary the layouts and never use the same layout three times in a row. Use at most ${options.maxImages} images in total.

LAYOUT CONTRACTS (respect the limits, text that is too long gets cut)
- cover: eyebrow (max 4 words), title (max 10 words), subtitle (max 18 words), image.
- section: title, subtitle.
- cards: 3-4 items {title max 3 words, text max 10 words, icon}. An optional image is allowed (then 3 items at most).
- steps: 3-5 items {title max 3 words, text max 8 words, icon}, in order.
- compare: exactly 2 columns {heading max 3 words, icon, points: 3-4 phrases of max 7 words}.
- stats: 2-4 items {value like "43%" or "3x", title max 4 words, text max 8 words, icon}.
- quote: quote.text (max 24 words) and quote.by.
- split: title, body (max 18 words), 0-3 items {title max 6 words, icon}, image.
- closing: title (max 9 words), subtitle (max 14 words), 2-3 items {title max 4 words, icon} as concrete next steps; optional image.

ICONS
- icon is a Lucide icon name in kebab-case such as "shield-check", "bar-chart-3" or "users". Choose the most literal metaphor and avoid repeating one icon on a slide.

IMAGES
- image.prompt describes ONE concrete object or scene in 15-35 words, in a style that suits abstract 3D or editorial illustration.
- Never ask for screens, monitors, dashboards, signs, posters, documents, charts, maps or user interfaces, and never ask for any text or numbers in the picture.
- image.alt is a short description in ${language}.

NOTES
- notes: 2-4 sentences of speaker notes that say what the slide itself cannot.

HONESTY
- Never invent statistics, quotes, names, dates or sources. Use the "stats" layout only with numbers that appear in the brief or sources, and the "quote" layout only with words that appear there.
- Do not write any number, percentage, price, duration or year that is not in the brief or sources; say it qualitatively instead.`;

  const user = [
    `BRIEF\n${options.brief.trim()}`,
    options.sources?.trim() ? `SOURCES (stay faithful to these)\n${options.sources.trim().slice(0, 9000)}` : "",
    `Return the JSON for the deck now.`,
  ]
    .filter(Boolean)
    .join("\n\n");

  return { system, user };
}

/** Pull the JSON object out of a model reply even if it wrapped it in a code fence. */
export function extractJson(text: string): unknown {
  const stripped = text.replace(/^\s*```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "");
  const start = stripped.indexOf("{");
  const end = stripped.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("Jawaban model bukan JSON.");
  return JSON.parse(stripped.slice(start, end + 1));
}

/** Drop numbers and quotes the sources do not support, so the deck cannot present invented facts. */
export function groundClaims(deck: DeckSpec, input: string): string[] {
  const warnings: string[] = [];
  const hasNumbers = /\d/.test(input);
  const hasQuotes = /["“”«»]/.test(input);
  const kept = deck.slides.filter((slide, index) => {
    if (slide.layout === "stats" && !hasNumbers) {
      warnings.push(`Slide ${index + 1} (stats) dibuang: tidak ada angka di brief/sumber.`);
      return false;
    }
    if (slide.layout === "quote" && !hasQuotes) {
      warnings.push(`Slide ${index + 1} (kutipan) dibuang: tidak ada kutipan di brief/sumber.`);
      return false;
    }
    return true;
  });
  if (kept.length !== deck.slides.length) {
    deck.slides = kept;
    deck.slides.forEach((slide, index) => {
      slide.id = `${String(index + 1).padStart(2, "0")}-${slide.layout}`;
    });
  }

  // Numbers that survive must appear in the brief or sources; the rest are flagged for a human check.
  const NUMBER = /\d+(?:[.,]\d+)*/g;
  const known = new Set(input.match(NUMBER) ?? []);
  deck.slides.forEach((slide, index) => {
    const texts = [
      slide.title,
      slide.subtitle,
      slide.body,
      slide.quote?.text,
      ...(slide.items ?? []).flatMap((item) => [item.title, item.text, item.value]),
      ...(slide.columns ?? []).flatMap((column) => [column.heading, ...column.points]),
    ];
    const unknown = new Set(texts.flatMap((text) => text?.match(NUMBER) ?? []).filter((number) => !known.has(number)));
    if (unknown.size) {
      const list = [...unknown].map((number) => `"${number}"`).join(", ");
      warnings.push(`Slide ${index + 1}: angka ${list} tidak ada di brief/sumber, periksa kebenarannya.`);
    }
  });
  return warnings;
}

export async function planDeck(
  options: PlanOptions,
  emit: Emit,
  signal?: AbortSignal,
): Promise<{ deck: DeckSpec; warnings: string[]; model: string }> {
  const slides = Math.min(Math.max(options.slides ?? 8, 3), 20);
  const lang = options.lang ?? "id";
  const model = options.model ?? config.plannerModel;
  const maxImages = options.maxImages ?? Math.max(3, Math.round(slides / 2));
  const normalize: NormalizeOptions = { slug: options.slug, lang, theme: options.theme, author: options.author, maxSlides: slides, maxImages };
  const prompt = buildPrompt({ brief: options.brief, sources: options.sources, slides, lang, maxImages });

  let user = prompt.user;
  let lastError: Error | undefined;
  for (let attempt = 1; attempt <= 2; attempt++) {
    throwIfAborted(signal);
    emit({ type: "log", message: `${model}: menyusun ${slides} slide${attempt > 1 ? " (percobaan ulang)" : ""}…` });
    try {
      const raw = await chatJson({
        model,
        system: prompt.system,
        user,
        schema: DECK_SCHEMA,
        signal,
        temperature: attempt === 1 ? 0.4 : 0.2,
        keepAlive: 0,
        onProgress: (characters) => {
          const total = slides * 650;
          emit({ type: "progress", stage: "plan", value: Math.min(characters, total - 1), total });
        },
      });
      const { deck, warnings } = normalizeDeck(extractJson(raw), normalize);
      if (deck.slides.length < Math.max(3, Math.floor(slides * 0.6))) {
        throw new Error(`Model hanya menghasilkan ${deck.slides.length} slide dari ${slides}.`);
      }
      warnings.push(...groundClaims(deck, `${options.brief}\n${options.sources ?? ""}`));
      emit({ type: "progress", stage: "plan", value: 1, total: 1 });
      return { deck, warnings, model };
    } catch (error) {
      if ((error as Error).name === "AbortError") throw error;
      lastError = error as Error;
      emit({ type: "log", message: `Rencana belum valid: ${lastError.message}` });
      user = `${prompt.user}\n\nYour previous answer was rejected: ${lastError.message} Return a complete, valid JSON deck.`;
    }
  }
  throw new Error(`Gagal menyusun slide: ${lastError?.message ?? "tidak diketahui"}`);
}
