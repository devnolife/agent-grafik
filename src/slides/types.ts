import type { ComponentType } from "react";

/** Layout archetype; drives the word budget in QA (see scripts/qa.py). */
export type SlideArchetype = "cover" | "konsep" | "proses" | "perbandingan" | "data" | "kutipan" | "penutup";

export interface SlideDefinition {
  /** Stable id, used for file names and QA findings (e.g. "cover"). */
  id: string;
  /** Short human title shown in the studio rail and QA report. */
  title: string;
  archetype?: SlideArchetype;
  /** Speaker notes. Exported to PowerPoint notes; never rendered on the slide. */
  notes?: string;
  component: ComponentType;
}

export interface DeckDefinition {
  slug: string;
  title: string;
  subtitle?: string;
  author?: string;
  lang?: string;
  slides: SlideDefinition[];
}

/** Serializable deck metadata exposed to the export pipeline as `window.__DECK_META__`. */
export interface DeckMeta {
  slug: string;
  title: string;
  subtitle?: string;
  author?: string;
  lang?: string;
  slides: { id: string; title: string; archetype?: SlideArchetype; notes: string }[];
}

export function toDeckMeta(deck: DeckDefinition): DeckMeta {
  return {
    slug: deck.slug,
    title: deck.title,
    subtitle: deck.subtitle,
    author: deck.author,
    lang: deck.lang,
    slides: deck.slides.map(({ id, title, archetype, notes }) => ({ id, title, archetype, notes: notes ?? "" })),
  };
}
