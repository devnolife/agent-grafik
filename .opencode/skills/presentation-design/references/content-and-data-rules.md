# Aturan konten, data, dan anti-slop

Disarikan dari `better-writing`, `data-visualization`, `no-ai-design-slop`, dan `critique-information-density`.

## 1. Alur cerita

- **Assertion–evidence:** judul setiap slide isi adalah kalimat kesimpulan (≤ 12 kata). Badan slide adalah buktinya:
  diagram, data, atau contoh. Pengecualian: cover dan pembatas bagian.
- Uji alur: baca hanya judul-judul dari awal sampai akhir, dan argumennya harus utuh.
- Satu gagasan per slide. Slide sumber yang padat dipecah menurut gagasan, bukan menurut jumlah poin.
- Eyebrow (label kecil di atas judul) menamai topik/bagian. Judul menyatakan maknanya.
- Penjelasan panjang, contoh tambahan, dan rujukan sumber masuk **speaker notes** (`notes`), dengan 2–5 kalimat per slide.

## 2. Kepadatan

Batas kata yang dicek QA (semua teks terlihat kecuali `data-qa="chrome"`):

| Arketipe | cover | konsep | proses | perbandingan | data | kutipan | penutup |
|---|---|---|---|---|---|---|---|
| Batas kata | 40 | 60 | 70 | 80 | 60 | 40 | 40 |

- Lebih dari batas menjadi **Minor**, dan lebih dari 1,5× batas menjadi **Major**. Pindahkan rincian ke notes atau pecah slidenya.
- Maksimal 3–5 item per grup, maksimal 2 level hierarki, dan tidak ada paragraf lebih dari 3 baris di slide.

## 3. Penulisan

- Ringkas, aktif, dan spesifik. Buang kata pengisi ("sangat", "berbagai", "dalam rangka", "hal ini").
- Istilah konsisten: satu konsep satu nama di seluruh deck. Istilah teknis baku (penetration testing, CVSS,
  CVE, OWASP) dibiarkan dalam bahasa aslinya dan didefinisikan sekali.
- Butir daftar paralel secara gramatikal (semua frasa benda atau semua kalimat perintah).
- Angka selalu memakai satuan dan konteks ("65.535 port TCP/UDP", bukan "65535").
- Judul memakai huruf kapital di awal kalimat. HURUF KAPITAL hanya untuk label pendek. Label tidak diakhiri titik.
- Bahasa slide mengikuti brief. Jika tidak disebut, ikuti bahasa materi sumber. Notes memakai bahasa pengguna.

## 4. Visualisasi data

- Pilih grafik menurut pesannya:
  - Perbandingan: bar horizontal
  - Perubahan waktu: line
  - Bagian dari keseluruhan: stacked bar (atau pie ≤ 4 irisan)
  - Distribusi: histogram
  - Hubungan: scatter
  - Dua dimensi kualitatif: matriks 2×2 atau 3×3
- **Label langsung** pada data, bukan legenda. Satuan ada di label sumbu atau angka.
- Sumbu jujur: bar dimulai dari 0, tidak ada efek 3D, dan tidak ada sumbu ganda yang menyesatkan.
- **Sorot satu seri atau titik** yang membawa pesan dengan warna aksen, sedangkan sisanya netral/redup.
- Satu angka penting lebih kuat sebagai **big number** (96–128 px) dengan konteks di bawahnya daripada sebagai grafik.
- Tabel hanya jika penonton perlu membaca nilai persisnya. Maksimal 5×4 sel, dengan angka rata kanan dan tabular.
- Bar/sel grafik dibuat sebagai `<Shape>` dan angkanya sebagai `<Text>`, supaya tetap dapat diedit di PowerPoint.

## 5. Ilustrasi, ikon, dan diagram

- **Setiap slide wajib punya visual yang menjelaskan isinya:** ikon untuk setiap item konsep, dan ilustrasi untuk cover serta
  slide konsep/proses/perbandingan. QA menandai slide tanpa ikon/ilustrasi sebagai `no-visual`.
- Pilih ilustrasi berdasarkan **adegan** yang mewakili pesan slide, bukan kata kunci yang kebetulan sama.
  Contohnya "legal shield melindungi sistem" diwakili orang dengan perisai di depan server.
- Satu gaya ikon per deck (Lucide, stroke 2,5 px, sudut sama). Jangan mencampur ikon outline dan filled.
- Diagram menampilkan hubungan secara eksplisit melalui panah berarah, pengelompokan, dan penomoran langkah.
- Motif visual deck (misalnya grid blueprint) konsisten di semua slide dan mendukung topik.
- Hindari klise stok: hacker berhoodie, gembok melayang, hujan biner, globe bercahaya, robot, dan jabat tangan, kecuali diminta brief.

## 6. Anti-slop untuk slide

Jangan gunakan pola-pola berikut, kecuali brief/brand memintanya secara eksplisit:

- Gradient ungu–biru, glassmorphism di mana-mana, neon glow pada semua elemen, blob dekoratif
- Baris 3 kartu identik di setiap slide, ikon emoji sebagai bullet, semua elemen rata tengah
- Elemen miring acak, badge "NEW/AI", ilustrasi orang 3D generik
- Copy hype: "Unlock", "Elevate", "Seamless", "Revolusioner", "Next-level"
- **Data, sumber, logo, testimoni, atau kutipan rekaan**

## 7. Integritas konten

- Fakta sumber ditulis persis: ID (CVE-2014-0160, CWE-89), nomor port, nama standar (NIST SP 800-115), dan istilah.
- Kesalahan di sumber (salah ketik, duplikasi) **ditandai di notes**, lalu diperbaiki hanya jika maknanya jelas.
- Setiap slide yang memakai materi sumber menyebut rujukannya di notes, contohnya "Sumber: deck.pptx, slide 5".
- Parafrase judul boleh untuk assertion–evidence, asalkan maknanya tidak bergeser dari sumber.
