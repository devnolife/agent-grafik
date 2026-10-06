---
name: agent-grafik
description: "Buat presentasi PPTX/PDF, set ikon SVG, atau gambar ilustrasi dengan agent-grafik (Ollama + FLUX.2 lokal di server ini) dari project mana pun, lalu bawa hasilnya ke project ini. Pakai saat butuh slide, ikon, atau gambar."
argument-hint: "deck | ikon | gambar + kebutuhannya, mis. deck: pengantar produk X untuk investor, 8 slide"
agent: agent
---
Buat aset visual untuk project yang sedang dibuka dengan **agent-grafik**, yang sudah terpasang di
`/home/devnolife/agent-grafik`. Jangan membangun ulang fitur ini dan jangan mengubah kode agent-grafik: panggil CLI-nya.

Permintaan pengguna ada di pesan setelah perintah ini. Untuk deck, jika topik, audiens, jumlah slide, atau bahasa belum
jelas, tanyakan semuanya sekaligus dalam satu pertanyaan.

## Perintah

Jalankan dari folder project ini (path relatif tetap berlaku). Setiap perintah mencetak path absolut hasilnya di akhir.

```bash
AG="node /home/devnolife/agent-grafik/agent/cli.ts"
$AG status          # wajib pertama: Ollama, ComfyUI (FLUX.2), VRAM bebas
$AG deck "<brief>" --sources <file> --slides 8 --lang id|en --theme aurora|paper|forest|sunset --icons solid|outline|lucide --review --export
$AG icons "konsep 1, konsep 2" --style solid|outline      # set SVG satu warna (fill=currentColor)
$AG image "<deskripsi bahasa Inggris>" --theme free|aurora|paper|forest|sunset --shape wide|portrait|square --count 2
$AG repaint <slug> [slide-id]                             # lukis ulang gambar deck
$AG restyle <slug> lucide|solid|outline                   # gambar ulang semua ikon deck
$AG export <slug>                                          # PPTX + PDF + laporan QA
```

## Alur

1. **Status.** Jalankan `$AG status`. Jika ComfyUI tidak siap, deck tetap bisa dibuat dengan `--no-images --icons lucide`,
   tetapi ikon dan gambar AI tidak bisa. Laporkan ke pengguna.
2. **Sumber.** Untuk deck, kumpulkan fakta dari project ini (README, docs, data yang disebut pengguna) ke satu file teks
   lalu kirim dengan `--sources`. Agent hanya boleh memakai angka dan kutipan yang ada di brief atau sumber.
3. **Satu pekerjaan sekali waktu** (GPU dipakai bersama). Perkiraan: deck 7 slide 3–5 menit, ikon 1–2 menit, gambar
   sekitar 1 menit. Jalankan di terminal latar belakang dan tunggu sampai selesai.
4. **Periksa hasil.**
   - Deck: buka `/home/devnolife/agent-grafik/src/decks/generated/<slug>/deck.json`. Setiap entri `meta.warnings`
     (angka yang tidak ada di sumber) wajib dicek ke sumber; perbaiki atau hapus teksnya di `deck.json`, lalu jalankan
     `$AG export <slug>`. Blocker dan Major di `/home/devnolife/agent-grafik/output/<slug>/qa-report.md` harus 0.
   - Ikon dan gambar: lihat filenya sebelum dipakai. Jika ada teks, bingkai, atau bentuk aneh, buat ulang
     (`repaint`, atau jalankan `icons`/`image` lagi; seed baru otomatis).
5. **Bawa ke project ini.** Salin hasil ke folder aset sesuai konvensi project (cek dulu, mis. `public/`, `src/assets/`,
   `docs/`). Ikon SVG memakai `currentColor`, jadi warnanya mengikuti CSS `color`. Beri nama file yang deskriptif dan
   `alt` yang bermakna untuk gambar.

## Aturan

- Jangan memanggil API ComfyUI langsung, apalagi `/interrupt` global: server dipakai bersama. Batalkan hanya dengan Ctrl+C pada CLI.
- Deskripsi gambar dan konsep ikon dalam bahasa Inggris, satu subjek konkret, tanpa teks, layar, atau logo.
- Jangan mengarang data untuk slide. Tanpa sumber berangka, slide angka dan kutipan memang akan dibuang.
- Untuk meninjau deck secara visual: `cd /home/devnolife/agent-grafik && npm run dev`, lalu buka
  `http://localhost:5173/?deck=<slug>` (port 5173 perlu di-forward).

## Laporan

Singkat, dalam Bahasa Indonesia: apa yang dibuat, path file di project ini, ringkasan QA (untuk deck), dan hal yang perlu
dicek manusia (isi `meta.warnings`).
