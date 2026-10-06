import { useEffect, useState } from "react";
import { findDeck, useCatalog } from "@/decks";
import { toDeckMeta, type DeckMeta } from "@/slides/types";
import { AgentProvider } from "@/studio/agent-client";
import { ExportStage, PrintStage } from "@/studio/export-stage";
import { Studio } from "@/studio/studio";

declare global {
  interface Window {
    __DECK_META__?: DeckMeta;
    __DECK_SLUGS__?: string[];
  }
}

const params = new URLSearchParams(window.location.search);
const mode = params.get("mode");

export function App() {
  const { decks, specs } = useCatalog();
  const [slug, setSlug] = useState(() => params.get("deck"));
  const deck = findDeck(decks, slug);

  useEffect(() => {
    window.__DECK_META__ = toDeckMeta(deck);
    window.__DECK_SLUGS__ = decks.map((item) => item.slug);
  }, [deck, decks]);

  if (mode === "export") return <ExportStage deck={deck} slideNumber={Number(params.get("slide") ?? "1")} />;
  if (mode === "print") return <PrintStage deck={deck} />;
  return (
    <AgentProvider>
      <Studio deck={deck} decks={decks} spec={specs.get(deck.slug)} onSelectDeck={setSlug} />
    </AgentProvider>
  );
}
