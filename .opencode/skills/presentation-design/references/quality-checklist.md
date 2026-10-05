# Checklist QA

Jalankan setelah setiap ekspor: `npm run export -- <slug>`, lalu baca `output/<slug>/qa-report.md`, kemudian
lihat `compare/slide-NN.png` (browser | PowerPoint | selisih). Setiap temuan wajib menyebut **nomor slide + elemen**.
Definisi selesai: **0 Blocker, 0 Major**, dan Minor yang tersisa punya alasan tertulis di laporan akhir.

## A. Otomatis (field di qa-report)

| Tipe | Tingkat | Arti | Perbaikan umum |
|---|---|---|---|
| `off-canvas` | Blocker | Teks keluar dari tepi slide | Kurangi teks atau ukuran, atau perbaiki posisi |
| `clipped` | Blocker | Teks terpotong oleh ancestor `overflow:hidden` | Beri ruang, hapus overflow, atau pendekkan teks |
| `contrast` < 3:1 | Blocker | Teks hampir tak terbaca terhadap latar sebenarnya | Ganti peran warna atau beri `surface`/scrim |
| `pptx-fidelity` > 6% | Blocker | PPTX jauh berbeda dari browser | Lihat panel selisih, biasanya fallback atau font |
| `pdf-fidelity` > 2% | Blocker | PDF jauh berbeda dari browser | Efek CSS yang tidak tercetak, ganti dengan `<Visual>` |
| `overflow` | Major | Teks melebihi kotaknya sendiri | Lebarkan kotak, kecilkan teks, atau potong kata |
| `contrast` < target | Major | Di bawah 4,5:1 (atau 3:1 untuk teks besar) | Naikkan kontras peran warna, bukan per elemen |
| `unmarked-text` | Major | Teks di luar `<Text>`, sehingga tidak dapat diedit | Bungkus dengan `<Text>` |
| `graphic-in-text` | Major | Ikon/SVG di dalam `<Text>`, sehingga hilang di PPTX | Pindahkan ke luar `<Text>` atau ke `<Visual>` |
| `shape-covers-content` | Major | Isi ber-paint tak bertanda di dalam `<Shape>` tertutup | Tandai isinya dengan `<Shape>` atau `<Visual>` |
| `text-in-picture` | Major | Teks ikut menjadi gambar karena shape fallback | Buang gradient/efek dari shape, atau terima sebagai visual |
| `font-size` | Major | < 24 px (12 pt) | Naikkan ukuran atau kurangi isi |
| `unknown-font` | Major | Family tidak terpasang, sehingga disubstitusi | Pakai font dari daftar di `export-contract.md` |
| `text-box-style` | Major | `<Text>` dengan gradient/efek pada latarnya | Bungkus dengan `<Shape>` dan taruh `<Text>` polos di dalam |
| `density` > 1,5× | Major | Terlalu banyak kata | Pecah slide atau pindahkan rincian ke notes |
| `no-visual` | Major (cover/konsep/proses/perbandingan), Minor (lainnya) | Slide tanpa ikon maupun ilustrasi | Tambahkan `<Icon>` per item konsep dan `<Illustration>` yang menjelaskan isi |
| `pptx-render-missing` | Major | PowerPoint gagal merender | Tutup PPTX yang sedang terbuka lalu ekspor ulang |
| `pptx-fidelity` 3–6% | Major | Ada perbedaan nyata | Periksa panel selisih per area |
| `pdf-fidelity` 0,5–2% | Major | PDF sedikit berbeda | Biasanya filter/blend CSS, sederhanakan |
| `safe-area` | Minor | Teks melewati 96 px dari tepi | Geser ke dalam (footer harus tetap di dalam) |
| `text-overlap` | Minor | Dua kotak teks bertumpuk | Perbaiki jarak, kecuali sengaja (lalu jelaskan) |
| `shape-fallback` | Minor | Shape diekspor sebagai gambar | Terima atau sederhanakan gayanya |
| `font-weight` | Minor | Weight dibulatkan ke face terdekat | Pakai weight yang tersedia |
| `density` > batas | Minor | Agak padat | Pertimbangkan memangkas |
| `pptx-fidelity` 1–3% | Minor | Biasanya anti-aliasing/resampling | Cek panel selisih: tepi merah tipis wajar, bentuk merah tidak |
| `text-drift` > 6 px | Minor | Teks PowerPoint bergeser | Cek baris yang pecah berbeda, atau kalibrasi `TEXT_DY_EM` |

Kolom ringkas: `Min contrast` (terburuk di slide), `PPTX Δ`/`PDF Δ` (% piksel berbeda dengan toleransi 1 px),
dan `Text dy/dx` (median pergeseran teks PowerPoint terhadap browser; target ≤ ±2 px).

## B. Visual (lihat setiap screenshot, jangan hanya membaca angka)

- [ ] **Fokus:** dalam 3 detik jelas apa yang dibaca pertama. Judul berupa kesimpulan.
- [ ] **Hierarki:** maksimal 3 level ukuran yang terlihat, dan aksen hanya pada hal terpenting.
- [ ] **Komposisi:** seimbang, tidak ada sudut kosong yang terasa "lupa diisi", dan grup jelas berkat jarak.
- [ ] **Kesejajaran:** tepi kiri kolom sejajar, tinggi kartu dalam satu baris sama, dan konektor menyentuh target.
- [ ] **Tipografi:** tidak ada kata yatim, tidak ada baris > 60 karakter, dan label kapital pendek.
- [ ] **Warna:** peran konsisten antar-slide, makna tidak hanya lewat warna, dan tidak ada warna liar.
- [ ] **Data:** sumbu jujur, label langsung, satu sorotan, dan angka sesuai sumber.
- [ ] **Visual:** setiap item konsep punya ikon yang maknanya spesifik, ada ilustrasi yang menjelaskan isi slide,
  dan gaya ikon serta perlakuan ilustrasi konsisten.
- [ ] **Konsistensi deck:** posisi eyebrow, judul, dan footer identik, serta motif dan grid sama.
- [ ] **Anti-slop:** tidak ada pola dari daftar anti-slop, termasuk data/kutipan rekaan.
- [ ] **Notes:** setiap slide punya notes yang berguna dan rujukan sumber.

## C. Fidelitas ekspor

- PPTX: buka `compare/slide-NN.png`. Merah tipis di tepi huruf/garis itu wajar (anti-aliasing), tetapi blok merah
  berarti objek bergeser, hilang, atau berubah warna.
- Penyimpangan yang umum:
  - Baris pecah berbeda: kotak terlalu sempit atau font tersubstitusi.
  - Teks turun/naik beberapa px: kalibrasi.
  - Shape menutupi ikon: `shape-covers-content`.
- PDF dicetak oleh mesin browser yang sama, jadi Δ > 0,5% biasanya karena efek CSS yang dirasterisasi berbeda.
- Untuk pemeriksaan manual, buka PPTX di PowerPoint, klik teks (harus dapat diedit), lalu cek panel Notes.

## D. Studio UI (hanya jika `src/studio/` berubah)

- [ ] Navigasi keyboard: ←/→, PageUp/PageDown, Home/End, Space (bukan di tombol), F (presentasi), N (notes), Esc.
- [ ] Fokus terlihat di setiap kontrol. Tombol ikon punya `aria-label` atau tooltip, dan slide aktif ditandai `aria-current`.
- [ ] `prefers-reduced-motion` dihormati. Tidak ada animasi pada perpindahan slide di studio (aksi frekuensi tinggi).
- [ ] Uji otomatis dengan `playwright-cli` (buka studio, tekan tombol, ambil screenshot), lalu `npx -y react-doctor@latest .`
  dan perbaiki temuan error.
