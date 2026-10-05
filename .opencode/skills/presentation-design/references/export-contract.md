# Kontrak ekspor (browser → PPTX hybrid + PDF)

Kanvas setiap slide **1920×1080 px**. PowerPoint memakai `LAYOUT_WIDE` 13,333×7,5 in, sehingga
**1 px = 0,5 pt = 1/144 in**. Contohnya, judul 64 px menjadi 32 pt.

## Primitive dan hasilnya di PowerPoint

| Primitive | Atribut | Hasil di PPTX | Catatan |
|---|---|---|---|
| `<Slide>` / `DeckSlide` | `data-slide` | Akar kanvas | Latar, grid, dan dekorasi tanpa penanda menjadi **gambar latar** slide |
| `<Text>` | `data-pptx="text"` | **Text box native yang dapat diedit** | Baris dipotong persis seperti di browser, satu baris satu paragraf. Run dengan warna/weight/size berbeda tetap terpisah |
| `<Shape>` | `data-pptx="shape"` | **Shape native** (rect, roundRect, ellipse) | Hanya fill solid, border solid/dashed/dotted yang seragam, radius seragam, dan satu `box-shadow` luar tanpa spread |
| `<Visual>` | `data-pptx="image"` | **Picture PNG transparan** (2×) | Semua isinya, termasuk `<Text>` di dalamnya, menjadi gambar. `bleed={px}` memperluas area tangkap untuk glow/bayangan |
| `<Icon icon={X}>` | `<Visual>` + Lucide | **Picture PNG transparan** per ikon | Warna dari `currentColor` (kelas `text-*`), stroke 2,5 px konstan. Berada di atas shape kartu |
| `<Illustration src>` | `<Visual>` + `<img>` | **Picture PNG transparan** | Untuk SVG/PNG ilustrasi yang sudah di-recolor. Ekspor menunggu `img.decode()` |
| `<Step>` | `data-step` | Tidak berpengaruh | Hanya mengatur urutan animasi di mode presentasi |

Urutan tumpukan (z-order) di PPTX: gambar latar, lalu objek native **sesuai urutan DOM** (shape, picture, text).
Teks yang punya latar sendiri (pill/badge) diekspor sebagai shape, lalu teksnya ditaruh di atasnya.

## Fallback otomatis (dilaporkan di QA)

- `Shape` dengan `background-image`/gradient, rotate/skew, filter, backdrop-filter, blend, clip-path, mask,
  border tidak seragam, radius tidak seragam, atau inset/spread shadow **otomatis menjadi picture**
  (`shape-fallback`). Teks di dalamnya ikut menjadi gambar (`text-in-picture`).
- Teks di luar `<Text>` tetap tampil, tetapi menyatu dengan gambar latar (`unmarked-text`).
- Ikon atau SVG di dalam `<Text>` hilang saat ekspor (`graphic-in-text`). Taruh ikon di luar `<Text>` atau di `<Visual>`.
- Elemen ber-paint (latar, border, svg, img) di dalam `<Shape>` yang tidak ditandai akan **tertutup** oleh shape
  native (`shape-covers-content`). Bungkus elemen itu dengan `<Shape>` atau `<Visual>`.

## Font

Hanya font terpasang yang boleh dipakai. Pemetaan weight CSS ke nama face PowerPoint ada di `scripts/lib/fonts.js`:

| Family | Weight yang aman |
|---|---|
| Bahnschrift | 300 Light, 350 SemiLight, 400, 600 SemiBold, 700 Bold |
| Segoe UI | 300, 350, 400, 600, 700, 900 |
| Cascadia Mono / Cascadia Code | 200, 300, 350, 400, 600, 700 |
| JetBrains Mono | 100, 200, 300, 400, 500, 700, 800 |
| Fira Code | 300, 400, 500, 600, 700 |
| Calibri | 300, 400, 700 · Cambria, Consolas, Georgia, Verdana: 400, 700 |

Weight lain akan dibulatkan ke yang terdekat (`font-weight`), dan family lain disubstitusi oleh PowerPoint (`unknown-font`).
Hindari `Segoe UI Variable` dan lebar Bahnschrift Condensed, karena nama face GDI-nya terpotong.
Glyph yang tidak ada di font (emoji, simbol langka) memakai fallback yang berbeda di browser dan PowerPoint, jadi hindari.

## Yang aman dan yang tidak

| Aman | Hindari / perlakukan khusus |
|---|---|
| Layout absolut/flex/grid dalam px | Teks berotasi (rotate tidak didukung untuk teks native) |
| `text-align` left/center/right, `text-wrap: balance/pretty` | `text-align: justify` (menjadi rata kiri di PPTX) |
| `letter-spacing`, `text-transform`, underline, line-through | Gradient text, `text-shadow`, `-webkit-text-stroke` (gunakan `<Visual>`) |
| Warna apa pun termasuk `oklch` (dikonversi ke sRGB) | Teks di atas foto/area ramai tanpa scrim |
| SVG di dalam `<Visual>`; label di atasnya sebagai `<Text>` | `id` SVG duplikat antar-slide; gunakan id unik per slide |
| `opacity` pada shape | Animasi yang mengubah posisi akhir (ekspor memakai state akhir tanpa animasi) |

## Kalibrasi

QA mengukur pergeseran teks PowerPoint terhadap browser (`Text dy / dx`). Jika median |dy| > 2 px untuk satu
family, tambahkan saran `TEXT_DY_EM` dari bagian "Text calibration" laporan ke `scripts/export.mjs`.
Kalibrasi saat ini adalah 0, karena Bahnschrift dan Cascadia Mono terukur ±1 px.
