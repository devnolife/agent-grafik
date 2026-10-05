#!/usr/bin/env python3
"""Fidelity and design QA for an exported deck.

Usage: python scripts/qa.py output/<slug>

Reads what scripts/export.mjs produced (qa-data.json, browser/, layers/, pptx-render/, <slug>.pdf)
and writes qa-report.md + qa-report.json, pdf-render/*.png and compare/*.png
(browser | PowerPoint | diff) for visual review.
"""
from __future__ import annotations

import json
import sys
from collections import defaultdict
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

try:
    import fitz  # PyMuPDF
except ImportError:  # pragma: no cover
    fitz = None

SIZE = (1920, 1080)
DIFF_THRESHOLD = 48  # max channel delta that counts as a mismatching pixel (half-res compare)
OFFSET_MARGIN = 20  # px searched around each text box when measuring PPTX text drift
WORD_BUDGET = {"cover": 40, "konsep": 60, "proses": 70, "perbandingan": 80, "data": 60, "kutipan": 40, "penutup": 40}
DEFAULT_BUDGET = 70
SEVERITY = {
    "off-canvas": "Blocker",
    "clipped": "Blocker",
    "overflow": "Major",
    "unmarked-text": "Major",
    "graphic-in-text": "Major",
    "shape-covers-content": "Major",
    "text-in-picture": "Major",
    "font-size": "Major",
    "unknown-font": "Major",
    "text-box-style": "Major",
    "safe-area": "Minor",
    "text-overlap": "Minor",
    "shape-fallback": "Minor",
    "font-weight": "Minor",
}
ORDER = {"Blocker": 0, "Major": 1, "Minor": 2}


def load_rgb(path: Path) -> np.ndarray | None:
    if not path.exists():
        return None
    image = Image.open(path).convert("RGB")
    if image.size != SIZE:
        image = image.resize(SIZE, Image.LANCZOS)
    return np.asarray(image, dtype=np.int16)


def half(image: np.ndarray) -> np.ndarray:
    return image.reshape(SIZE[1] // 2, 2, SIZE[0] // 2, 2, 3).mean(axis=(1, 3))


def mismatch(a: np.ndarray, b: np.ndarray) -> tuple[float, np.ndarray]:
    """Share of pixels that differ, tolerating 1-px anti-aliasing / sub-pixel shifts (half resolution)."""
    ha, hb = half(a), half(b)
    delta = None
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            shifted = np.roll(np.roll(hb, dy, axis=0), dx, axis=1)
            current = np.abs(ha - shifted).max(axis=2)
            delta = current if delta is None else np.minimum(delta, current)
    mask = delta > DIFF_THRESHOLD
    return float(mask.mean() * 100), mask


def luminance(rgb: np.ndarray) -> np.ndarray:
    c = np.asarray(rgb, dtype=float) / 255.0
    c = np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
    return 0.2126 * c[..., 0] + 0.7152 * c[..., 1] + 0.0722 * c[..., 2]


def contrast(l1: float, l2: float) -> float:
    hi, lo = max(l1, l2), min(l1, l2)
    return (hi + 0.05) / (lo + 0.05)


def hex_rgb(value: str) -> np.ndarray:
    return np.array([int(value[i : i + 2], 16) for i in (0, 2, 4)], dtype=float)


def crop(image: np.ndarray, box: dict, margin: int = 0) -> tuple[np.ndarray, tuple[int, int, int, int]]:
    x0 = max(0, int(box["x"]) - margin)
    y0 = max(0, int(box["y"]) - margin)
    x1 = min(SIZE[0], int(box["x"] + box["w"]) + margin + 1)
    y1 = min(SIZE[1], int(box["y"] + box["h"]) + margin + 1)
    return image[y0:y1, x0:x1], (x0, y0, x1, y1)


def text_contrast(no_text: np.ndarray, text: dict) -> dict:
    region, _ = crop(no_text, text["ink"])
    if region.size == 0:
        return {"worst": None, "median": None}
    bg = luminance(region.reshape(-1, 3))
    fg = float(luminance(hex_rgb(text["color"])[None, :])[0])
    lows, mid, highs = np.percentile(bg, [5, 50, 95])
    return {"worst": round(min(contrast(fg, lows), contrast(fg, highs)), 2), "median": round(contrast(fg, mid), 2)}


def best_shift(ref: np.ndarray, test: np.ndarray, limit: int) -> int | None:
    if ref.sum() < 1e-6 or test.sum() < 1e-6:
        return None
    ref = (ref - ref.mean()) / (ref.std() + 1e-9)
    test = (test - test.mean()) / (test.std() + 1e-9)
    scores = []
    for shift in range(-limit, limit + 1):
        a = ref[max(0, -shift) : len(ref) - max(0, shift)]
        b = test[max(0, shift) : len(test) - max(0, -shift)]
        scores.append(float((a * b).mean()))
    return int(np.argmax(scores)) - limit


def text_offset(browser: np.ndarray, pptx: np.ndarray, no_text: np.ndarray, text: dict) -> tuple[int | None, int | None]:
    ref, _ = crop(browser, text["ink"], OFFSET_MARGIN)
    test, _ = crop(pptx, text["ink"], OFFSET_MARGIN)
    bg, _ = crop(no_text, text["ink"], OFFSET_MARGIN)
    if ref.shape != test.shape or ref.size == 0:
        return None, None
    base = np.median(bg.reshape(-1, 3), axis=0)
    ink_ref = np.abs(ref - base).sum(axis=2)
    ink_test = np.abs(test - base).sum(axis=2)
    limit = min(OFFSET_MARGIN, ref.shape[0] // 3, ref.shape[1] // 3)
    return best_shift(ink_ref.sum(axis=1), ink_test.sum(axis=1), limit), best_shift(ink_ref.sum(axis=0), ink_test.sum(axis=0), limit)


def render_pdf(pdf: Path, out_dir: Path) -> list[Path]:
    if fitz is None or not pdf.exists():
        return []
    out_dir.mkdir(parents=True, exist_ok=True)
    files = []
    with fitz.open(pdf) as document:
        for number, page in enumerate(document, start=1):
            zoom = SIZE[0] / page.rect.width
            pixmap = page.get_pixmap(matrix=fitz.Matrix(zoom, zoom), alpha=False)
            file = out_dir / f"slide-{number:02d}.png"
            pixmap.save(file)
            files.append(file)
    return files


def compare_sheet(browser: np.ndarray, pptx: np.ndarray | None, mask: np.ndarray | None, file: Path) -> None:
    panels = [Image.fromarray(half(browser).astype(np.uint8))]
    labels = ["Browser (desain)"]
    if pptx is not None and mask is not None:
        panels.append(Image.fromarray(half(pptx).astype(np.uint8)))
        heat = (half(browser) * 0.3).astype(np.uint8)
        heat[mask] = [255, 70, 70]
        panels.append(Image.fromarray(heat))
        labels += ["PowerPoint (render)", "Selisih (merah)"]
    sheet = Image.new("RGB", (960 * len(panels) + 16 * (len(panels) - 1), 540 + 36), (18, 18, 20))
    draw = ImageDraw.Draw(sheet)
    for index, (panel, label) in enumerate(zip(panels, labels)):
        x = index * (960 + 16)
        sheet.paste(panel, (x, 36))
        draw.text((x + 4, 10), label, fill=(230, 230, 230))
    file.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(file)


def main(out_dir: Path) -> int:
    data = json.loads((out_dir / "qa-data.json").read_text(encoding="utf-8"))
    deck = data["deck"]
    pdf_pages = render_pdf(out_dir / f"{deck['slug']}.pdf", out_dir / "pdf-render")
    archetypes = {slide["id"]: slide.get("archetype") for slide in deck["slides"]}

    report_slides = []
    drift_by_family: dict[str, list[tuple[float, float]]] = defaultdict(list)

    for slide in data["slides"]:
        number = slide["number"]
        tag = f"{number:02d}"
        browser = load_rgb(out_dir / slide["reference"])
        no_text = load_rgb(out_dir / slide["noText"])
        pptx = load_rgb(out_dir / "pptx-render" / f"slide-{tag}.png")
        pdf = load_rgb(pdf_pages[number - 1]) if number - 1 < len(pdf_pages) else None

        findings = [
            {"severity": SEVERITY.get(f["type"], "Minor"), **f}
            for f in slide["findings"]
        ]

        pptx_diff = pdf_diff = None
        mask = None
        if browser is not None and pptx is not None:
            pptx_diff, mask = mismatch(browser, pptx)
        if browser is not None and pdf is not None:
            pdf_diff, _ = mismatch(browser, pdf)

        texts = [item for item in slide["items"] if item["kind"] == "text"]
        contrasts, offsets = [], []
        for item in texts:
            text = item["text"]
            if no_text is not None:
                result = text_contrast(no_text, text)
                worst = result["worst"]
                if worst is not None:
                    large = text["maxFontSize"] >= 48 or (text["bold"] and text["maxFontSize"] >= 37)
                    need = 3.0 if large else 4.5
                    contrasts.append(worst)
                    if worst < 3.0:
                        findings.append({"severity": "Blocker", "type": "contrast", "element": item["element"], "message": f"Contrast {worst}:1 (needs {need}:1)."})
                    elif worst < need:
                        findings.append({"severity": "Major", "type": "contrast", "element": item["element"], "message": f"Contrast {worst}:1 (needs {need}:1)."})
            if browser is not None and pptx is not None and no_text is not None:
                dy, dx = text_offset(browser, pptx, no_text, text)
                if dy is not None and dx is not None:
                    family = text["lines"][0]["runs"][0]["style"]["family"].lower()
                    offsets.append({"element": item["element"], "dy": dy, "dx": dx, "size": text["maxFontSize"]})
                    drift_by_family[family].append((dy, text["maxFontSize"]))

        budget = WORD_BUDGET.get(archetypes.get(slide["id"]) or "", DEFAULT_BUDGET)
        words = slide["stats"]["words"]
        if slide["stats"]["images"] == 0:
            visual_required = archetypes.get(slide["id"]) in {"cover", "konsep", "proses", "perbandingan"}
            findings.append({
                "severity": "Major" if visual_required else "Minor",
                "type": "no-visual",
                "element": None,
                "message": "No icon or illustration on this slide; add an <Icon>/<Illustration> that explains the content.",
            })
        if words > budget * 1.5:
            findings.append({"severity": "Major", "type": "density", "element": None, "message": f"{words} words; budget for this archetype is {budget}."})
        elif words > budget:
            findings.append({"severity": "Minor", "type": "density", "element": None, "message": f"{words} words; budget for this archetype is {budget}."})

        if pptx_diff is None:
            findings.append({"severity": "Major", "type": "pptx-render-missing", "element": None, "message": "No PowerPoint render to compare (render step failed or was skipped)."})
        elif pptx_diff > 6:
            findings.append({"severity": "Blocker", "type": "pptx-fidelity", "element": None, "message": f"PPTX differs from the browser on {pptx_diff:.2f}% of pixels."})
        elif pptx_diff > 3:
            findings.append({"severity": "Major", "type": "pptx-fidelity", "element": None, "message": f"PPTX differs from the browser on {pptx_diff:.2f}% of pixels."})
        elif pptx_diff > 1:
            findings.append({"severity": "Minor", "type": "pptx-fidelity", "element": None, "message": f"PPTX differs from the browser on {pptx_diff:.2f}% of pixels."})
        if pdf_diff is not None and pdf_diff > 0.5:
            findings.append({"severity": "Major" if pdf_diff <= 2 else "Blocker", "type": "pdf-fidelity", "element": None, "message": f"PDF differs from the browser on {pdf_diff:.2f}% of pixels."})

        for offset in offsets:
            if abs(offset["dy"]) > 6 or abs(offset["dx"]) > 6:
                findings.append({"severity": "Minor", "type": "text-drift", "element": offset["element"], "message": f"PowerPoint text shifted dy={offset['dy']:+d}px dx={offset['dx']:+d}px."})

        if browser is not None:
            compare_sheet(browser, pptx, mask, out_dir / "compare" / f"slide-{tag}.png")

        dys = [o["dy"] for o in offsets]
        dxs = [o["dx"] for o in offsets]
        findings.sort(key=lambda f: ORDER.get(f["severity"], 3))
        report_slides.append(
            {
                "number": number,
                "id": slide["id"],
                "title": slide["title"],
                "archetype": archetypes.get(slide["id"]),
                "words": words,
                "budget": budget,
                "stats": slide["stats"],
                "minContrast": min(contrasts) if contrasts else None,
                "pptxDiff": None if pptx_diff is None else round(pptx_diff, 2),
                "pdfDiff": None if pdf_diff is None else round(pdf_diff, 2),
                "textOffset": {
                    "dyMedian": float(np.median(dys)) if dys else None,
                    "dxMedian": float(np.median(dxs)) if dxs else None,
                    "worst": sorted(offsets, key=lambda o: -max(abs(o["dy"]), abs(o["dx"])))[:3],
                },
                "findings": findings,
            }
        )

    calibration = {}
    for family, values in drift_by_family.items():
        ems = [dy / size for dy, size in values if size]
        if ems:
            median_em = float(np.median(ems))
            calibration[family] = {
                "boxes": len(ems),
                "medianDyPx": float(np.median([dy for dy, _ in values])),
                "medianDyEm": round(median_em, 4),
                "suggestedTextDyEmDelta": round(-median_em, 4),
            }

    counts = {level: sum(1 for s in report_slides for f in s["findings"] if f["severity"] == level) for level in ORDER}
    report = {"deck": deck["slug"], "title": deck["title"], "generatedAt": data["generatedAt"], "counts": counts, "calibration": calibration, "slides": report_slides}
    (out_dir / "qa-report.json").write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
    (out_dir / "qa-report.md").write_text(to_markdown(report), encoding="utf-8")

    print(f"[qa] Blocker {counts['Blocker']} · Major {counts['Major']} · Minor {counts['Minor']}  →  {out_dir / 'qa-report.md'}")
    for s in report_slides:
        print(
            f"[qa] {s['number']:02d} {s['id']:<14} words {s['words']:>3}/{s['budget']:<3} contrast {fmt(s['minContrast'], ':1')}"
            f"  pptx Δ {fmt(s['pptxDiff'], '%')}  pdf Δ {fmt(s['pdfDiff'], '%')}  text dy {fmt(s['textOffset']['dyMedian'], 'px')}"
        )
    return 0


def fmt(value, unit: str) -> str:
    return "–" if value is None else f"{value:g}{unit}"


def to_markdown(report: dict) -> str:
    c = report["counts"]
    lines = [
        f"# QA report: {report['title']} (`{report['deck']}`)",
        "",
        f"Generated {report['generatedAt']} · {len(report['slides'])} slide · **Blocker {c['Blocker']} · Major {c['Major']} · Minor {c['Minor']}**",
        "",
        "| # | Slide | Words / budget | Text · shape · picture | Min contrast | PPTX Δ | PDF Δ | Text dy / dx (median) | Findings |",
        "|---|---|---|---|---|---|---|---|---|",
    ]
    for s in report["slides"]:
        st = s["stats"]
        off = s["textOffset"]
        severities = [f["severity"] for f in s["findings"]]
        summary = ", ".join(f"{severities.count(level)} {level}" for level in ORDER if severities.count(level)) or "–"
        lines.append(
            f"| {s['number']:02d} | {s['id']} | {s['words']} / {s['budget']} | {st['textBoxes']} · {st['shapes']} · {st['images']} | "
            f"{fmt(s['minContrast'], ':1')} | {fmt(s['pptxDiff'], '%')} | {fmt(s['pdfDiff'], '%')} | "
            f"{fmt(off['dyMedian'], 'px')} / {fmt(off['dxMedian'], 'px')} | {summary} |"
        )
    lines += [
        "",
        "Thresholds: PPTX Δ ≤ 1% good, 1–3% Minor, 3–6% Major, > 6% Blocker · PDF Δ ≤ 0.5% · contrast ≥ 4.5:1 (≥ 3:1 for text ≥ 48 px or bold ≥ 37 px).",
        "",
    ]
    if report["calibration"]:
        lines += ["## Text calibration (PowerPoint vs browser)", ""]
        for family, cal in report["calibration"].items():
            lines.append(
                f"- `{family}`: median dy {cal['medianDyPx']:+.1f}px ({cal['medianDyEm']:+.4f} em) over {cal['boxes']} boxes → "
                f"add {cal['suggestedTextDyEmDelta']:+.4f} to `TEXT_DY_EM` in scripts/export.mjs if |dy| > 2px"
            )
        lines.append("")
    lines += ["## Findings", ""]
    for s in report["slides"]:
        lines.append(f"### {s['number']:02d} · {s['id']}: {s['title']}")
        if not s["findings"]:
            lines += ["- No findings.", ""]
            continue
        for f in s["findings"]:
            element = f" {f['element']}" if f.get("element") else ""
            lines.append(f"- **{f['severity']}** `{f['type']}`{element}: {f['message']}")
        lines.append("")
    lines += [
        "## Files for visual review",
        "",
        "- `compare/slide-NN.png`: browser | PowerPoint | diff, side by side",
        "- `browser/`: reference renders · `pptx-render/`: PowerPoint renders · `pdf-render/`: PDF pages",
        "- `layers/`: background, picture and text-less layers used to build the PPTX",
        "",
    ]
    return "\n".join(lines)


if __name__ == "__main__":
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")  # Windows consoles default to cp1252
    if len(sys.argv) != 2:
        print(__doc__)
        sys.exit(2)
    sys.exit(main(Path(sys.argv[1]).resolve()))
