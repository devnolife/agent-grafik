import { SlideProvider, type SlideContext } from "./context";
import { SlideView } from "./layouts";
import { generatedSpecs } from "./registry";
import { archetypeOf, normalizeDeck, type DeckSpec } from "./spec";
import { getTheme } from "./themes";
import type { DeckDefinition } from "@/slides/types";

/** Turn a deck spec into the deck definition the studio and exporter understand. */
export function buildDeck(spec: DeckSpec): DeckDefinition {
  const theme = getTheme(spec.theme);
  const total = spec.slides.length;
  let section = 0;

  return {
    slug: spec.slug,
    title: spec.title,
    subtitle: spec.subtitle,
    author: spec.author,
    lang: spec.lang,
    slides: spec.slides.map((slide, index) => {
      if (slide.layout === "section") section++;
      const context: SlideContext = { deck: spec, theme, index, total, section };
      const component = () => (
        <SlideProvider value={context}>
          <SlideView slide={slide} />
        </SlideProvider>
      );
      component.displayName = `Slide(${slide.id})`;
      return {
        id: slide.id,
        title: slide.title,
        archetype: archetypeOf(slide.layout),
        notes: slide.notes,
        component,
      };
    }),
  };
}

/** Decks the agent wrote to `src/decks/generated/`. Broken specs are skipped, not fatal. */
export function loadGeneratedDecks(): { decks: DeckDefinition[]; specs: DeckSpec[] } {
  const decks: DeckDefinition[] = [];
  const specs: DeckSpec[] = [];
  for (const { slug, spec } of generatedSpecs()) {
    try {
      const { deck } = normalizeDeck(spec, { slug, maxSlides: 40, maxImages: 40 });
      specs.push(deck);
      decks.push(buildDeck(deck));
    } catch (error) {
      console.warn(`[engine] deck "${slug}" dilewati:`, error);
    }
  }
  return { decks, specs };
}
