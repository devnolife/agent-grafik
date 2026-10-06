/** Files an agent writes next to a generated deck: `src/decks/generated/<slug>/{deck.json,assets/*}`. */
import { publishGenerated } from "./registry";

publishGenerated({
  urls: import.meta.glob<string>("../decks/generated/*/assets/*.{jpg,jpeg,png,webp}", {
    eager: true,
    query: "?url",
    import: "default",
  }),
  svgs: import.meta.glob<string>("../decks/generated/*/assets/*.svg", {
    eager: true,
    query: "?raw",
    import: "default",
  }),
  specs: import.meta.glob("../decks/generated/*/deck.json", { eager: true, import: "default" }),
});

// Self-accepting: a new deck.json or asset re-runs this module and republishes, no page reload.
if (import.meta.hot) import.meta.hot.accept();
