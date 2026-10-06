import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { isValidSlug, normalizeDeck, type DeckSpec } from "../src/engine/spec.ts";
import { ROOT, deckDir } from "./config.ts";
import { AbortError, type Emit } from "./events.ts";

const PYTHON = process.env.PYTHON ?? (process.platform === "win32" ? "python" : "python3");

const exists = (file: string) =>
  fs.access(file).then(
    () => true,
    () => false,
  );

export async function readDeck(slug: string): Promise<DeckSpec> {
  if (!isValidSlug(slug)) throw new Error(`Slug tidak valid: ${slug}`);
  const file = path.join(deckDir(slug), "deck.json");
  if (!(await exists(file))) throw new Error(`Deck "${slug}" tidak ada di src/decks/generated/.`);
  const raw = JSON.parse(await fs.readFile(file, "utf8"));
  return normalizeDeck(raw, { slug, maxSlides: 40, maxImages: 40 }).deck;
}

/** Atomic write, so the studio never reads half a file. */
export async function writeDeck(deck: DeckSpec): Promise<void> {
  const dir = deckDir(deck.slug);
  await fs.mkdir(path.join(dir, "assets"), { recursive: true });
  const file = path.join(dir, "deck.json");
  const temp = `${file}.${process.pid}.tmp`;
  await fs.writeFile(temp, `${JSON.stringify(deck, null, 2)}\n`);
  await fs.rename(temp, file);
}

/** A free slug: never one of the hand-built decks, never an existing generated deck. */
export async function uniqueSlug(base: string): Promise<string> {
  const entries = await fs.readdir(path.join(ROOT, "src", "decks"), { withFileTypes: true });
  const taken = new Set(entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name));
  let slug = base;
  for (let n = 2; taken.has(slug) || (await exists(deckDir(slug))); n++) slug = `${base.slice(0, 58)}-${n}`;
  return slug;
}

/** Coalesces deck.json writes while pictures stream in; `flush` surfaces any write error. */
export function deckSaver(deck: DeckSpec, emit: Emit) {
  let pending: Promise<void> = Promise.resolve();
  let timer: NodeJS.Timeout | undefined;
  let failure: unknown;
  const write = () => {
    timer = undefined;
    pending = pending
      .then(() => writeDeck(deck))
      .then(() => emit({ type: "deck", slug: deck.slug }))
      .catch((error) => {
        failure = error;
      });
  };
  return {
    request() {
      timer ??= setTimeout(write, 400);
    },
    async flush() {
      if (timer) {
        clearTimeout(timer);
        write();
      }
      await pending;
      if (failure) throw failure;
    },
  };
}

function runPython(args: string[], input?: Buffer, signal?: AbortSignal): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(PYTHON, args, { cwd: ROOT, stdio: ["pipe", "pipe", "pipe"], signal });
    let out = "";
    let err = "";
    child.stdout.on("data", (chunk) => (out += chunk));
    child.stderr.on("data", (chunk) => (err += chunk));
    child.on("error", (error) =>
      reject(error.name === "AbortError" ? new AbortError() : new Error(`${PYTHON} tidak bisa dijalankan: ${error.message}`)),
    );
    child.on("close", (code) => {
      if (code === 0) resolve(out);
      else reject(new Error(`${PYTHON} gagal (${code}): ${err.trim().split("\n").slice(-2).join(" ")}`));
    });
    child.stdin.end(input);
  });
}

const JPEG = [
  "import io, sys",
  "from PIL import Image",
  "Image.open(io.BytesIO(sys.stdin.buffer.read())).convert('RGB').save(sys.argv[1], 'JPEG', quality=90, optimize=True, progressive=True)",
].join("\n");

/** PNG from ComfyUI → JPEG (about a tenth of the size; the disk is shared). */
export async function saveJpeg(png: Buffer, file: string, signal?: AbortSignal): Promise<void> {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await runPython(["-c", JPEG, file], png, signal);
}

/** Pick the cleanest candidate and trace it into a one-colour SVG (scripts/trace-icon.py). */
export async function traceIcon(candidates: Buffer[], file: string, signal?: AbortSignal): Promise<{ ok: boolean; reason?: string }> {
  const work = await fs.mkdtemp(path.join(os.tmpdir(), "agent-grafik-icon-"));
  try {
    const inputs = await Promise.all(
      candidates.map(async (png, index) => {
        const input = path.join(work, `candidate-${index}.png`);
        await fs.writeFile(input, png);
        return input;
      }),
    );
    await fs.mkdir(path.dirname(file), { recursive: true });
    const out = await runPython([path.join(ROOT, "scripts", "trace-icon.py"), file, ...inputs], undefined, signal);
    const verdict = JSON.parse(out.trim().split("\n").at(-1) ?? "{}") as { ok?: boolean; reason?: string };
    return { ok: Boolean(verdict.ok), reason: verdict.reason };
  } finally {
    await fs.rm(work, { recursive: true, force: true });
  }
}

const ICON_WORDS: Record<string, string> = {
  check: "check mark",
  x: "cross",
  plus: "plus sign",
  minus: "minus sign",
  off: "crossed out",
  big: "",
  small: "",
  alt: "",
};

/** Lucide name → what to draw (`shield-check` → "shield check mark", `bar-chart-3` → "bar chart"). */
export function iconSubject(name: string): string {
  const words = name
    .split("-")
    .map((part) => (Object.hasOwn(ICON_WORDS, part) ? ICON_WORDS[part] : /^\d+$/.test(part) ? "" : part))
    .filter(Boolean);
  return words.join(" ") || "a star";
}

/** Remove a file inside a deck's assets folder (ignores names that are not bare file names). */
export async function removeAsset(dir: string, file: string | undefined): Promise<void> {
  if (!file || !/^[\w-][\w.-]{0,80}$/.test(file)) return;
  await fs.rm(path.join(dir, file), { force: true });
}
