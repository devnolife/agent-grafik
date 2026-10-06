---
name: presentation-design
description: Workflow for designing presentation decks as React slides on a fixed 1920×1080 canvas in this project's browser studio, then exporting hybrid PowerPoint (editable text and shapes) plus vector PDF with automated QA. Use when creating, redesigning, polishing, auditing, or exporting a presentation, slide deck, PPT/PPTX or PDF in the agent-infografik project, or when working in src/decks/, src/slides/, scripts/export.mjs, or output/<slug>/qa-report.md.
---

# Presentation design: browser-first, then PPTX + PDF

Slides are designed as UI in the browser (React + Tailwind v4) so they can be polished visually.
The exporter then turns the same DOM into a **hybrid PPTX**: background image + native shapes + pictures +
**native editable text** with the browser's exact line breaks. It also produces a **vector PDF** and a QA report
that compares the browser, PowerPoint, and PDF renders pixel by pixel.

## Project map

| Path | Contents |
|---|---|
| `src/slides/primitives.tsx` | `Slide`, `Text`, `Shape`, `Visual`, `Icon`, `Illustration`, `Step`, the export contract (do not change casually) |
| `src/decks/<slug>/` | One deck: `index.ts` (definition + notes), `tokens.ts` (palette, type roles), `theme.tsx` (slide root, footer), `slides/*.tsx`, `assets/` (re-toned illustrations), `brief.md`, `outline.md`, `source-notes.md` |
| `src/decks/index.ts` | Deck registry (register new decks here) |
| `src/studio/` | Preview studio: slide rail, scaled canvas, notes, present mode, export stage, AI panel (`create-sheet.tsx`), deck inspector, job dock |
| `src/engine/` | Spec-driven decks: `spec.ts` (9 layouts + lenient normalizer), `themes.ts` (4 themes + image art direction), `layouts.tsx`/`blocks.tsx` (spec → slides) |
| `src/decks/generated/<slug>/` | AI decks: `deck.json` + `assets/` (JPEG pictures, SVG icons). Registered automatically and hot-reloaded while the agent writes |
| `agent/` | Local AI agent: `planner.ts` (Ollama), `comfy.ts` (FLUX.2 on ComfyUI), `pipeline.ts`, `cli.ts`, `vite-plugin.ts` (studio API `/api/agent/*`) |
| `scripts/trace-icon.py` | FLUX.2 pictogram (PNG) → one-colour SVG (`fill="currentColor"`) |
| `scripts/export.mjs` | Build → capture → PPTX → PDF → PowerPoint render → QA |
| `scripts/qa.py` | Contrast, density, overflow, and browser vs PPTX vs PDF fidelity → `qa-report.md` |
| `output/<slug>/` | `<slug>.pptx`, `<slug>.pdf`, `qa-report.md`, `compare/`, `browser/`, `pptx-render/`, `pdf-render/`, `layers/` |

Reference deck that already passes QA: `src/decks/ethical-hacking/` (copy its structure).

## Commands

```bash
npm run dev                        # studio → http://localhost:5173/?deck=<slug>  (keys: ←/→, F present, N notes, I panel, G AI panel)
npm run typecheck                  # must pass before export
npm run export -- <slug>           # full pipeline (~20–40 s); flags: --skip-build --no-render --no-qa
python scripts/qa.py output/<slug> # re-run QA only
npm run test:studio                # studio smoke test (keyboard, a11y, present mode)
node scripts/contact-sheet.mjs <folder> [--bg=#hex] [--out=output/_sheets/x.png]   # compare illustration candidates
python scripts/recolor-illustration.py IN.svg --out src/decks/<slug>/assets/x.svg --mode outline|tonal --bg #.. --line #.. --accent #..

# Local AI agent (Ollama + ComfyUI FLUX.2 on this server)
npm run agent -- status                                   # Ollama models, ComfyUI, free VRAM
npm run agent -- deck "<brief>" --sources notes.md --slides 8 --theme aurora|paper|forest|sunset \
     --icons lucide|solid|outline [--no-images] [--review] [--export]     # → src/decks/generated/<slug>/
npm run agent -- repaint <slug> [slide-id]                # new pictures (after a theme change or a bad one)
npm run agent -- restyle <slug> lucide|solid|outline      # redraw every icon of a deck
npm run agent -- icons "rocket, team of three, shield" --style solid|outline   # SVG set → output/icons/<set>/
npm run agent -- image "<description>" --theme free|aurora|… --shape wide|portrait|square --count 2   # → output/images/
```

Start the dev server in the background (for example `Start-Process npm -ArgumentList "run","dev"`), not in a blocking shell.
PowerPoint must not have `output/<slug>/<slug>.pptx` open during export, because the folder is recreated.

## Two ways to build a deck

- **Agent deck (fast, standard layouts).** `npm run agent -- deck "<brief>"` (or "Buat dengan AI" in the studio) plans the
  storyline with Ollama (`gemma4` by default), writes `deck.json`, then FLUX.2 draws the icons (traced to SVG) and the
  pictures in the theme's art direction. Refine by editing `deck.json` (text, layout, `image.prompt`) and run
  `repaint`/`restyle` for visuals. The gates still apply: export, read `qa-report.md`, look at `compare/`.
  Numbers the planner wrote that are not in the brief/sources land in `meta.warnings` (studio panel "Perlu dicek"):
  verify or remove every one before delivery.
- **Hand-built deck (bespoke design).** The phased workflow below, for brand systems, diagrams and custom layouts.

The ComfyUI server is shared (2× L40S behind a dispatcher). Never call the global `/interrupt`; cancel through the agent
(Ctrl+C or "Batalkan"), which only cancels its own prompt ids. A 7-slide deck with AI icons and pictures takes 3–5 minutes.

## Workflow (phases and gates)

1. **Brief & sources.** Write `brief.md` with audience, goal, duration or slide count, language, brand, sources,
   and constraints. For source files, extract the content to `source-notes.md` (an image-based PPTX: unzip it and
   read `ppt/media`; PDF/DOCX: `firecrawl-parse`). Never add facts that are not in the sources.
2. **Storyline.** In `outline.md`, give every slide: archetype, takeaway title, content, notes, and source reference.
   The titles alone must tell the argument. One idea per slide.
3. **Visual system.** Write `theme.tsx` and `tokens.ts` with role-based palette, type roles (px), grid, motif, and only installed fonts.
   Also decide the **icon set** (Lucide, one stroke weight) and the **illustration treatment** (unDraw re-toned to the palette).
   Add a 3-line rationale in `brief.md`. See `references/slide-design-rules.md`.
4. **3 sample slides.** Build cover + concept + data/process **with icons and illustrations**, export them, and fix QA findings.
   Then **ask the user for approval** with the `question` tool, citing `output/<slug>/compare/*.png`.
5. **Production.** Build the remaining slides. Every concept item gets an icon, and every cover/concept/process/comparison
   slide gets an illustration or a diagram as its hero visual. Fill `notes` for every slide (in the user's language).
6. **Polish.** Apply the polish rules and anti-slop list. Keep spacing, alignment, and recurring elements consistent across slides.
7. **Review & QA.** Run `npm run export -- <slug>`. Read `qa-report.md`, then look at every `compare/slide-NN.png`.
   Fix every Blocker and Major and re-export. Follow `references/quality-checklist.md`.
8. **Deliver.** Report the paths, a one-line summary per slide, the QA counts, the PPTX and PDF diffs, and any open decisions.
9. **Studio UI QA** (only when `src/studio/` changed): keyboard navigation, focus, labels, reduced motion,
   `playwright-cli`, and `react-doctor`.

## Icons and illustrations (required, not optional)

- **Icons:** `<Icon icon={Bug} size={44} className="text-(--x-line)" />` uses `lucide-react`, which is already installed.
  Use one set and one stroke weight (2.5 px, constant across sizes): 44–48 px on cards and 32–36 px in lists.
  Use the line colour by default and the accent colour only on the emphasised item.
- **Illustrations:** use real unDraw art (via the `ideagram` skill), not hand-drawn SVG people:
  1. The library is `~/.ideagram/undraw/` (30 security/legal/analysis/risk SVGs are already there). If nothing fits, search
     `https://undraw.co/search/<term>`, download the `cdn.undraw.co/...svg` you need into the library, then run
     `python ~/.agents/skills/tastemaker/ideagram/scripts/build_library_index.py`.
  2. Preview the candidates on the deck background: `node scripts/contact-sheet.mjs ~/.ideagram/undraw --bg=#<bg>`.
  3. Re-tone the chosen one to the palette into `src/decks/<slug>/assets/`. `--mode outline` gives a technical line drawing
     (best on dark themes) and `--mode tonal` gives flat tones. On light themes, `python ~/.agents/skills/tastemaker/ideagram/scripts/recolor_undraw.py --accent` is enough.
  4. Render it with `<Illustration src={asset} className="absolute ... h-[..] w-[..]" />` (import the SVG as a URL).
- Typical placements:
  - Cover: the hero visual.
  - Concept slides: top-right next to the title (about 400×270 px), or as the left/right half.
  - Never put an illustration behind text.
- unDraw licence: free, no attribution, but **do not redistribute the library** as a collection. Keep only the re-toned copies a deck uses.
- **AI alternatives on this server:** `npm run agent -- icons "…"` draws a matching SVG icon set (one colour, takes
  `currentColor`), and `npm run agent -- image "…" --theme <id>` paints a FLUX.2 picture in a deck theme's art direction.
  Pictures must not contain text or UI; run with `--review` (vision model check) or look at them yourself.

## Writing a slide

```tsx
import { ShieldCheck } from "lucide-react";
import { Icon, Illustration, Shape, Text, Visual } from "@/slides/primitives";
import heroArt from "../assets/hero.svg";
import { DeckSlide, SheetFooter } from "../theme";
import { type } from "../tokens";

export function ExampleSlide() {
  return (
    <DeckSlide>
      <div className="absolute inset-x-[96px] top-[96px]">
        <Text className={type.eyebrow} step={0}>Section label</Text>
        <Text as="h2" className={type.title} step={1}>A full-sentence takeaway as the title</Text>
      </div>
      <Illustration src={heroArt} className="absolute top-[72px] right-[96px] h-[270px] w-[400px]" step={2} />
      <Shape className="absolute top-[400px] left-[96px] w-[560px] border-2 border-(--x-line) bg-(--x-surface) p-[28px]" step={3}>
        <Icon icon={ShieldCheck} size={44} className="text-(--x-line)" />
        <Text className={type.body}>Every word lives in a Text element.</Text>
      </Shape>
      <Visual className="absolute top-[400px] right-[96px] h-[520px] w-[760px]" step={4}>
        <svg>{/* diagram drawn in SVG, no text inside */}</svg>
      </Visual>
      <SheetFooter number={2} />
    </DeckSlide>
  );
}
```

- Use px on the 1920×1080 canvas (Tailwind arbitrary values such as `text-[64px]`, `top-[96px]`).
- `step` only staggers the entrance in present mode. The export is always static.
- Labels inside a drawing should be native `<Text>` positioned over the `<Visual>`, so they stay editable.
- Mark repeated chrome (footer, page number) with `data-qa="chrome"` so it is left out of the word budget.

## References (read when the phase needs them)

- `references/export-contract.md`: what `Text`, `Shape`, and `Visual` become in PowerPoint, what is supported, and pitfalls
- `references/slide-design-rules.md`: canvas, grid, hierarchy, typography, color, polish, motion
- `references/content-and-data-rules.md`: storyline, density budgets, writing, data viz, imagery, anti-slop, content integrity
- `references/quality-checklist.md`: what every QA finding means, its thresholds, and how to fix it, plus the visual review list
- `references/skill-routing.md`: which installed skill to load in which phase, and what not to take from it
