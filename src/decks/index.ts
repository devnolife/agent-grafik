import { useSyncExternalStore } from "react";
import "@/engine/assets";
import { loadGeneratedDecks } from "@/engine/build";
import { generatedVersion, subscribeGenerated } from "@/engine/registry";
import type { DeckSpec } from "@/engine/spec";
import type { DeckDefinition } from "@/slides/types";
import ethicalHacking from "./ethical-hacking";

/** Register every hand-built deck here. Decks the agent writes to `./generated/` are added automatically. */
const handBuilt: DeckDefinition[] = [ethicalHacking];

export interface DeckCatalog {
  decks: DeckDefinition[];
  /** Specs of the generated decks (by slug); hand-built decks have none. */
  specs: Map<string, DeckSpec>;
}

let cache: { version: number; catalog: DeckCatalog } | undefined;

export function getCatalog(): DeckCatalog {
  const version = generatedVersion();
  if (cache?.version !== version) {
    const generated = loadGeneratedDecks();
    cache = {
      version,
      catalog: {
        decks: [...handBuilt, ...generated.decks],
        specs: new Map(generated.specs.map((spec) => [spec.slug, spec])),
      },
    };
  }
  return cache.catalog;
}

/** The catalog, re-rendered whenever the agent changes a generated deck on disk. */
export function useCatalog(): DeckCatalog {
  return useSyncExternalStore(subscribeGenerated, getCatalog);
}

export function findDeck(decks: DeckDefinition[], slug: string | null | undefined): DeckDefinition {
  return decks.find((deck) => deck.slug === slug) ?? decks[0];
}
