import { useEffect } from "react";
import { decks, getDeck } from "@/decks";
import { toDeckMeta, type DeckMeta } from "@/slides/types";
import { ExportStage, PrintStage } from "@/studio/export-stage";
import { Studio } from "@/studio/studio";

declare global {
  interface Window {
    __DECK_META__?: DeckMeta;
    __DECK_SLUGS__?: string[];
  }
}

const params = new URLSearchParams(window.location.search);

export function App() {
  const deck = getDeck(params.get("deck"));
  const mode = params.get("mode");

  useEffect(() => {
    window.__DECK_META__ = toDeckMeta(deck);
    window.__DECK_SLUGS__ = decks.map((item) => item.slug);
  }, [deck]);

  if (mode === "export") return <ExportStage deck={deck} slideNumber={Number(params.get("slide") ?? "1")} />;
  if (mode === "print") return <PrintStage deck={deck} />;
  return <Studio deck={deck} />;
}
