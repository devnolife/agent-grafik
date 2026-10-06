#!/usr/bin/env python3
"""
Trace AI-generated pictograms (dark glyph on a light background) into one-colour SVG icons.

    python3 scripts/trace-icon.py OUT.svg CANDIDATE.png [CANDIDATE.png ...]

Every candidate is scored (flat ink, sensible coverage, few specks, no frame); the best one is
traced with OpenCV, simplified, smoothed (sharp corners kept) and written with
fill="currentColor", so the slide decides the colour. Prints one JSON line with the verdict.
"""
import json
import math
import sys

import cv2
import numpy as np

cv2.setNumThreads(1)  # tiny images; idle worker threads only burn CPU on a shared server

WORK = 512  # tracing resolution of the cropped glyph
VIEW = 96  # viewBox size of the SVG
MARGIN = 0.08  # empty border around the glyph, as a fraction of the viewBox
CORNER_DEG = 50  # turns sharper than this stay sharp corners


def ink_mask(gray, level):
    mask = (gray < level).astype(np.uint8)
    count, labels, stats, _ = cv2.connectedComponentsWithStats(mask, connectivity=8)
    min_area = max(12, int(gray.size * 0.00015))
    keep = np.zeros(count, dtype=bool)
    keep[1:] = stats[1:, cv2.CC_STAT_AREA] >= min_area
    return keep[labels].astype(np.uint8), int(keep.sum())


def score(path):
    image = cv2.imread(path, cv2.IMREAD_GRAYSCALE)
    if image is None:
        return {"file": path, "ok": False, "reason": "tidak terbaca"}
    gray = cv2.GaussianBlur(image, (0, 0), 0.8)
    level, _ = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    level = float(min(max(level, 90), 190))
    mask, parts = ink_mask(gray, level)
    height, width = mask.shape
    ink = float(mask.mean())
    result = {"file": path, "level": level, "ink": round(ink, 4), "parts": parts}

    if ink < 0.008:
        return {**result, "ok": False, "reason": "kosong"}
    if ink > 0.45:
        return {**result, "ok": False, "reason": "terlalu banyak tinta (latar tidak putih?)"}
    ys, xs = np.nonzero(mask)
    x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max()
    edge = 0.015
    if x0 < width * edge or y0 < height * edge or x1 > width * (1 - edge) or y1 > height * (1 - edge):
        return {**result, "ok": False, "reason": "menyentuh tepi (ada bingkai?)"}
    if parts > 24:
        return {**result, "ok": False, "reason": f"terlalu banyak bagian ({parts})"}

    # Flat glyphs have almost no mid-tones; gradients and shading do.
    region = image[y0 : y1 + 1, x0 : x1 + 1]
    mid = float(((region > 70) & (region < 185)).mean())
    penalty = mid * 4 + max(0, parts - 6) * 0.04 + abs(ink - 0.12) * 0.5
    return {**result, "ok": True, "mid": round(mid, 4), "penalty": round(penalty, 4), "box": [int(x0), int(y0), int(x1), int(y1)]}


def crop_square(image, box):
    x0, y0, x1, y1 = box
    side = max(x1 - x0, y1 - y0) + 1
    side = int(math.ceil(side / (1 - 2 * MARGIN)))
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    left, top = int(round(cx - side / 2)), int(round(cy - side / 2))
    canvas = np.full((side, side), 255, dtype=np.uint8)
    sx0, sy0 = max(left, 0), max(top, 0)
    sx1, sy1 = min(left + side, image.shape[1]), min(top + side, image.shape[0])
    canvas[sy0 - top : sy1 - top, sx0 - left : sx1 - left] = image[sy0:sy1, sx0:sx1]
    return canvas


def fmt(value):
    text = f"{value:.2f}".rstrip("0").rstrip(".")
    return "0" if text in ("-0", "") else text


def smooth_path(points):
    """Closed path through edge midpoints: quadratic curves on gentle turns, straight joins on corners."""
    count = len(points)
    if count < 3:
        return ""
    mids = [((points[i][0] + points[(i + 1) % count][0]) / 2, (points[i][1] + points[(i + 1) % count][1]) / 2) for i in range(count)]
    out = [f"M{fmt(mids[-1][0])} {fmt(mids[-1][1])}"]
    for i in range(count):
        prev, here, nxt = points[i - 1], points[i], points[(i + 1) % count]
        a = math.atan2(here[1] - prev[1], here[0] - prev[0])
        b = math.atan2(nxt[1] - here[1], nxt[0] - here[0])
        turn = abs((math.degrees(b - a) + 180) % 360 - 180)
        end = mids[i]
        if turn > CORNER_DEG:
            out.append(f"L{fmt(here[0])} {fmt(here[1])}L{fmt(end[0])} {fmt(end[1])}")
        else:
            out.append(f"Q{fmt(here[0])} {fmt(here[1])} {fmt(end[0])} {fmt(end[1])}")
    out.append("Z")
    return "".join(out)


def trace(path, box):
    image = cv2.imread(path, cv2.IMREAD_GRAYSCALE)
    square = crop_square(image, box)
    interpolation = cv2.INTER_AREA if square.shape[0] > WORK else cv2.INTER_CUBIC
    work = cv2.resize(square, (WORK, WORK), interpolation=interpolation)
    work = cv2.GaussianBlur(work, (0, 0), 1.4)
    level, _ = cv2.threshold(work, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    _, binary = cv2.threshold(work, min(max(level, 90), 190), 255, cv2.THRESH_BINARY_INV)

    contours, _ = cv2.findContours(binary, cv2.RETR_TREE, cv2.CHAIN_APPROX_NONE)
    scale = VIEW / WORK
    parts = []
    for contour in contours:
        if abs(cv2.contourArea(contour)) < 24:
            continue
        simple = cv2.approxPolyDP(contour, 0.9, True).reshape(-1, 2)
        points = [(float(x + 0.5) * scale, float(y + 0.5) * scale) for x, y in simple]
        piece = smooth_path(points)
        if piece:
            parts.append(piece)
    return "".join(parts)


def main():
    if len(sys.argv) < 3:
        print("usage: trace-icon.py OUT.svg CANDIDATE.png [...]", file=sys.stderr)
        sys.exit(2)
    out, candidates = sys.argv[1], sys.argv[2:]
    scored = [score(path) for path in candidates]
    good = sorted((s for s in scored if s["ok"]), key=lambda s: s["penalty"])
    if not good:
        print(json.dumps({"ok": False, "reason": "; ".join(f"{s['file'].rsplit('/', 1)[-1]}: {s['reason']}" for s in scored)}))
        return
    best = good[0]
    d = trace(best["file"], best["box"])
    if not d:
        print(json.dumps({"ok": False, "reason": "kontur kosong"}))
        return
    svg = (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {VIEW} {VIEW}" fill="currentColor" aria-hidden="true">'
        f'<path fill-rule="evenodd" d="{d}"/></svg>\n'
    )
    with open(out, "w", encoding="utf-8") as handle:
        handle.write(svg)
    print(json.dumps({"ok": True, "file": best["file"], "bytes": len(svg), "mid": best["mid"], "ink": best["ink"], "parts": best["parts"]}))


if __name__ == "__main__":
    main()
