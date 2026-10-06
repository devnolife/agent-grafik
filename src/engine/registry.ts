/**
 * Live view of the decks the agent writes to `src/decks/generated/`.
 *
 * `assets.ts` holds the glob imports and republishes here whenever Vite hot-updates it, so the
 * studio re-renders new slides, pictures and icons in place instead of reloading the page.
 */
export interface GeneratedFiles {
  urls: Record<string, string>;
  svgs: Record<string, string>;
  specs: Record<string, unknown>;
}

let files: GeneratedFiles = { urls: {}, svgs: {}, specs: {} };
let version = 0;
const listeners = new Set<() => void>();

export function publishGenerated(next: GeneratedFiles) {
  files = next;
  version++;
  for (const listener of listeners) listener();
}

export function subscribeGenerated(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export const generatedVersion = () => version;

const key = (slug: string, file: string) => `../decks/generated/${slug}/assets/${file}`;

export function assetUrl(slug: string, file: string | undefined): string | undefined {
  return file ? files.urls[key(slug, file)] : undefined;
}

/** Inline-able SVG markup; scripts and event handlers are stripped defensively. */
export function assetSvg(slug: string, file: string | undefined): string | undefined {
  const raw = file ? files.svgs[key(slug, file)] : undefined;
  if (!raw) return undefined;
  return raw
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*')/gi, "")
    .replace(/javascript:/gi, "");
}

export function generatedSpecs(): { slug: string; spec: unknown }[] {
  return Object.entries(files.specs).flatMap(([path, spec]) => {
    const slug = path.split("/").at(-2);
    return slug ? [{ slug, spec }] : [];
  });
}
