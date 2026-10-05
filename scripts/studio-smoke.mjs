#!/usr/bin/env node
/**
 * Studio smoke test: keyboard navigation, notes toggle, present mode, a11y basics, console errors.
 *   npm run test:studio [-- --skip-build]
 * Screenshots go to output/_studio/.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { build, preview } from "vite";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "output", "_studio");
const results = [];

function check(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

async function launch() {
  for (const channel of ["msedge", "chrome"]) {
    try {
      return await chromium.launch({ channel });
    } catch {
      // next
    }
  }
  return chromium.launch();
}

if (!process.argv.includes("--skip-build")) await build({ root: ROOT, logLevel: "warn" });
const server = await preview({ root: ROOT, logLevel: "warn", preview: { port: 4318, strictPort: false } });
const baseUrl = server.resolvedUrls?.local?.[0] ?? "http://localhost:4318/";
const browser = await launch();
await fs.mkdir(OUT, { recursive: true });

try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => message.type() === "error" && !message.text().startsWith("Failed to load resource") && errors.push(message.text()));
  page.on("response", (response) => response.status() >= 400 && errors.push(`HTTP ${response.status()} ${response.url()}`));

  await page.goto(baseUrl);
  const total = await page.locator('nav[aria-label="Daftar slide"] button[aria-label^="Slide "]').count();
  check("slide rail renders every slide", total > 0, `${total} thumbnails`);
  await page.screenshot({ path: path.join(OUT, "studio.png") });

  const counter = page.locator('[aria-live="polite"]');
  const pad = (n) => String(n).padStart(2, "0");
  await page.keyboard.press("ArrowRight");
  check("ArrowRight goes to the next slide", (await counter.innerText()).startsWith(pad(Math.min(2, total))));
  await page.keyboard.press("End");
  check("End jumps to the last slide", (await counter.innerText()).startsWith(pad(total)));
  await page.keyboard.press("Home");
  check("Home jumps to the first slide", (await counter.innerText()).startsWith("01"));
  check("URL keeps the slide position", new URL(page.url()).searchParams.get("slide") === "1");

  const current = await page.locator('nav[aria-label="Daftar slide"] [aria-current="true"]').count();
  check("active thumbnail has aria-current", current === 1);

  const notes = page.locator('section[aria-label="Catatan pembicara"]');
  const notesBefore = await notes.count();
  await page.keyboard.press("n");
  check("N toggles speaker notes", (await notes.count()) !== notesBefore);
  await page.keyboard.press("n");

  const unlabeled = await page.$$eval("button", (buttons) =>
    buttons.filter((b) => !(b.getAttribute("aria-label") || b.textContent?.trim())).length,
  );
  check("every button has an accessible name", unlabeled === 0, `${unlabeled} unlabeled`);

  await page.keyboard.press("Tab");
  const focusVisible = await page.evaluate(() => {
    const el = document.activeElement;
    if (!el || el === document.body) return false;
    const cs = getComputedStyle(el);
    return cs.outlineStyle !== "none" || cs.boxShadow !== "none";
  });
  check("keyboard focus is visible", focusVisible);

  await page.keyboard.press("f");
  const dialog = page.locator("dialog[open]");
  await dialog.waitFor({ timeout: 3000 }).catch(() => undefined);
  check("F opens present mode", (await dialog.count()) === 1);
  await page.waitForTimeout(700);
  await page.screenshot({ path: path.join(OUT, "present.png") });
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);
  check("Escape leaves present mode", (await dialog.count()) === 0);

  const reduced = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  await reduced.goto(baseUrl);
  await reduced.waitForSelector('nav[aria-label="Daftar slide"] [aria-current="true"]');
  await reduced.keyboard.press("f");
  await reduced.waitForSelector("dialog[open] .slide-animate [data-step]", { state: "attached", timeout: 3000 });
  const duration = await reduced.evaluate(() => {
    const el = document.querySelector("dialog[open] .slide-animate [data-step]");
    return el ? parseFloat(getComputedStyle(el).animationDuration) : -1;
  });
  check("reduced motion shortens entrance animation", duration > 0 && duration <= 0.2, `${duration}s`);
  await reduced.close();

  check("no console or page errors", errors.length === 0, errors.slice(0, 3).join(" | "));
} finally {
  await browser.close();
  await server.close();
}

const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} checks passed · screenshots: ${path.relative(ROOT, OUT)}`);
process.exit(failed ? 1 : 0);
