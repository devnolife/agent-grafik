---
description: Buat atau desain ulang presentasi — desain UI di browser, lalu ekspor PPTX (dapat diedit) + PDF dengan QA
agent: presentation-designer
---

Brief dari pengguna:

$ARGUMENTS

Kerjakan dengan alur skill `presentation-design`:

1. Jika brief kosong atau kurang jelas, tanyakan sekaligus dengan tool `question`: topik, audiens, tujuan,
   durasi atau jumlah slide, bahasa slide, sumber materi (file atau URL), dan brand/template. Jangan menebak
   hal yang mengubah isi. Tanyakan juga jalurnya: **cepat** (agent AI lokal, layout standar) atau **desain khusus**.
2. Jalur cepat: `npm run agent -- deck "<brief>" --sources <file> --slides N --theme <tema> --icons solid --review`,
   lalu perbaiki `src/decks/generated/<slug>/deck.json`, cek `meta.warnings`, dan lanjut ke langkah 5.
   Jalur desain khusus: tulis `src/decks/<slug>/brief.md` dan `outline.md`. Jika ada file sumber, ekstrak dulu ke `source-notes.md`.
3. Tetapkan sistem visual di `tokens.ts`/`theme.tsx`, termasuk set ikon dan perlakuan ilustrasi. Lalu buat 3 slide contoh
   (cover, konsep, data/proses) **lengkap dengan ikon dan ilustrasi** (unDraw yang di-recolor ke palet deck).
4. Jalankan `npm run export -- <slug>`, perbaiki temuan QA, lalu minta persetujuan pengguna dengan menyertakan
   path `output/<slug>/compare/*.png`.
5. Setelah disetujui, produksi semua slide, poles, ekspor ulang, dan pastikan tidak ada temuan Blocker/Major.
6. Laporkan hasil akhir sesuai format di instruksi agent.
