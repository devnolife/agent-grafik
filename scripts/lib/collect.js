/**
 * In-page collector for the hybrid PPTX export. Runs inside the browser via `page.evaluate`,
 * so it must stay self-contained (no imports, no closures over module scope).
 *
 * It resolves each `[data-pptx]` element to a role (`data-pptx-as`), measures native text
 * line-by-line (so PowerPoint keeps the browser's exact line breaks), reads shape styles,
 * and returns QA findings about things the export cannot represent faithfully.
 */
export function collectSlide({ safeArea, minFontPx }) {
  const root = document.querySelector("#export-stage [data-slide]");
  if (!root) throw new Error("No [data-slide] root inside #export-stage");
  const origin = root.getBoundingClientRect();
  const W = origin.width;
  const H = origin.height;

  // ---- colour parsing (handles oklch/color()/hex/rgb via canvas) ---------------------------
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const colorCache = new Map();
  function rgba(css) {
    if (!css || css === "transparent" || css === "none") return { hex: "000000", a: 0, r: 0, g: 0, b: 0 };
    if (colorCache.has(css)) return colorCache.get(css);
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = "rgba(0,0,0,0)";
    ctx.fillStyle = css;
    ctx.fillRect(0, 0, 1, 1);
    const [r, g, b, a8] = ctx.getImageData(0, 0, 1, 1).data;
    const out = {
      r,
      g,
      b,
      a: Math.round((a8 / 255) * 1000) / 1000,
      hex: [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("").toUpperCase(),
    };
    colorCache.set(css, out);
    return out;
  }

  const rel = (rect) => ({
    x: rect.left - origin.left,
    y: rect.top - origin.top,
    w: rect.width,
    h: rect.height,
  });
  const round = (value) => Math.round(value * 100) / 100;
  const snippetOf = (text) => {
    const clean = text.replace(/\s+/g, " ").trim();
    return clean.length > 48 ? `${clean.slice(0, 45)}…` : clean;
  };
  const describe = (el) => {
    const tag = el.tagName.toLowerCase();
    const text = snippetOf(el.textContent || "");
    return text ? `<${tag}> "${text}"` : `<${tag}>`;
  };

  const findings = [];
  const add = (type, el, message, extra = {}) =>
    findings.push({ type, element: el ? describe(el) : null, message, ...extra });

  // ---- shapes -------------------------------------------------------------------------------
  function parseShadow(value) {
    if (!value || value === "none") return null;
    const first = value.split(/,(?![^(]*\))/)[0].trim();
    const colorMatch = first.match(/^(rgba?\([^)]*\)|oklch\([^)]*\)|color\([^)]*\)|#[0-9a-f]+|[a-z]+)\s+/i);
    const color = colorMatch ? rgba(colorMatch[1]) : rgba("rgba(0,0,0,0.5)");
    const nums = (colorMatch ? first.slice(colorMatch[0].length) : first).match(/-?[\d.]+px/g) || [];
    const [x = 0, y = 0, blur = 0, spread = 0] = nums.map((n) => parseFloat(n));
    if (color.a === 0) return null;
    return { x, y, blur, spread, color, inset: /\binset\b/.test(first) };
  }

  function readBox(el, cs) {
    const rect = el.getBoundingClientRect();
    const box = rel(rect);
    const sides = ["Top", "Right", "Bottom", "Left"];
    const widths = sides.map((s) => parseFloat(cs[`border${s}Width`]) || 0);
    const styles = sides.map((s) => cs[`border${s}Style`]);
    const colors = sides.map((s) => rgba(cs[`border${s}Color`]));
    const shown = widths.map((w, i) => w > 0 && styles[i] !== "none" && styles[i] !== "hidden" && colors[i].a > 0);
    const anyBorder = shown.some(Boolean);
    const uniformBorder =
      anyBorder &&
      shown.every(Boolean) &&
      widths.every((w) => Math.abs(w - widths[0]) < 0.5) &&
      colors.every((c) => c.hex === colors[0].hex && Math.abs(c.a - colors[0].a) < 0.02) &&
      styles.every((s) => s === styles[0]);
    const radii = ["TopLeft", "TopRight", "BottomRight", "BottomLeft"].map(
      (c) => parseFloat(cs[`border${c}Radius`]) || 0,
    );
    const fill = rgba(cs.backgroundColor);
    const shadow = parseShadow(cs.boxShadow);
    const hasBgImage = cs.backgroundImage && cs.backgroundImage !== "none";
    const matrix = cs.transform && cs.transform !== "none" ? cs.transform.match(/matrix\(([^)]+)\)/) : null;
    const skewed = matrix ? matrix[1].split(",").map(Number).slice(1, 3).some((v) => Math.abs(v) > 1e-3) : false;
    const rotated = (cs.rotate && cs.rotate !== "none") || skewed || (cs.transform && cs.transform.startsWith("matrix3d"));
    const effects =
      (cs.filter && cs.filter !== "none") ||
      (cs.backdropFilter && cs.backdropFilter !== "none") ||
      (cs.mixBlendMode && cs.mixBlendMode !== "normal") ||
      (cs.clipPath && cs.clipPath !== "none") ||
      (cs.maskImage && cs.maskImage !== "none");
    const visible = fill.a > 0 || anyBorder || Boolean(shadow) || hasBgImage;

    let unsupported = null;
    if (hasBgImage) unsupported = "background-image (gradient/url)";
    else if (rotated) unsupported = "rotate/skew transform";
    else if (effects) unsupported = "filter/backdrop-filter/blend/clip/mask";
    else if (anyBorder && !uniformBorder) unsupported = "non-uniform border";
    else if (radii.some((r) => Math.abs(r - radii[0]) > 0.5)) unsupported = "non-uniform border-radius";
    else if (shadow && (shadow.inset || shadow.spread !== 0)) unsupported = "inset/spread box-shadow";

    const radius = Math.min(radii[0], box.w / 2, box.h / 2);
    const kind =
      radius >= Math.min(box.w, box.h) / 2 - 0.5 && Math.abs(box.w - box.h) < 1 ? "ellipse" : radius > 0.5 ? "roundRect" : "rect";

    return {
      visible,
      unsupported,
      box: { x: round(box.x), y: round(box.y), w: round(box.w), h: round(box.h) },
      kind,
      radius: round(radius),
      fill: fill.a > 0 ? fill : null,
      border: anyBorder && uniformBorder ? { width: widths[0], color: colors[0], style: styles[0] } : null,
      shadow: shadow && !shadow.inset ? shadow : null,
      opacity: Number(cs.opacity),
    };
  }

  function hasPaint(el) {
    const tag = el.tagName.toLowerCase();
    if (["svg", "img", "canvas", "video", "picture"].includes(tag)) return true;
    const cs = getComputedStyle(el);
    if (cs.visibility === "hidden" || cs.display === "none") return false;
    if (rgba(cs.backgroundColor).a > 0 || (cs.backgroundImage && cs.backgroundImage !== "none")) return true;
    if (cs.boxShadow && cs.boxShadow !== "none") return true;
    return ["Top", "Right", "Bottom", "Left"].some(
      (s) => (parseFloat(cs[`border${s}Width`]) || 0) > 0 && cs[`border${s}Style`] !== "none" && rgba(cs[`border${s}Color`]).a > 0,
    );
  }

  // ---- text ---------------------------------------------------------------------------------
  function runStyle(parent, pcs, textRoot) {
    const color = rgba(pcs.color);
    let highlight = null;
    if (parent !== textRoot) {
      const bg = rgba(pcs.backgroundColor);
      if (bg.a > 0.5) highlight = bg.hex;
    }
    const decoration = pcs.textDecorationLine || "";
    return {
      family: pcs.fontFamily.split(",")[0].trim().replace(/^["']|["']$/g, ""),
      size: parseFloat(pcs.fontSize),
      weight: Number(pcs.fontWeight) || 400,
      italic: pcs.fontStyle !== "normal",
      color: color.hex,
      alpha: color.a,
      letterSpacing: pcs.letterSpacing === "normal" ? 0 : parseFloat(pcs.letterSpacing) || 0,
      transform: pcs.textTransform,
      underline: decoration.includes("underline"),
      strike: decoration.includes("line-through"),
      highlight,
    };
  }

  function readText(el, cs) {
    const range = document.createRange();
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const lines = [];
    let node;
    while ((node = walker.nextNode())) {
      const parent = node.parentElement;
      if (!parent) continue;
      const pcs = getComputedStyle(parent);
      if (pcs.visibility === "hidden" || pcs.display === "none") continue;
      const style = runStyle(parent, pcs, el);
      const key = JSON.stringify(style);
      const data = node.data;
      for (let i = 0; i < data.length; ) {
        const cp = data.codePointAt(i);
        const len = cp > 0xffff ? 2 : 1;
        range.setStart(node, i);
        range.setEnd(node, i + len);
        const ch = data.slice(i, i + len);
        i += len;
        const rects = range.getClientRects();
        if (!rects.length) continue;
        const rect = rects[0];
        const isSpace = /\s/.test(ch);
        if (isSpace && rect.width === 0) continue;
        const cy = (rect.top + rect.bottom) / 2;
        let line = lines.find((l) => cy > l.top && cy < l.bottom);
        if (!line) {
          line = { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right, chars: [] };
          lines.push(line);
        } else {
          line.top = Math.min(line.top, rect.top);
          line.bottom = Math.max(line.bottom, rect.bottom);
        }
        line.chars.push({ ch: isSpace ? " " : ch, key, style, left: rect.left, right: rect.right });
      }
    }
    lines.sort((a, b) => a.top - b.top);

    const out = [];
    for (const line of lines) {
      while (line.chars.length && line.chars[0].ch === " ") line.chars.shift();
      while (line.chars.length && line.chars[line.chars.length - 1].ch === " ") line.chars.pop();
      if (!line.chars.length) continue;
      const runs = [];
      for (const c of line.chars) {
        const last = runs[runs.length - 1];
        if (last && last.key === c.key) last.text += c.ch;
        else runs.push({ key: c.key, text: c.ch, style: c.style });
      }
      out.push({
        left: Math.min(...line.chars.map((c) => c.left)) - origin.left,
        right: Math.max(...line.chars.map((c) => c.right)) - origin.left,
        top: line.top - origin.top,
        bottom: line.bottom - origin.top,
        center: (line.top + line.bottom) / 2 - origin.top,
        runs: runs.map(({ text, style }) => ({ text, style })),
      });
    }
    if (!out.length) return null;

    const fontSize = parseFloat(cs.fontSize);
    let pitch = cs.lineHeight === "normal" ? fontSize * 1.2 : parseFloat(cs.lineHeight);
    if (out.length > 1) {
      const gaps = out.slice(1).map((line, i) => line.center - out[i].center);
      pitch = gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length;
    }
    const alignMap = { left: "left", start: "left", right: "right", end: "right", center: "center", justify: "justify" };
    const align = alignMap[cs.textAlign] || "left";
    const left = Math.min(...out.map((l) => l.left));
    const right = Math.max(...out.map((l) => l.right));
    const top = out[0].center - pitch / 2;
    const sizes = out.flatMap((l) => l.runs.map((r) => r.style.size));

    return {
      align,
      lineHeight: round(pitch),
      box: { x: round(left), y: round(top), w: round(right - left), h: round(pitch * out.length) },
      ink: {
        x: round(left),
        y: round(Math.min(...out.map((l) => l.top))),
        w: round(right - left),
        h: round(Math.max(...out.map((l) => l.bottom)) - Math.min(...out.map((l) => l.top))),
      },
      lines: out.map((l) => ({
        runs: l.runs,
        left: round(l.left),
        right: round(l.right),
        top: round(l.top),
        bottom: round(l.bottom),
      })),
      minFontSize: Math.min(...sizes),
      maxFontSize: Math.max(...sizes),
      bold: out.every((l) => l.runs.every((r) => r.style.weight >= 600)),
      color: out[0].runs[0].style.color,
      text: out.map((l) => l.runs.map((r) => r.text).join("")).join(" "),
    };
  }

  // ---- resolve roles in document (= paint) order -------------------------------------------
  root.querySelectorAll("[data-pptx-as]").forEach((el) => el.removeAttribute("data-pptx-as"));
  const marked = Array.from(root.querySelectorAll("[data-pptx]"));
  const atomic = [];
  const items = [];
  let imageIndex = 0;

  for (const el of marked) {
    if (atomic.some((owner) => owner.contains(el))) continue;
    const role = el.getAttribute("data-pptx");
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden" || Number(cs.opacity) === 0) {
      el.setAttribute("data-pptx-as", "skip");
      continue;
    }

    if (role === "image") {
      atomic.push(el);
      el.setAttribute("data-pptx-as", "image");
      const bleed = Number(el.getAttribute("data-pptx-bleed")) || 0;
      items.push({ kind: "image", index: imageIndex++, box: rel(el.getBoundingClientRect()), bleed, element: describe(el) });
      continue;
    }

    if (role === "shape") {
      const shape = readBox(el, cs);
      if (shape.unsupported) {
        atomic.push(el);
        el.setAttribute("data-pptx-as", "image");
        items.push({ kind: "image", index: imageIndex++, box: shape.box, bleed: 0, element: describe(el) });
        add("shape-fallback", el, `Shape uses ${shape.unsupported}; exported as a picture (not editable).`);
        if (el.querySelector('[data-pptx="text"]')) {
          add("text-in-picture", el, "Text inside this shape is flattened into the picture and is not editable.");
        }
        continue;
      }
      el.setAttribute("data-pptx-as", "shape");
      if (shape.visible) items.push({ kind: "shape", shape, element: describe(el) });
      // Unmarked painted descendants stay in the background image, i.e. *under* this native shape.
      const painted = Array.from(el.querySelectorAll("*")).filter(
        (child) => !child.hasAttribute("data-pptx") && child.closest("[data-pptx]") === el && hasPaint(child),
      );
      if (painted.length) {
        add("shape-covers-content", el, `${painted.length} unmarked painted child element(s) will sit under the native shape. Wrap them in <Visual> or <Shape>.`);
      }
      continue;
    }

    if (role === "text") {
      atomic.push(el);
      el.setAttribute("data-pptx-as", "text");
      const box = readBox(el, cs);
      if (box.visible) {
        if (box.unsupported) add("text-box-style", el, `Text box styling uses ${box.unsupported}; wrap the text in a <Shape> or <Visual> instead.`);
        else items.push({ kind: "shape", shape: box, element: describe(el), fromText: true });
      }
      if (el.querySelector("svg, img, canvas, video")) {
        add("graphic-in-text", el, "Inline graphic inside <Text> is hidden in the export. Move it outside <Text> or into a <Visual>.");
      }
      const text = readText(el, cs);
      if (!text) continue;
      items.push({ kind: "text", text, element: describe(el) });

      const content = rel(el.getBoundingClientRect());
      if (text.box.x < -0.5 || text.box.y < -0.5 || text.box.x + text.box.w > W + 0.5 || text.box.y + text.box.h > H + 0.5) {
        add("off-canvas", el, "Text extends beyond the slide edge.");
      } else if (
        text.ink.x < safeArea - 1 ||
        text.ink.y < safeArea - 1 ||
        text.ink.x + text.ink.w > W - safeArea + 1 ||
        text.ink.y + text.ink.h > H - safeArea + 1
      ) {
        add("safe-area", el, `Text leaves the ${safeArea}px safe area.`);
      }
      if (text.ink.x + text.ink.w > content.x + content.w + 1.5 || text.ink.y + text.ink.h > content.y + content.h + 1.5) {
        add("overflow", el, "Text overflows its own box.");
      }
      let clipper = el.parentElement;
      while (clipper && clipper !== root.parentElement) {
        const ccs = getComputedStyle(clipper);
        if (clipper !== root && /(hidden|clip|scroll|auto)/.test(ccs.overflow)) {
          const c = rel(clipper.getBoundingClientRect());
          if (text.ink.x < c.x - 1 || text.ink.y < c.y - 1 || text.ink.x + text.ink.w > c.x + c.w + 1 || text.ink.y + text.ink.h > c.y + c.h + 1) {
            add("clipped", el, `Text is clipped by an overflow:${ccs.overflow} ancestor.`);
          }
          break;
        }
        clipper = clipper.parentElement;
      }
      if (text.minFontSize < minFontPx) {
        add("font-size", el, `Font size ${text.minFontSize}px (${text.minFontSize / 2}pt) is below the ${minFontPx}px minimum.`, {
          fontSize: text.minFontSize,
        });
      }
    }
  }

  // ---- slide-level checks ---------------------------------------------------------------------
  const textItems = items.filter((item) => item.kind === "text");
  for (let i = 0; i < textItems.length; i++) {
    for (let j = i + 1; j < textItems.length; j++) {
      const a = textItems[i].text.ink;
      const b = textItems[j].text.ink;
      const ix = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
      const iy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
      if (ix > 2 && iy > 2) {
        findings.push({
          type: "text-overlap",
          element: `${textItems[i].element} ↔ ${textItems[j].element}`,
          message: "Two text boxes overlap.",
        });
      }
    }
  }

  const unmarked = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let textNode;
  while ((textNode = walker.nextNode())) {
    if (!textNode.data.trim()) continue;
    const parent = textNode.parentElement;
    if (!parent || parent.closest('[data-pptx-as="text"], [data-pptx-as="image"], [data-pptx-as="skip"]')) continue;
    const pcs = getComputedStyle(parent);
    if (pcs.visibility === "hidden" || pcs.display === "none") continue;
    unmarked.push(parent);
  }
  for (const el of new Set(unmarked)) {
    add("unmarked-text", el, "Text is not inside <Text>; it is baked into the background and not editable.");
  }

  // Words on the slide, excluding repeated chrome (footers, page numbers) marked data-qa="chrome".
  let words = 0;
  const wordWalker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let wordNode;
  while ((wordNode = wordWalker.nextNode())) {
    const parent = wordNode.parentElement;
    if (!parent || parent.closest('[data-qa="chrome"]')) continue;
    const pcs = getComputedStyle(parent);
    if (pcs.visibility === "hidden" || pcs.display === "none") continue;
    words += wordNode.data.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
  }

  return {
    size: { w: W, h: H },
    items,
    images: items.filter((item) => item.kind === "image"),
    findings,
    stats: {
      words,
      textBoxes: textItems.length,
      shapes: items.filter((item) => item.kind === "shape").length,
      images: imageIndex,
    },
  };
}
