#!/usr/bin/env python3
"""Re-tone an unDraw-style SVG illustration to a deck palette (works on dark backgrounds).

Usage:
  python scripts/recolor-illustration.py IN.svg --out OUT.svg [--mode outline|tonal]
         [--bg #0A1A2B] [--line #7CC4FF] [--accent #FFB547] [--stroke 1.6]

unDraw art is built for white pages: near-black ink, light-grey panels, skin tones and one
#6c63ff accent. On a dark slide the ink disappears and the panels glare. This script classifies
every fill/stroke colour and maps it onto a ramp between the slide background and the line colour:

  light panels → barely lifted surface · mid greys → mid tone · skin → soft tone
  dark ink (hair, clothes, devices) → strongest tone · #6c63ff accent → --accent

mode=tonal    flat monochrome blueprint tones (keeps unDraw's soft shading overlays)
mode=outline  same tones plus a thin non-scaling outline on every shape, like a technical drawing;
              shading overlays are dropped so the line work stays clean.

Only use illustrations you are licensed to use (unDraw: free, no attribution, no redistribution
as a collection). Keep the originals in ~/.ideagram/undraw and commit only the recoloured copies
your deck needs.
"""
from __future__ import annotations

import argparse
import colorsys
import re
import sys
import xml.etree.ElementTree as ET

SVG_NS = "http://www.w3.org/2000/svg"
ET.register_namespace("", SVG_NS)
ET.register_namespace("xlink", "http://www.w3.org/1999/xlink")
SHAPES = {"path", "circle", "ellipse", "rect", "polygon", "polyline", "line"}
HEX = re.compile(r"^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$")
NAMED = {"white": "#ffffff", "black": "#000000"}

# Tone strength (0 = background, 1 = line colour) per colour class.
TONES = {"light": 0.07, "midlight": 0.16, "skin": 0.22, "middark": 0.34, "dark": 0.46, "accent2": 0.6}


def parse_hex(value: str) -> tuple[float, float, float] | None:
    value = NAMED.get(value.strip().lower(), value.strip())
    if not HEX.match(value):
        return None
    h = value[1:]
    if len(h) == 3:
        h = "".join(c * 2 for c in h)
    return tuple(int(h[i : i + 2], 16) / 255 for i in (0, 2, 4))  # type: ignore[return-value]


def to_hex(rgb: tuple[float, float, float]) -> str:
    return "#" + "".join(f"{round(max(0, min(1, c)) * 255):02X}" for c in rgb)


def mix(a: tuple[float, float, float], b: tuple[float, float, float], t: float) -> tuple[float, float, float]:
    return tuple(x + (y - x) * t for x, y in zip(a, b))  # type: ignore[return-value]


def classify(rgb: tuple[float, float, float]) -> str:
    h, l, s = colorsys.rgb_to_hls(*rgb)
    hue = h * 360
    if s > 0.45 and 225 <= hue <= 265 and 0.35 <= l <= 0.8:
        return "accent"
    if s > 0.35 and (hue <= 45 or hue >= 330) and 0.35 <= l <= 0.9:
        return "skin"
    if s > 0.35 and l > 0.3:
        return "accent2"  # unDraw's occasional green/pink/yellow secondary accents
    if l > 0.86:
        return "light"
    if l > 0.55:
        return "midlight"
    if l > 0.26:
        return "middark"
    return "dark"


def style_map(element: ET.Element) -> dict[str, str]:
    raw = element.get("style", "")
    return {k.strip(): v.strip() for k, v in (p.split(":", 1) for p in raw.split(";") if ":" in p)}


def get_paint(element: ET.Element, prop: str) -> str | None:
    return style_map(element).get(prop) or element.get(prop)


def set_paint(element: ET.Element, prop: str, value: str) -> None:
    styles = style_map(element)
    if prop in styles:
        styles[prop] = value
        element.set("style", ";".join(f"{k}:{v}" for k, v in styles.items()))
    else:
        element.set(prop, value)


def is_overlay(element: ET.Element) -> bool:
    """unDraw shades with semi-transparent black/white shapes on top of base fills."""
    for prop in ("opacity", "fill-opacity"):
        value = get_paint(element, prop)
        if value:
            try:
                if float(value) < 0.6:
                    return True
            except ValueError:
                pass
    return False


def recolor(svg_text: str, mode: str, bg: str, line: str, accent: str, stroke: float) -> tuple[str, dict[str, int]]:
    root = ET.fromstring(svg_text)
    bg_rgb, line_rgb, accent_rgb = parse_hex(bg), parse_hex(line), parse_hex(accent)
    assert bg_rgb and line_rgb and accent_rgb, "bg/line/accent must be hex colours"
    counts: dict[str, int] = {}

    def tone(kind: str) -> str:
        if kind == "accent":
            return to_hex(mix(bg_rgb, accent_rgb, 0.78))
        return to_hex(mix(bg_rgb, line_rgb, TONES[kind]))

    for element in root.iter():
        tag = element.tag.split("}")[-1]
        if tag not in SHAPES:
            continue
        overlay = is_overlay(element)
        if overlay and mode == "outline":
            element.set("display", "none")
            counts["overlay-dropped"] = counts.get("overlay-dropped", 0) + 1
            continue

        fill = get_paint(element, "fill")
        kind = None
        if fill is None and tag not in {"line", "polyline"}:
            fill = "#000000"  # SVG default fill is black
        rgb = parse_hex(fill) if fill and fill != "none" else None
        if rgb is not None:
            kind = classify(rgb)
            counts[kind] = counts.get(kind, 0) + 1
            if overlay:
                continue  # tonal mode keeps unDraw's shading overlays untouched
            set_paint(element, "fill", tone(kind))

        stroke_value = get_paint(element, "stroke")
        stroke_rgb = parse_hex(stroke_value) if stroke_value and stroke_value != "none" else None
        if stroke_rgb is not None:
            set_paint(element, "stroke", accent if classify(stroke_rgb) == "accent" else line)

        if mode == "outline" and rgb is not None:
            element.set("stroke", accent if kind == "accent" else line)
            element.set("stroke-width", f"{stroke}")
            element.set("stroke-linejoin", "round")
            element.set("stroke-opacity", "0.9")
            element.set("vector-effect", "non-scaling-stroke")

    return ET.tostring(root, encoding="unicode"), counts


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("source")
    parser.add_argument("--out", required=True)
    parser.add_argument("--mode", choices=["outline", "tonal"], default="outline")
    parser.add_argument("--bg", default="#0A1A2B")
    parser.add_argument("--line", default="#7CC4FF")
    parser.add_argument("--accent", default="#FFB547")
    parser.add_argument("--stroke", type=float, default=1.6, help="outline width in screen px (non-scaling)")
    args = parser.parse_args()

    with open(args.source, encoding="utf-8") as handle:
        text = handle.read()
    result, counts = recolor(text, args.mode, args.bg, args.line, args.accent, args.stroke)
    with open(args.out, "w", encoding="utf-8") as handle:
        handle.write(result)
    summary = ", ".join(f"{k} {v}" for k, v in sorted(counts.items()))
    print(f"{args.source} -> {args.out} [{args.mode}] {summary}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
