/**
 * Maps a CSS font (family + numeric weight) to a PowerPoint font face.
 * Browsers pick weights inside one family; PowerPoint only has Regular/Bold per family name,
 * so intermediate weights must use the installed face name (e.g. "Bahnschrift SemiBold").
 * Only fonts installed on this machine are listed — PowerPoint cannot load web fonts.
 */
const FACES = {
  bahnschrift: {
    300: "Bahnschrift Light",
    350: "Bahnschrift SemiLight",
    400: "Bahnschrift",
    600: "Bahnschrift SemiBold",
    700: ["Bahnschrift", true],
  },
  "segoe ui": {
    300: "Segoe UI Light",
    350: "Segoe UI Semilight",
    400: "Segoe UI",
    600: "Segoe UI Semibold",
    700: ["Segoe UI", true],
    900: "Segoe UI Black",
  },
  "cascadia mono": {
    200: "Cascadia Mono ExtraLight",
    300: "Cascadia Mono Light",
    350: "Cascadia Mono SemiLight",
    400: "Cascadia Mono",
    600: "Cascadia Mono SemiBold",
    700: ["Cascadia Mono", true],
  },
  "cascadia code": {
    200: "Cascadia Code ExtraLight",
    300: "Cascadia Code Light",
    350: "Cascadia Code SemiLight",
    400: "Cascadia Code",
    600: "Cascadia Code SemiBold",
    700: ["Cascadia Code", true],
  },
  "jetbrains mono": {
    100: "JetBrains Mono Thin",
    200: "JetBrains Mono ExtraLight",
    300: "JetBrains Mono Light",
    400: "JetBrains Mono",
    500: "JetBrains Mono Medium",
    700: ["JetBrains Mono", true],
    800: "JetBrains Mono ExtraBold",
  },
  "fira code": {
    300: "Fira Code Light",
    400: "Fira Code",
    500: "Fira Code Medium",
    600: "Fira Code SemiBold",
    700: ["Fira Code", true],
  },
  calibri: { 300: "Calibri Light", 400: "Calibri", 700: ["Calibri", true] },
  cambria: { 400: "Cambria", 700: ["Cambria", true] },
  consolas: { 400: "Consolas", 700: ["Consolas", true] },
  georgia: { 400: "Georgia", 700: ["Georgia", true] },
  verdana: { 400: "Verdana", 700: ["Verdana", true] },
};

export const KNOWN_FAMILIES = Object.keys(FACES);

/** @returns {{ face: string, bold: boolean, known: boolean, exact: boolean }} */
export function resolveFont(family, weight = 400) {
  const table = FACES[String(family).toLowerCase()];
  if (!table) return { face: family, bold: weight >= 600, known: false, exact: false };

  const weights = Object.keys(table).map(Number);
  const nearest = weights.reduce((best, candidate) =>
    Math.abs(candidate - weight) < Math.abs(best - weight) ? candidate : best,
  );
  const entry = table[nearest];
  const [face, bold] = Array.isArray(entry) ? entry : [entry, false];
  return { face, bold, known: true, exact: nearest === weight };
}
