# Aturan desain slide (kanvas 1920×1080)

Disarikan dari `better-layout`, `better-typography`, `better-colors`, `better-ui`, `critique-*`, dan `emil-design-eng`.
Aturan web-only (hover, breakpoint, scroll, touch target) **tidak berlaku** di kanvas slide.

## 1. Kanvas & grid

- **Safe area 96 px** dari setiap tepi untuk semua teks. Hanya dekorasi/visual full-bleed yang boleh melewatinya.
- **Grid 12 kolom**: lebar konten 1728 px, gutter 24 px, sehingga satu kolom ≈ 122 px. Rentang umum: 4/8, 5/7, 6/6, dan 3×4.
- **Skala spasi (kelipatan 8):** 8 · 16 · 24 · 32 · 48 · 64 · 96. Jarak di dalam grup lebih kecil daripada jarak antargrup
  (proximity). Contohnya 12–16 px antara judul kartu dan isinya, tetapi 48–64 px antarbagian.
- Elemen berulang (eyebrow, judul, footer, nomor halaman) **berada di posisi yang sama** di setiap slide.
  Contohnya eyebrow di `top: 96px` dan footer pada baseline `bottom: 96px`.
- Semua tepi kiri teks dalam satu kolom harus sejajar. Hindari offset 2–4 px yang terlihat seperti kesalahan.

## 2. Hierarki & komposisi

- **Satu titik fokus per slide.** Dalam 3 detik penonton harus tahu apa yang dibaca pertama.
  Urutan baca: judul, lalu visual utama, lalu pendukung, lalu catatan kecil.
- Kontras hierarki minimal 1,5× ukuran antarlevel (contohnya 64 lalu 40 lalu 28), atau beda weight dan warna yang jelas.
- Ruang kosong itu fitur. Lebih baik satu ide besar di ruang lapang daripada lima ide yang sesak.
- Resep arketipe:

| Arketipe | Resep tata letak |
|---|---|
| cover | Judul display di 1/3 atas atau kiri, subjudul di bawahnya, satu visual/motif kuat. Tanpa footer |
| konsep | Judul takeaway, lalu satu diagram atau 2–3 blok yang hubungannya terlihat (bukan sekadar 3 kartu identik) |
| proses | Urutan kiri ke kanan atau atas ke bawah dengan penomoran dan konektor eksplisit. Maksimal 5–6 langkah |
| perbandingan | Dua kolom simetris dengan atribut yang sama di baris yang sama. Satu sisi boleh disorot |
| data | Satu grafik besar (≥ 60% area), label langsung, dan judul berupa kesimpulan dari data |
| kutipan | Kutipan 48–64 px, atribusi jelas, banyak ruang kosong. Hanya kutipan dari sumber |
| penutup | Ringkasan 3 poin atau satu ajakan tindakan, dengan motif cover sebagai bookend |

## 3. Tipografi

| Peran | px | pt | Weight | Line-height |
|---|---|---|---|---|
| Display (cover) | 96–128 | 48–64 | 600 | 1.0–1.05 |
| Judul slide | 60–72 | 30–36 | 600 | 1.05–1.15 |
| Lead / subjudul | 40–44 | 20–22 | 400 | 1.2–1.3 |
| Isi | 28–36 | 14–18 | 400 | 1.3–1.4 |
| Label / caption | 24–26 | 12–13 | 400–600 | 1.2–1.25 |

- **Minimum mutlak 24 px (12 pt).** QA menandai ukuran di bawahnya.
- Maksimal **2 family**: satu untuk teks (misalnya Bahnschrift atau Segoe UI) dan satu aksen mono
  (Cascadia Mono atau JetBrains Mono) untuk label, kode, dan ID. Pakai hanya weight yang ada di `export-contract.md`.
- Panjang baris isi ≤ 60 karakter. Judul ≤ 2 baris dengan `text-balance`, isi dengan `text-pretty`
  (hindari satu kata tertinggal sendirian).
- Label huruf kapital: pendek (≤ 4 kata) dengan tracking +0.08–0.14em. Huruf kapital tidak dipakai untuk kalimat.
- Angka yang dibandingkan memakai `tabular-nums`. Jangan memakai teks rata kanan-kiri (justify).

## 4. Warna

- Palet berbasis **peran**: `bg`, `surface`, `line`, `text`, `muted`, `accent`, dan status bila perlu. Komponen hanya memakai peran,
  tidak memakai hex acak.
- Komposisi kira-kira 60% latar, 30% permukaan/teks, 10% aksen. **Satu aksen utama** untuk penekanan per slide.
- Kontras: teks isi ≥ **4,5:1**, teks ≥ 48 px (atau bold ≥ 37 px) ≥ **3:1**, dan garis/elemen grafik bermakna ≥ **3:1**.
  QA mengukur kontras terhadap piksel latar sebenarnya.
- Makna tidak boleh hanya lewat warna. Tambahkan label, ikon, posisi, atau pola (contohnya Low/Medium/High di sel matriks).
- Proyektor menurunkan kontras, jadi hindari teks abu-abu tipis di atas latar menengah. Tema gelap dan terang sama-sama boleh,
  asalkan konsisten.

## 5. Detail polish (better-ui)

- **Radius konsentris:** radius dalam = radius luar − padding. Gunakan satu skala radius (misalnya 0, 8, 16).
- Ketebalan stroke konsisten (garis struktur 2 px, dekorasi 1–1,5 px). Ikon dalam satu set memakai stroke dan sudut yang sama.
- Bayangan dipakai hemat. Di tema gelap, lebih baik bedakan permukaan dengan warna `surface` dan border daripada dengan bayangan.
- Optical alignment: angka besar dan ikon sering perlu digeser 1–4 px supaya tampak sejajar. Periksa di screenshot.
- Konektor dan panah menyentuh target dengan jelas, tidak mengambang 10 px di dekatnya.

## 6. Ikon & ilustrasi (wajib)

Slide yang hanya berisi teks dan kotak terasa kering. Setiap slide butuh visual yang **menjelaskan**, bukan sekadar menghias.

- **Ikon:** satu set untuk seluruh deck (Lucide lewat `<Icon>`), dengan stroke 2,5 px konstan.
  - Ukuran: 44–48 px di kartu, 32–36 px di daftar, 56–64 px untuk ikon tunggal yang menjadi fokus.
  - Setiap item konsep (kartu, langkah proses, poin daftar, suku persamaan) mendapat ikon yang maknanya spesifik.
    Contoh: `EyeOff` untuk confidentiality, bukan `Star` generik.
  - Warna memakai peran `line`/cyan. Aksen hanya untuk item yang disorot. Jangan mencampur ikon outline dan filled.
- **Ilustrasi:** wajib di cover dan di setiap slide konsep/proses/perbandingan, kecuali jika diagram atau grafik besar sudah
  menjadi visual utamanya. Sumbernya unDraw (skill `ideagram`), yang **di-recolor ke palet deck**. Jangan menggambar orang
  sendiri dengan SVG primitif.
  - Tema gelap: `scripts/recolor-illustration.py --mode outline` (gaya gambar teknik) atau `--mode tonal`.
  - Tema terang: cukup ganti aksen `#6c63ff` dengan warna brand (`recolor_undraw.py --accent`).
- **Penempatan:** pahlawan visual di cover (≥ 40% lebar), atau di kanan atas sejajar judul (sekitar 400×270 px)
  untuk slide isi. Jangan menaruh ilustrasi di belakang teks, dan jangan sampai bertabrakan dengan judul.
- **Konsistensi:** satu perlakuan ilustrasi untuk seluruh deck (mode, ketebalan garis, peran warna yang sama).
  Pilih kandidat lewat `scripts/contact-sheet.mjs` di atas warna latar deck.
- Hindari klise stok: hacker berhoodie, hujan biner, gembok melayang, dan robot, kecuali diminta brief.

## 7. Motion (hanya mode presentasi di studio)

- Ekspor selalu statis dan lengkap. Animasi tidak boleh menyembunyikan informasi di PDF/PPTX.
- Gunakan `step` untuk urutan masuk: judul, lalu visual, lalu detail. Stagger 60 ms, durasi 200–480 ms, ease-out.
- Hanya `opacity` dan `translate`. Jangan bounce atau efek dekoratif. `prefers-reduced-motion` diubah menjadi fade singkat
  (sudah diatur di `index.css`).

## 8. Kompatibilitas ekspor (ringkas)

- Lakukan: setiap kata di `<Text>`, kartu/sel/badge dengan `<Shape>` berwarna solid, ikon dengan `<Icon>`,
  ilustrasi dengan `<Illustration>`, dan diagram dengan `<Visual>` serta label sebagai `<Text>` di atasnya.
- Jangan: gradient/blur/glass pada `<Shape>` (akan menjadi gambar), teks di atas foto tanpa scrim, gradient text,
  text-shadow pada isi, atau teks yang saling bertumpuk.
- Detail lengkap ada di `export-contract.md`.
