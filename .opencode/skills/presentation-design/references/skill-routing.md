# Routing skill per fase

Muat skill dengan tool `skill` **hanya saat fasenya membutuhkan**, maksimal 2–3 skill per fase. Skill UI/UX
umumnya ditulis untuk web, jadi ambil prinsipnya dan buang mekanisme web-only (hover, breakpoint, scroll,
form, touch target, web font).

**Prioritas jika aturan bertentangan:** brief pengguna, lalu template/brand, lalu kebutuhan audiens dan medium
(proyektor, PDF, PowerPoint), lalu prinsip desain, lalu preferensi gaya.
Contohnya, "hindari font umum" kalah oleh "PowerPoint hanya bisa memakai font terpasang", dan "selalu beri animasi"
kalah oleh "ekspor harus statis dan lengkap".

| Fase | Skill yang dimuat | Untuk apa | Jangan ambil |
|---|---|---|---|
| 1. Brief & sumber | `firecrawl-parse` (PDF/DOCX lokal), `officecli` (inspeksi .pptx), `firecrawl-scrape` (URL dari brief) | Mengekstrak isi sumber dengan akurat | Riset tambahan di luar sumber tanpa izin |
| 2. Alur cerita | `better-writing`, `critique-information-density` | Judul takeaway, kalimat ringkas, batas kepadatan | Aturan microcopy tombol/form |
| 3. Sistem visual | `better-colors`, `better-typography`; `tastemaker` atau `impeccable` hanya jika tidak ada brand | Palet berbasis peran, skala tipe, arah visual, serta penetapan set ikon dan perlakuan ilustrasi | Web font, skala tipe responsif, token CSS untuk web |
| 4. 3 slide contoh | `better-layout`, `ideagram` (ilustrasi unDraw); `data-visualization` jika ada data | Grid, komposisi, ilustrasi dan ikon pada setiap slide contoh | Pola landing page (hero, CTA berulang); menggambar orang dari primitif SVG |
| 5. Produksi | `better-layout`, `ideagram`; `data-visualization` atau `academic-plotting` untuk grafik | Konsistensi antar-slide, ikon per item, ilustrasi per slide konsep, grafik jujur | Ilustrasi dekoratif tanpa hubungan dengan pesan slide |
| 6. Polish | `better-ui` (setara *make-interfaces-feel-better*), `no-ai-design-slop`; `emil-design-eng` untuk motion mode presentasi | Radius konsentris, optical alignment, ketebalan stroke, membuang klise | Efek hover/press pada kanvas slide |
| 7. Review & QA | `critique-visual-hierarchy`, `critique-composition`; `critique-typography`/`critique-color` jika ada temuan terkait; `critique-brand-consistency` jika ada brand | Kritik berbasis screenshot dengan rujukan slide + elemen | Saran redesain total tanpa dasar temuan |
| 8. Ekspor & verifikasi | (tanpa skill) `npm run export`; `officecli` untuk memeriksa isi PPTX jika ada keanehan | Bukti PPTX/PDF sesuai desain | Mengedit PPTX manual (perbaiki di React lalu ekspor ulang) |
| 9. Studio UI QA | `playwright-cli`, `fixing-accessibility`, `react-doctor`; `shadcn` saat menambah komponen studio; `12-principles-of-animation` saat mengubah animasi | Navigasi keyboard, label, fokus, kualitas React | Mengubah kanvas slide demi skor lint |

## Kapan skill tambahan relevan

- `landing-page-design`: hanya untuk pitch/penjualan, untuk struktur argumen masalah → solusi → bukti → ajakan.
  Bukan untuk visualnya.
- `animate`, `review-animations`: jika pengguna meminta animasi presentasi yang lebih kaya. Animasi tetap tidak boleh
  menyembunyikan isi di ekspor statis.
- `frontend-design`, `21st-ui-build`: untuk komponen studio baru, bukan untuk slide.
- `brainstorming`: jika pengguna belum tahu arah atau tujuan presentasinya.

## Catatan

- `make-interfaces-feel-better` (Jakub Krehel) tidak terpasang sebagai skill terpisah. Isinya dicakup oleh
  `better-ui` dan keluarga `better-*`.
- Referensi di folder skill ini (`slide-design-rules.md`, `content-and-data-rules.md`, `quality-checklist.md`) adalah
  ringkasan siap pakai. Muat skill sumbernya hanya jika butuh detail lebih.
