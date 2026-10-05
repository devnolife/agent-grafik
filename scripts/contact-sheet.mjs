#!/usr/bin/env node
/**
 * Renders a labelled contact sheet of every SVG/PNG in a folder, on a chosen background,
 * so illustration candidates can be compared at a glance.
 *
 *   node scripts/contact-sheet.mjs <folder> [--bg=#0A1A2B] [--cols=6] [--out=output/_sheets/name.png]
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = Object.fromEntries(
  process.argv
    .slice(2)
    .filter((arg) => arg.startsWith("--"))
    .map((arg) => arg.slice(2).split("=")),
);
const folder = process.argv.slice(2).find((arg) => !arg.startsWith("--"));
if (!folder) {
  console.error("Usage: node scripts/contact-sheet.mjs <folder> [--bg=#0A1A2B] [--cols=6] [--out=file.png]");
  process.exit(2);
}

const bg = args.bg ?? "#0A1A2B";
const cols = Number(args.cols ?? 6);
const out = path.resolve(ROOT, args.out ?? path.join("output", "_sheets", `${path.basename(folder)}.png`));
const files = (await fs.readdir(folder)).filter((name) => /\.(svg|png)$/i.test(name)).sort();

const cells = await Promise.all(
  files.map(async (name) => {
    const data = await fs.readFile(path.join(folder, name));
    const mime = name.endsWith(".svg") ? "image/svg+xml" : "image/png";
    return `<figure><img src="data:${mime};base64,${data.toString("base64")}"><figcaption>${name}</figcaption></figure>`;
  }),
);

const html = `<!doctype html><html><head><style>
  body { margin: 0; padding: 24px; background: ${bg}; font: 14px/1.3 "Cascadia Mono", Consolas, monospace; color: #cfe0f0; }
  main { display: grid; grid-template-columns: repeat(${cols}, 320px); gap: 20px; }
  figure { margin: 0; display: flex; flex-direction: column; gap: 8px; }
  img { width: 320px; height: 220px; object-fit: contain; outline: 1px dashed rgba(124, 196, 255, 0.25); }
  figcaption { overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
</style></head><body><main>${cells.join("")}</main></body></html>`;

const browser = await chromium.launch({ channel: "msedge" }).catch(() => chromium.launch());
try {
  const page = await browser.newPage({ viewport: { width: cols * 340 + 28, height: 600 } });
  await page.setContent(html, { waitUntil: "load" });
  await fs.mkdir(path.dirname(out), { recursive: true });
  await page.screenshot({ path: out, fullPage: true });
  console.log(`${files.length} images → ${path.relative(ROOT, out)}`);
} finally {
  await browser.close();
}
