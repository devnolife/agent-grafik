---
name: bangun-agent-grafik
description: "Bangun fitur pembuat presentasi, ikon SVG, dan gambar berbasis AI lokal (Ollama + ComfyUI FLUX.2) beserta UI studio modern di project ini, mengikuti arsitektur agent-grafik yang sudah teruji. Pakai saat project lain butuh fitur generatif serupa."
argument-hint: "Fitur yang diinginkan, mis. generator ikon SVG di dashboard admin"
agent: agent
---
Bangun fitur generatif (slide, ikon SVG, dan/atau gambar) di project ini dengan model lokal di server ini.
Implementasi acuan yang sudah teruji ada di `/home/devnolife/agent-grafik`: baca berkasnya dan porting polanya ke stack
project ini, jangan menebak ulang dari nol. Permintaan pengguna ada di pesan setelah perintah ini; bangun hanya bagian
yang diminta.

## 0. Sebelum menulis kode

- Pelajari stack project ini (framework, UI kit, backend, cara aset disajikan), lalu ajukan rencana singkat. Tanyakan hal
  yang mengubah arsitektur, misalnya proses mana yang boleh memanggil GPU.
- Cek layanan: `node /home/devnolife/agent-grafik/agent/cli.ts status` (Ollama `:11434`, ComfyUI `:8188`, VRAM).

## 1. Berkas acuan (di `/home/devnolife/agent-grafik`)

| Kebutuhan | Acuan |
|---|---|
| Klien ComfyUI dan graph FLUX.2 | `agent/comfy.ts` |
| Klien Ollama: JSON terstruktur, stream, unload, vision | `agent/ollama.ts` |
| Prompt perencana dan grounding angka | `agent/planner.ts` |
| Spesifikasi dan normalizer longgar | `src/engine/spec.ts` |
| Arah seni gambar per tema, prompt ikon | `src/engine/themes.ts` |
| Trace PNG ke SVG | `scripts/trace-icon.py` |
| Pipeline, simpan JPEG, tulis atomik | `agent/pipeline.ts`, `agent/media.ts` |
| API job, SSE, dan keamanannya | `agent/vite-plugin.ts` |
| UI: panel AI, dock progres, inspector | `src/studio/create-sheet.tsx`, `activity.tsx`, `inspector.tsx`, `agent-client.tsx` |

## 2. Pengaturan yang sudah terbukti

**Teks (Ollama)**
- `gemma4:latest` dengan `think: false`: judul takeaway jauh lebih baik dan sekitar 2,5× lebih cepat daripada `gemma3:27b`.
- Structured output (`format: <JSON schema>`), temperature 0.4, ulang sekali di 0.2 dengan pesan galat sebelumnya.
- Jangan percaya JSON mentah: normalizer memotong kata, memetakan alias, menurunkan layout yang isinya kurang, dan
  memvalidasi nama berkas.
- Kejujuran: larang angka/kutipan yang tidak ada di brief atau sumber, cek ulang di kode, lalu tampilkan sisanya di UI
  sebagai peringatan.
- `keep_alive: 0` setelah selesai agar VRAM kosong untuk FLUX.

**Gambar (ComfyUI FLUX.2 [dev])**
- `flux2_dev_fp8mixed` + LoRA `Flux2TurboComfyv2` (strength 1), `Flux2Scheduler` 8 langkah, `FluxGuidance` 2.5, sampler
  euler, `EmptyFlux2LatentImage`, `CLIPLoader` type `flux2` (`mistral_3_small_flux2_fp8`), `flux2-vae`.
- Urutan graph (server memakai `--disable-smart-memory`; text encoder dan UNet tidak muat bersamaan): encode semua prompt
  dulu (rantai `ConditioningAverage` strength 1.0 sebagai gerbang tanpa efek), lalu semua sampler, lalu `LatentBatch` per
  ukuran dan satu `VAEDecode` per ukuran. Hasil uji 8 gambar: 81 dtk menjadi 50 dtk (1 GPU) dan 32 dtk (2 GPU).
- Kirim 2 graph berselang 2 detik agar dispatcher membaginya ke kedua GPU.
- Ukuran kelipatan 16: potret 896×1008, lebar 1536×864, ikon 640×640 batch 2.
- Prompt = subjek konkret (bahasa Inggris) + kalimat gaya tema + penjaga: full-bleed tanpa bingkai, tanpa
  teks/angka/logo/layar. Hindari frasa "paper background" (FLUX melukis bingkai kertas).
- Seed deterministik dari id (bisa diambil dari cache ComfyUI); seed acak untuk "gambar baru".
- Simpan JPEG q90: disk server dipakai bersama.

**Etika ComfyUI bersama (wajib)**
- Ambil hasil lewat `PreviewImage` (folder temp), bukan `SaveImage`. Id node keluaran harus unik per job agar `/view`
  dirutekan ke GPU yang benar.
- Batalkan hanya prompt sendiri: `POST /queue {"delete":[id]}` + `POST /interrupt {"prompt_id":id}`. Jangan pernah memanggil
  `/interrupt` global.
- Polling `/history/<id>` tiap 1 dtk dengan batas waktu, dan laporkan posisi antrean dari `/queue`.

**Ikon SVG**
- Prompt: "A single minimalist pictogram icon of <subjek>", glyph hitam solid atau garis tebal, latar putih polos, tanpa
  teks, bayangan, gradien, atau bingkai.
- 2 kandidat, beri skor (rasio tinta, mid-tone, jumlah komponen, tidak menyentuh tepi), lalu OpenCV
  `findContours(RETR_TREE)`, `approxPolyDP(0.9)`, kurva kuadratik dengan sudut tajam dipertahankan, dan SVG
  `viewBox="0 0 96 96"` dengan `fill="currentColor"` + `fill-rule="evenodd"`. Pakai `cv2.setNumThreads(1)`.
- Opsional: `qwen2.5vl` memeriksa gambar ("ada teks/layar? YES/NO") dan gambar dilukis ulang sekali jika YES.

## 3. API dan UI

- Satu job GPU sekali waktu. Event job (stage, progress, log, done + files, error) dikirim lewat SSE, dengan snapshot saat
  klien tersambung agar aman ketika halaman dimuat ulang.
- Keamanan: cek Host (DNS rebinding) dan Origin, hanya `application/json`, batas ukuran body, validasi enum/regex untuk
  semua input, berkas hanya dari folder output (resolve lalu cek prefix), `nosniff` + CSP untuk SVG, dan spawn proses
  dengan array argumen (tanpa shell).
- Tulis berkas secara atomik (tmp lalu rename) dan gabungkan penulisan beruntun agar UI tidak membaca berkas setengah jadi.
- UI modern: header (brand, pemilih item, titik status layanan), panel "Buat dengan AI" bertab, kontrol segmented, pilihan
  tema berupa miniatur, dock progres mengambang (chip tahap, progress bar, log terakhir, batal, unduh hasil), palet gelap
  netral dengan satu warna aksen, label aksesibel, dan pintasan keyboard. Di Vite: modul `import.meta.glob` yang
  self-accept HMR + store `useSyncExternalStore`, agar hasil baru muncul tanpa reload.

## 4. Bukti sebelum selesai

- Typecheck dan build lulus.
- Jalankan sekali dari ujung ke ujung dengan model asli (bukan mock), lalu lihat hasilnya: screenshot UI dengan Playwright
  dan gambar/ikon yang dihasilkan.
- Tidak ada error di console, setiap tombol punya label, dan fokus keyboard terlihat.
- Laporkan dalam Bahasa Indonesia yang ringkas: apa yang dibangun, cara memakainya, waktu proses yang terukur, dan batasannya.
