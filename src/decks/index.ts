import type { DeckDefinition } from "@/slides/types";
import ethicalHacking from "./ethical-hacking";

/** Register every deck here. The first one is the default in the studio. */
export const decks: DeckDefinition[] = [ethicalHacking];

export function getDeck(slug: string | null | undefined): DeckDefinition {
  return decks.find((deck) => deck.slug === slug) ?? decks[0];
}
