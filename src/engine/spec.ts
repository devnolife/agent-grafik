/**
 * Deck spec: the JSON an agent (or a human) writes, plus a lenient normalizer.
 *
 * Shared by the browser (renderer) and Node (agent), so it must stay erasable TypeScript
 * (no enums, no path aliases, relative imports with `.ts`) and free of DOM/React imports.
 */

export const LAYOUTS = ["cover", "section", "cards", "steps", "compare", "stats", "quote", "split", "closing"] as const;
export type LayoutId = (typeof LAYOUTS)[number];

export const THEME_IDS = ["aurora", "paper", "forest", "sunset"] as const;
export type ThemeId = (typeof THEME_IDS)[number];

export type ImageShape = "portrait" | "wide" | "square";

/** Pixel size handed to the image model for each shape (multiples of 16). */
export const IMAGE_SIZES: Record<ImageShape, { width: number; height: number }> = {
  portrait: { width: 896, height: 1008 },
  wide: { width: 1536, height: 864 },
  square: { width: 1024, height: 1024 },
};

/** Layouts that can carry a picture. `required` ones always get one. */
export const LAYOUT_IMAGE: Partial<Record<LayoutId, { required: boolean }>> = {
  cover: { required: true },
  split: { required: true },
  closing: { required: false },
  cards: { required: false },
};

export type Archetype = "cover" | "konsep" | "proses" | "perbandingan" | "data" | "kutipan" | "penutup";

const ARCHETYPES: Record<LayoutId, Archetype> = {
  cover: "cover",
  section: "cover",
  cards: "konsep",
  steps: "proses",
  compare: "perbandingan",
  stats: "data",
  quote: "kutipan",
  split: "konsep",
  closing: "penutup",
};

export const archetypeOf = (layout: LayoutId): Archetype => ARCHETYPES[layout];

export interface ImageSpec {
  /** English description of the picture, without style words (the theme adds those). */
  prompt: string;
  alt: string;
  /** File name inside the deck's assets folder; set once the picture exists. */
  src?: string;
}

export interface ItemSpec {
  title: string;
  text?: string;
  /** Big number for the `stats` layout. */
  value?: string;
  /** Lucide icon name in kebab-case. */
  icon?: string;
  /** Generated SVG icon file inside the deck's assets folder. */
  iconSrc?: string;
}

export interface ColumnSpec {
  heading: string;
  icon?: string;
  iconSrc?: string;
  points: string[];
}

export interface SlideSpec {
  id: string;
  layout: LayoutId;
  title: string;
  eyebrow?: string;
  subtitle?: string;
  body?: string;
  items?: ItemSpec[];
  columns?: ColumnSpec[];
  quote?: { text: string; by?: string };
  image?: ImageSpec;
  notes?: string;
}

export interface DeckSpec {
  slug: string;
  title: string;
  subtitle?: string;
  author?: string;
  lang: string;
  theme: ThemeId;
  slides: SlideSpec[];
  meta?: {
    brief?: string;
    model?: string;
    imageModel?: string;
    generatedAt?: string;
    /** Things the agent could not verify (e.g. numbers missing from the sources). */
    warnings?: string[];
  };
}

/* ------------------------------------------------------------------------------------------ */
/* Text helpers                                                                                */
/* ------------------------------------------------------------------------------------------ */

type Obj = Record<string, unknown>;
const isObj = (value: unknown): value is Obj => typeof value === "object" && value !== null && !Array.isArray(value);
const list = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

export function clean(value: unknown): string {
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value !== "string") return "";
  return value
    .replace(/\*\*|__|`/g, "")
    .replace(/^\s*(?:[-•–*]|\d+[.)])\s+/, "")
    .replace(/\s+/g, " ")
    .trim();
}

const TAIL_STOP = new Set([
  "dan", "yang", "untuk", "dengan", "atau", "di", "ke", "dari", "pada", "serta", "dalam", "agar",
  "and", "or", "the", "a", "an", "of", "to", "for", "with", "in", "on", "that",
]);

/** Cut to at most `max` words without leaving a dangling conjunction. */
export function clipWords(input: string, max: number): string {
  const parts = input.split(" ").filter(Boolean);
  if (parts.length <= max) return parts.join(" ");
  const kept = parts.slice(0, max);
  while (kept.length > 1 && TAIL_STOP.has(kept[kept.length - 1].toLowerCase().replace(/[.,;:]+$/, ""))) kept.pop();
  return kept.join(" ").replace(/[,;:\-–—]+$/, "");
}

const words = (value: unknown, max: number) => clipWords(clean(value), max);
export const countWords = (value: string) => value.split(/\s+/).filter(Boolean).length;

export function slugify(input: string, fallback = "deck"): string {
  const slug = input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48)
    .replace(/-+$/, "");
  return slug || fallback;
}

export const isValidSlug = (slug: unknown): slug is string => typeof slug === "string" && /^[a-z0-9][a-z0-9-]{0,63}$/.test(slug);

/** `ShieldCheck` / `shield_check` / `Shield Check` → `shield-check`. */
export function toIconName(value: unknown): string {
  const raw = clean(value).replace(/^lucide[-:\s]*/i, "");
  if (!raw) return "";
  return raw
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Lucide's component key for a kebab-case icon name (`arrow-up-0-1` → `ArrowUp01`). */
export const iconKey = (name: string) =>
  name
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");

/** Inverse of `iconKey` for Lucide's exported component names (every capital or digit run starts a word). */
export const iconNameFromKey = (key: string) =>
  key
    .replace(/([A-Z])/g, "-$1")
    .replace(/(\d+)/g, "-$1")
    .replace(/--+/g, "-")
    .replace(/^-/, "")
    .toLowerCase();

/* ------------------------------------------------------------------------------------------ */
/* Normalizer                                                                                  */
/* ------------------------------------------------------------------------------------------ */

const LAYOUT_ALIASES: Record<string, LayoutId> = {
  title: "cover", intro: "cover", hero: "cover", opening: "cover",
  divider: "section", chapter: "section", agenda: "cards", list: "cards", bullets: "cards", features: "cards",
  concepts: "cards", grid: "cards", pillars: "cards",
  process: "steps", timeline: "steps", flow: "steps", roadmap: "steps", workflow: "steps",
  comparison: "compare", versus: "compare", vs: "compare", "pros-cons": "compare",
  data: "stats", metrics: "stats", kpi: "stats", numbers: "stats", statistics: "stats",
  testimonial: "quote", citation: "quote",
  image: "split", content: "split", text: "split", detail: "split", explain: "split",
  conclusion: "closing", end: "closing", thanks: "closing", cta: "closing", summary: "closing",
};

function pickLayout(raw: Obj): LayoutId {
  const named = clean(raw.layout ?? raw.type ?? raw.kind).toLowerCase();
  if ((LAYOUTS as readonly string[]).includes(named)) return named as LayoutId;
  if (LAYOUT_ALIASES[named]) return LAYOUT_ALIASES[named];
  if (isObj(raw.quote) || typeof raw.quote === "string") return "quote";
  if (list(raw.columns).length >= 2) return "compare";
  const items = list(raw.items);
  if (items.some((item) => isObj(item) && clean(item.value))) return "stats";
  if (items.length >= 3) return "cards";
  return "split";
}

interface Ctx {
  warnings: string[];
}

/** A bare file name inside the deck's assets folder (no paths, so a spec cannot point elsewhere). */
function assetName(value: unknown): string {
  return typeof value === "string" && /^[\w-][\w.-]{0,80}$/.test(value) && !value.includes("..") ? value : "";
}

function normItems(value: unknown, max: number, titleWords: number, textWords: number): ItemSpec[] {
  const out: ItemSpec[] = [];
  for (const entry of list(value).slice(0, max)) {
    const o: Obj = isObj(entry) ? entry : { title: entry };
    const item: ItemSpec = { title: words(o.title ?? o.name ?? o.heading ?? o.label, titleWords) };
    const text = words(o.text ?? o.description ?? o.body ?? o.caption ?? o.detail, textWords);
    if (text) item.text = text;
    const metric = clean(o.value ?? o.number ?? o.metric ?? o.stat).slice(0, 10);
    if (metric) item.value = metric;
    const icon = toIconName(o.icon);
    if (icon) item.icon = icon;
    const iconSrc = assetName(o.iconSrc);
    if (iconSrc) item.iconSrc = iconSrc;
    if (item.title || item.text) out.push(item);
  }
  return out;
}

function normColumns(raw: Obj): ColumnSpec[] {
  let source = list(raw.columns);
  if (source.length < 2) {
    const items = list(raw.items);
    if (items.length === 2) source = items;
  }
  const out: ColumnSpec[] = [];
  for (const entry of source.slice(0, 2)) {
    const o: Obj = isObj(entry) ? entry : {};
    const points = list(o.points ?? o.bullets ?? o.items)
      .map((point) => words(isObj(point) ? (point.text ?? point.title) : point, 7))
      .filter(Boolean)
      .slice(0, 4);
    if (!points.length && clean(o.text)) points.push(words(o.text, 7));
    const column: ColumnSpec = { heading: words(o.heading ?? o.title ?? o.name, 3), points };
    const icon = toIconName(o.icon);
    if (icon) column.icon = icon;
    const iconSrc = assetName(o.iconSrc);
    if (iconSrc) column.iconSrc = iconSrc;
    if (column.heading && points.length) out.push(column);
  }
  return out;
}

function normImage(raw: Obj, fallbackPrompt: string, required: boolean): ImageSpec | undefined {
  const source = isObj(raw.image) ? raw.image : typeof raw.image === "string" ? { prompt: raw.image } : {};
  const prompt = clean(source.prompt ?? source.description ?? raw.imagePrompt).slice(0, 420);
  const alt = clean(source.alt ?? source.caption).slice(0, 140);
  const wanted = Boolean(prompt) || required;
  if (!wanted) return undefined;
  const image: ImageSpec = {
    prompt: prompt || `Abstract editorial illustration symbolising: ${fallbackPrompt}`,
    alt: alt || fallbackPrompt,
  };
  const src = assetName(source.src);
  if (src) image.src = src;
  return image;
}

function normalizeSlide(entry: unknown, index: number, ctx: Ctx): SlideSpec | null {
  if (!isObj(entry)) return null;
  const raw = entry;
  let layout = pickLayout(raw);
  const eyebrow = words(raw.eyebrow ?? raw.kicker ?? raw.section, 5);
  const notes = clean(raw.notes ?? raw.speakerNotes ?? raw.speaker_notes).slice(0, 900);
  const base = { eyebrow: eyebrow || undefined, notes: notes || undefined };
  const title = (cap: number) => words(raw.title ?? raw.heading ?? raw.headline, cap);

  const slide: SlideSpec = { id: "", layout, title: "" };
  Object.assign(slide, base);

  switch (layout) {
    case "cover": {
      slide.title = title(12);
      slide.subtitle = words(raw.subtitle ?? raw.tagline ?? raw.body, 20) || undefined;
      break;
    }
    case "section": {
      slide.title = title(10);
      slide.subtitle = words(raw.subtitle ?? raw.body, 16) || undefined;
      break;
    }
    case "cards": {
      slide.title = title(11);
      const count = Math.min(4, list(raw.items).length);
      const textCap = count >= 4 ? 9 : count === 3 ? 12 : 14;
      slide.items = normItems(raw.items, 4, 3, textCap);
      if (slide.items.length < 2) layout = "split";
      break;
    }
    case "steps": {
      slide.title = title(11);
      const count = Math.min(5, list(raw.items).length);
      const textCap = count >= 5 ? 7 : count === 4 ? 10 : 14;
      slide.items = normItems(raw.items, 5, 3, textCap);
      if (slide.items.length < 3) layout = slide.items.length === 2 ? "cards" : "split";
      break;
    }
    case "compare": {
      slide.title = title(11);
      slide.columns = normColumns(raw);
      if (slide.columns.length < 2) layout = "cards";
      break;
    }
    case "stats": {
      slide.title = title(11);
      const count = Math.min(4, list(raw.items).length);
      const items = normItems(raw.items, 4, 5, count >= 4 ? 6 : 9).filter((item) => item.value);
      slide.items = items;
      if (items.length < 2) layout = "cards";
      break;
    }
    case "quote": {
      const q: Obj = isObj(raw.quote) ? raw.quote : { text: raw.quote ?? raw.body ?? raw.title };
      const text = words(q.text ?? q.quote, 26);
      slide.title = text;
      slide.quote = { text, by: words(q.by ?? q.author ?? q.source ?? raw.subtitle, 6) || undefined };
      if (!text) return null;
      break;
    }
    case "split": {
      slide.title = title(11);
      slide.body = words(raw.body ?? raw.text ?? raw.subtitle, 20) || undefined;
      slide.items = normItems(raw.items, 3, 6, 0);
      break;
    }
    case "closing": {
      slide.title = title(10);
      slide.subtitle = words(raw.subtitle ?? raw.body, 16) || undefined;
      slide.items = normItems(raw.items, 3, 4, 0);
      break;
    }
  }

  // Downgraded layouts are rebuilt from whatever content survived.
  if (layout !== slide.layout) {
    ctx.warnings.push(`Slide ${index + 1}: layout "${slide.layout}" → "${layout}" (content tidak cukup).`);
    slide.layout = layout;
    if (layout === "split") {
      slide.body = slide.body || words(raw.body ?? raw.text ?? raw.subtitle, 20) || undefined;
      slide.items = normItems(raw.items, 3, 6, 0);
    }
    if (layout === "cards" && !slide.items?.length) slide.items = normItems(raw.items, 4, 3, 12);
    if (layout === "cards" && (slide.items?.length ?? 0) < 2) slide.layout = "split";
  }

  if (!slide.title) return null;
  if (slide.items && !slide.items.length) delete slide.items;

  const imageRule = LAYOUT_IMAGE[slide.layout];
  if (imageRule) {
    const image = normImage(raw, slide.title, imageRule.required);
    if (image) slide.image = image;
  }
  // The side-by-side variant only has room for three rows.
  if (slide.layout === "cards" && slide.image && slide.items && slide.items.length > 3) slide.items = slide.items.slice(0, 3);
  return slide;
}

export interface NormalizeOptions {
  slug?: string;
  lang?: string;
  theme?: ThemeId;
  author?: string;
  maxSlides?: number;
  maxImages?: number;
}

export function normalizeDeck(raw: unknown, options: NormalizeOptions = {}): { deck: DeckSpec; warnings: string[] } {
  if (!isObj(raw)) throw new Error("Spec deck harus berupa objek JSON.");
  const ctx: Ctx = { warnings: [] };
  const maxSlides = Math.min(Math.max(options.maxSlides ?? 20, 1), 40);

  let slides = list(raw.slides)
    .map((entry, index) => normalizeSlide(entry, index, ctx))
    .filter((slide): slide is SlideSpec => slide !== null)
    .slice(0, maxSlides);
  if (!slides.length) throw new Error("Spec deck tidak punya slide yang valid.");

  const first = slides[0];
  if (first.layout !== "cover") {
    ctx.warnings.push(`Slide 1 dijadikan cover (semula "${first.layout}").`);
    first.layout = "cover";
    first.subtitle = first.subtitle ?? first.body;
    first.image = first.image ?? { prompt: `Abstract editorial illustration symbolising: ${first.title}`, alt: first.title };
    delete first.items;
    delete first.columns;
    delete first.body;
  }

  const maxImages = options.maxImages ?? 8;
  let kept = 0;
  slides = slides.map((slide) => {
    if (!slide.image) return slide;
    const required = LAYOUT_IMAGE[slide.layout]?.required;
    if (required || kept < maxImages) {
      kept++;
      return slide;
    }
    const trimmed: SlideSpec = { ...slide };
    delete trimmed.image;
    ctx.warnings.push(`Gambar slide "${slide.title}" dibuang (batas ${maxImages} gambar).`);
    return trimmed;
  });

  slides.forEach((slide, index) => {
    slide.id = `${String(index + 1).padStart(2, "0")}-${slide.layout}`;
  });

  const title = words(raw.title ?? raw.name, 8) || slides[0].title;
  const theme = (THEME_IDS as readonly string[]).includes(clean(raw.theme)) ? (clean(raw.theme) as ThemeId) : (options.theme ?? "aurora");
  const deck: DeckSpec = {
    slug: isValidSlug(options.slug) ? options.slug : slugify(clean(raw.slug) || title),
    title,
    subtitle: words(raw.subtitle, 16) || slides[0].subtitle,
    author: words(options.author ?? raw.author, 6) || undefined,
    lang: (options.lang ?? clean(raw.lang)) || "id",
    theme: options.theme ?? theme,
    slides,
  };
  if (isObj(raw.meta)) {
    const meta: NonNullable<DeckSpec["meta"]> = {};
    for (const key of ["brief", "model", "imageModel", "generatedAt"] as const) {
      const value = clean(raw.meta[key]);
      if (value) meta[key] = value.slice(0, 600);
    }
    const warnings = list(raw.meta.warnings)
      .map((warning) => clean(warning).slice(0, 300))
      .filter(Boolean)
      .slice(0, 20);
    if (warnings.length) meta.warnings = warnings;
    deck.meta = meta;
  }
  return { deck, warnings: ctx.warnings };
}

/* ------------------------------------------------------------------------------------------ */
/* JSON schema handed to the planner model (structured output)                                 */
/* ------------------------------------------------------------------------------------------ */

const str = { type: "string" } as const;

export const DECK_SCHEMA = {
  type: "object",
  required: ["title", "slides"],
  properties: {
    title: str,
    subtitle: str,
    slides: {
      type: "array",
      items: {
        type: "object",
        required: ["layout", "title"],
        properties: {
          layout: { type: "string", enum: [...LAYOUTS] },
          eyebrow: str,
          title: str,
          subtitle: str,
          body: str,
          items: {
            type: "array",
            items: {
              type: "object",
              required: ["title"],
              properties: { title: str, text: str, value: str, icon: str },
            },
          },
          columns: {
            type: "array",
            items: {
              type: "object",
              required: ["heading", "points"],
              properties: { heading: str, icon: str, points: { type: "array", items: str } },
            },
          },
          quote: { type: "object", properties: { text: str, by: str } },
          image: { type: "object", required: ["prompt", "alt"], properties: { prompt: str, alt: str } },
          notes: str,
        },
      },
    },
  },
} as const;
