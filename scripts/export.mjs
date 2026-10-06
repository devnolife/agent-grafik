#!/usr/bin/env node
/**
 * Hybrid export: browser design → PowerPoint + PDF + QA.
 *
 *   npm run export -- <deck-slug> [--skip-build] [--no-render] [--no-qa] [--browser=msedge|chromium]
 *
 * Per slide it saves a reference screenshot, captures `<Visual>` regions as transparent PNGs,
 * a background layer (without native text/shapes/pictures), and a text-less layer for contrast QA.
 * The PPTX then stacks: background → native shapes / pictures / editable text (DOM paint order).
 * The PDF is printed by the browser (vector). PowerPoint renders the PPTX back to PNG so
 * scripts/qa.py can compare browser vs PPTX vs PDF pixel by pixel.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import PptxGenJS from "pptxgenjs";
import { build, preview } from "vite";
import { collectSlide } from "./lib/collect.js";
import { resolveFont } from "./lib/fonts.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SLIDE = { width: 1920, height: 1080 };
const FULL = { x: 0, y: 0, ...SLIDE };
const PX_PER_INCH = 144; // 1920 px ↔ 13.333 in (LAYOUT_WIDE)
const PT_PER_PX = 0.5;
const SAFE_AREA = 96;
const MIN_FONT_PX = 24;

/**
 * Vertical text calibration (fraction of font size, positive = move down), measured by qa.py
 * ("Text offset" column) comparing PowerPoint's render with the browser's.
 */
const TEXT_DY_EM = { default: 0 };

const pad = (value) => String(value).padStart(2, "0");
const round = (value) => Math.round(value * 100) / 100;
const inch = (px) => round(px / PX_PER_INCH);
const log = (step, message) => console.log(`[${step}] ${message}`);

function parseArgs(argv) {
  const args = { slug: null, skipBuild: false, render: true, qa: true, browser: null };
  for (const arg of argv) {
    if (arg === "--skip-build") args.skipBuild = true;
    else if (arg === "--no-render") args.render = false;
    else if (arg === "--no-qa") args.qa = false;
    else if (arg.startsWith("--browser=")) args.browser = arg.split("=")[1];
    else if (!arg.startsWith("--")) args.slug = arg;
    else throw new Error(`Unknown option ${arg}`);
  }
  return args;
}

async function launchBrowser(preferred) {
  const defaults = process.platform === "win32" ? ["msedge", "chrome", "chromium"] : ["chrome", "chromium"];
  const channels = preferred ? [preferred] : defaults;
  for (const channel of channels) {
    try {
      return channel === "chromium" ? await chromium.launch() : await chromium.launch({ channel });
    } catch {
      // try the next channel
    }
  }
  throw new Error("No Chromium-based browser found. Install Edge/Chrome or run: npx playwright install chromium");
}

async function openStage(page, baseUrl, query, selector) {
  await page.goto(`${baseUrl}?${new URLSearchParams(query)}`, { waitUntil: "load" });
  const error = await page.$("[data-export-error]");
  if (error) throw new Error(await error.innerText());
  await page.waitForSelector(`${selector}[data-export-ready]`, { timeout: 20_000 });
}

function setRootClass([className, enabled]) {
  document.querySelector("#export-stage [data-slide]")?.classList.toggle(className, enabled);
}

function isolateImage(index) {
  document.querySelector("#export-stage [data-slide]")?.classList.add("pptx-isolate");
  document.querySelectorAll('#export-stage [data-pptx-as="image"]')[index]?.classList.add("pptx-isolate-target");
}

function releaseImage() {
  document.querySelector("#export-stage [data-slide]")?.classList.remove("pptx-isolate");
  document.querySelectorAll(".pptx-isolate-target").forEach((el) => el.classList.remove("pptx-isolate-target"));
}

function clampClip({ x, y, w, h }, bleed = 0) {
  const left = Math.max(0, Math.floor(x - bleed));
  const top = Math.max(0, Math.floor(y - bleed));
  const right = Math.min(SLIDE.width, Math.ceil(x + w + bleed));
  const bottom = Math.min(SLIDE.height, Math.ceil(y + h + bleed));
  return { x: left, y: top, width: Math.max(1, right - left), height: Math.max(1, bottom - top) };
}

async function captureSlide(page, baseUrl, meta, index, dirs) {
  const number = index + 1;
  const id = pad(number);
  await openStage(page, baseUrl, { mode: "export", deck: meta.slug, slide: String(number) }, "#export-stage");

  const reference = path.join(dirs.browser, `slide-${id}.png`);
  await page.screenshot({ path: reference, clip: FULL, scale: "css" });

  const data = await page.evaluate(collectSlide, { safeArea: SAFE_AREA, minFontPx: MIN_FONT_PX });

  for (const image of data.images) {
    const clip = clampClip(image.box, image.bleed);
    const file = path.join(dirs.layers, `slide-${id}-picture-${pad(image.index + 1)}.png`);
    await page.evaluate(isolateImage, image.index);
    await page.screenshot({ path: file, clip, omitBackground: true, scale: "device" });
    await page.evaluate(releaseImage);
    Object.assign(image, { file, clip });
  }

  const noText = path.join(dirs.layers, `slide-${id}-notext.png`);
  await page.evaluate(setRootClass, ["pptx-hide-text", true]);
  await page.screenshot({ path: noText, clip: FULL, scale: "css" });
  await page.evaluate(setRootClass, ["pptx-hide-text", false]);

  const background = path.join(dirs.layers, `slide-${id}-background.png`);
  await page.evaluate(setRootClass, ["pptx-capture-bg", true]);
  await page.screenshot({ path: background, clip: FULL, scale: "device" });
  await page.evaluate(setRootClass, ["pptx-capture-bg", false]);

  for (const item of data.items) {
    if (item.kind !== "text") continue;
    for (const line of item.text.lines) {
      for (const run of line.runs) {
        const font = resolveFont(run.style.family, run.style.weight);
        if (!font.known) {
          data.findings.push({
            type: "unknown-font",
            element: item.element,
            message: `Font "${run.style.family}" is not in the installed-font map; PowerPoint may substitute it.`,
          });
        } else if (!font.exact) {
          data.findings.push({
            type: "font-weight",
            element: item.element,
            message: `Weight ${run.style.weight} of ${run.style.family} maps to "${font.face}"${font.bold ? " bold" : ""} in PowerPoint.`,
          });
        }
      }
    }
  }

  const slideMeta = meta.slides[index];
  log("capture", `${id} ${slideMeta.id}: ${data.stats.textBoxes} text, ${data.stats.shapes} shapes, ${data.stats.images} pictures, ${data.findings.length} findings`);
  return { number, id: slideMeta.id, title: slideMeta.title, notes: slideMeta.notes, reference, noText, background, ...data };
}

function widen(box, align) {
  const extra = Math.max(16, box.w * 0.06);
  if (align === "center") return { ...box, x: box.x - extra / 2, w: box.w + extra };
  if (align === "right") return { ...box, x: box.x - extra, w: box.w + extra };
  if (align === "justify") return box;
  return { ...box, w: box.w + extra };
}

function applyTransform(text, transform) {
  if (transform === "uppercase") return text.toUpperCase();
  if (transform === "lowercase") return text.toLowerCase();
  if (transform === "capitalize") return text.replace(/(^|\s)(\p{L})/gu, (_, space, letter) => space + letter.toUpperCase());
  return text;
}

function addText(slide, text, name) {
  const runs = [];
  text.lines.forEach((line, lineIndex) => {
    line.runs.forEach((run, runIndex) => {
      const style = run.style;
      const font = resolveFont(style.family, style.weight);
      const options = {
        fontFace: font.face,
        bold: font.bold,
        italic: style.italic || undefined,
        fontSize: round(style.size * PT_PER_PX),
        color: style.color,
      };
      if (style.alpha < 1) options.transparency = Math.round((1 - style.alpha) * 100);
      if (style.letterSpacing) options.charSpacing = round(style.letterSpacing * PT_PER_PX);
      if (style.underline) options.underline = { style: "sng" };
      if (style.strike) options.strike = "sngStrike";
      if (style.highlight) options.highlight = style.highlight;
      if (runIndex === line.runs.length - 1 && lineIndex < text.lines.length - 1) options.breakLine = true;
      runs.push({ text: applyTransform(run.text, style.transform), options });
    });
  });

  const family = text.lines[0].runs[0].style.family.toLowerCase();
  const dy = (TEXT_DY_EM[family] ?? TEXT_DY_EM.default) * text.maxFontSize;
  const box = widen(text.box, text.align);
  slide.addText(runs, {
    x: inch(box.x),
    y: inch(box.y + dy),
    w: inch(box.w),
    h: inch(box.h + text.lineHeight * 0.25),
    margin: 0,
    valign: "top",
    align: text.align,
    fit: "none",
    wrap: true,
    lineSpacing: round(text.lineHeight * PT_PER_PX),
    objectName: name,
  });
}

function addShape(slide, shape, name) {
  const borderWidth = shape.border ? shape.border.width : 0;
  // PowerPoint strokes are centred on the geometry; CSS borders sit inside the box.
  const inset = borderWidth / 2;
  const options = {
    x: inch(shape.box.x + inset),
    y: inch(shape.box.y + inset),
    w: inch(Math.max(shape.box.w - borderWidth, 1)),
    h: inch(Math.max(shape.box.h - borderWidth, 1)),
    objectName: name,
  };
  const opacity = Number.isFinite(shape.opacity) ? shape.opacity : 1;
  if (shape.fill) {
    options.fill = { color: shape.fill.hex, transparency: Math.round((1 - shape.fill.a * opacity) * 100) };
  }
  if (shape.border) {
    const dashType = { dashed: "dash", dotted: "sysDot" }[shape.border.style] ?? "solid";
    options.line = {
      color: shape.border.color.hex,
      width: round(borderWidth * PT_PER_PX),
      transparency: Math.round((1 - shape.border.color.a * opacity) * 100),
      dashType,
    };
  }
  if (shape.kind === "roundRect") options.rectRadius = inch(Math.max(shape.radius - inset, 0));
  if (shape.shadow) {
    const { x, y, blur, color } = shape.shadow;
    options.shadow = {
      type: "outer",
      blur: round(blur * PT_PER_PX),
      offset: round(Math.hypot(x, y) * PT_PER_PX),
      angle: Math.round(((Math.atan2(y, x) * 180) / Math.PI + 360) % 360),
      color: color.hex,
      opacity: round(color.a * opacity),
    };
  }
  slide.addShape(shape.kind, options);
}

async function writePptx(meta, slides, file) {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.title = meta.title;
  if (meta.subtitle) pptx.subject = meta.subtitle;
  if (meta.author) pptx.author = meta.author;

  const faces = new Map();
  for (const slide of slides) {
    for (const item of slide.items) {
      if (item.kind !== "text") continue;
      const { family, weight } = item.text.lines[0].runs[0].style;
      const face = resolveFont(family, weight).face;
      faces.set(face, (faces.get(face) ?? 0) + item.text.text.length);
    }
  }
  const mainFace = [...faces.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  if (mainFace) pptx.theme = { headFontFace: mainFace, bodyFontFace: mainFace };

  for (const slide of slides) {
    const pptxSlide = pptx.addSlide();
    pptxSlide.background = { path: slide.background };
    const counters = { shape: 0, picture: 0, text: 0 };
    for (const item of slide.items) {
      if (item.kind === "shape") addShape(pptxSlide, item.shape, `Shape ${++counters.shape}`);
      else if (item.kind === "image") {
        pptxSlide.addImage({
          path: item.file,
          x: inch(item.clip.x),
          y: inch(item.clip.y),
          w: inch(item.clip.width),
          h: inch(item.clip.height),
          objectName: `Picture ${++counters.picture}`,
        });
      } else if (item.kind === "text") addText(pptxSlide, item.text, `Text ${++counters.text}`);
    }
    if (slide.notes) pptxSlide.addNotes(slide.notes);
  }
  await pptx.writeFile({ fileName: file, compression: true });
}

function run(command, args) {
  const result = spawnSync(command, args, { cwd: ROOT, stdio: "inherit" });
  if (result.error) throw result.error;
  return result.status ?? 1;
}

/** Linux/macOS stand-in for PowerPoint's renderer: LibreOffice → PDF → one PNG per slide (1920×1080). */
async function renderPptxWithLibreOffice(pptxFile, outDir) {
  const work = await fs.mkdtemp(path.join(os.tmpdir(), "agent-grafik-pptx-"));
  try {
    await fs.mkdir(outDir, { recursive: true });
    const converted = spawnSync(
      "soffice",
      ["--headless", "--norestore", `-env:UserInstallation=file://${work}/profile`, "--convert-to", "pdf", "--outdir", work, pptxFile],
      { cwd: ROOT, stdio: ["ignore", "ignore", "inherit"], timeout: 180_000 },
    );
    const pdf = path.join(work, `${path.basename(pptxFile, ".pptx")}.pdf`);
    if (converted.status !== 0) return 1;
    await fs.access(pdf);
    const rasterised = spawnSync("pdftoppm", ["-r", "144", "-png", pdf, path.join(work, "page")], { stdio: "inherit" });
    if (rasterised.status !== 0) return 1;
    const pages = (await fs.readdir(work)).filter((name) => /^page-\d+\.png$/.test(name));
    for (const name of pages) {
      const number = Number(name.match(/\d+/)[0]);
      await fs.copyFile(path.join(work, name), path.join(outDir, `slide-${pad(number)}.png`));
    }
    log("render", `LibreOffice → ${pages.length} PNG`);
    return 0;
  } catch {
    return 1;
  } finally {
    await fs.rm(work, { recursive: true, force: true });
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const started = Date.now();

  if (!args.skipBuild) {
    log("build", "vite build");
    await build({ root: ROOT, logLevel: "warn" });
  }

  const server = await preview({ root: ROOT, logLevel: "warn", preview: { port: 4317, strictPort: false, open: false } });
  const baseUrl = server.resolvedUrls?.local?.[0] ?? "http://localhost:4317/";
  const browser = await launchBrowser(args.browser);
  let outDir;
  let pptxFile;

  try {
    const context = await browser.newContext({ viewport: SLIDE, deviceScaleFactor: 2 });
    const page = await context.newPage();
    page.on("pageerror", (error) => console.error(`[page] ${error.message}`));

    await openStage(page, baseUrl, { mode: "export", deck: args.slug ?? "", slide: "1" }, "#export-stage");
    const { meta, slugs } = await page.evaluate(() => ({ meta: window.__DECK_META__, slugs: window.__DECK_SLUGS__ }));
    if (!meta) throw new Error("Deck metadata missing (window.__DECK_META__).");
    if (args.slug && meta.slug !== args.slug) {
      throw new Error(`Deck "${args.slug}" not found. Available: ${(slugs ?? [meta.slug]).join(", ")}`);
    }

    outDir = path.join(ROOT, "output", meta.slug);
    try {
      await fs.rm(outDir, { recursive: true, force: true });
    } catch (error) {
      throw new Error(`Cannot clear ${outDir} (${error.code}). Close the PPTX/PDF if it is open, then retry.`);
    }
    const dirs = {
      browser: path.join(outDir, "browser"),
      layers: path.join(outDir, "layers"),
    };
    await Promise.all(Object.values(dirs).map((dir) => fs.mkdir(dir, { recursive: true })));
    log("deck", `${meta.slug}: ${meta.slides.length} slide(s) → ${path.relative(ROOT, outDir)}`);

    const slides = [];
    for (let index = 0; index < meta.slides.length; index++) {
      slides.push(await captureSlide(page, baseUrl, meta, index, dirs));
    }

    pptxFile = path.join(outDir, `${meta.slug}.pptx`);
    await writePptx(meta, slides, pptxFile);
    log("pptx", path.relative(ROOT, pptxFile));

    const pdfFile = path.join(outDir, `${meta.slug}.pdf`);
    await openStage(page, baseUrl, { mode: "print", deck: meta.slug }, "#print-stage");
    await page.pdf({
      path: pdfFile,
      width: `${SLIDE.width}px`,
      height: `${SLIDE.height}px`,
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    });
    log("pdf", path.relative(ROOT, pdfFile));

    const qaData = {
      deck: meta,
      generatedAt: new Date().toISOString(),
      config: { slide: SLIDE, safeArea: SAFE_AREA, minFontPx: MIN_FONT_PX, textDyEm: TEXT_DY_EM },
      slides: slides.map((slide) => ({
        ...slide,
        reference: path.relative(outDir, slide.reference),
        noText: path.relative(outDir, slide.noText),
        background: path.relative(outDir, slide.background),
        items: slide.items.map((item) => (item.file ? { ...item, file: path.relative(outDir, item.file) } : item)),
        images: undefined,
      })),
    };
    await fs.writeFile(path.join(outDir, "qa-data.json"), JSON.stringify(qaData, null, 2));
  } finally {
    await browser.close();
    await server.close();
  }

  if (args.render) {
    const renderDir = path.join(outDir, "pptx-render");
    let status;
    if (process.platform === "win32") {
      log("render", "PowerPoint → PNG");
      status = run("powershell", [
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        path.join(ROOT, "scripts", "render-pptx.ps1"),
        "-Pptx",
        pptxFile,
        "-OutDir",
        renderDir,
      ]);
    } else {
      log("render", "LibreOffice → PNG");
      status = await renderPptxWithLibreOffice(pptxFile, renderDir);
    }
    if (status !== 0) console.warn("[render] PPTX render failed; QA will skip PPTX fidelity checks.");
  }

  if (args.qa) {
    const python = process.platform === "win32" ? "python" : "python3";
    log("qa", `${python} scripts/qa.py`);
    const status = run(python, [path.join(ROOT, "scripts", "qa.py"), outDir]);
    if (status !== 0) process.exitCode = status;
  }

  log("done", `${((Date.now() - started) / 1000).toFixed(1)}s → ${path.relative(ROOT, outDir)}`);
}

main().catch((error) => {
  console.error(`\n[export] ${error.message}`);
  process.exit(1);
});
