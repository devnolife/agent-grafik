# agent-grafik

Studio presentasi dengan agent AI lokal: dari satu brief menjadi deck 16:9 lengkap dengan ikon SVG dan ilustrasi,
lalu diekspor ke PPTX (teks dapat diedit) + PDF vektor dengan laporan QA. Semua model berjalan di server sendiri.

| Bagian | Model / alat |
|---|---|
| Alur dan isi slide | Ollama `gemma4` (default; bisa diganti di studio) |
| Ikon | FLUX.2 [dev] Turbo di ComfyUI → di-trace menjadi SVG satu warna |
| Ilustrasi | FLUX.2 [dev] Turbo, gaya mengikuti tema deck |
| Pemeriksaan gambar (opsional) | Ollama `qwen2.5vl` menolak gambar yang berisi teks/layar |
| Ekspor | Playwright → PPTX (pptxgenjs) + PDF, render ulang LibreOffice, QA (`scripts/qa.py`) |

## Mulai

```bash
npm install
npm run agent -- status     # cek Ollama, ComfyUI, VRAM
npm run dev                 # studio + API agent → http://localhost:5173
```

Di studio: **Buat dengan AI** (tombol kanan atas atau tombol `G`) untuk membuat presentasi, set ikon, atau gambar.
Deck baru langsung terbuka dan terisi bertahap. Panel kanan (`I`) untuk ganti tema, gaya ikon, gambar baru per slide,
dan ekspor PPTX + PDF.

Lewat terminal:

```bash
npm run agent -- deck "Pengantar keamanan siber untuk UMKM" --slides 8 --theme aurora --icons solid --review --export
npm run agent -- icons "rocket launch, team of three people, shield with check mark" --style outline
npm run agent -- image "A glass greenhouse on a rooftop at dusk" --theme forest --shape wide --count 2
npm run agent -- repaint <slug> [slide-id]       # lukis ulang gambar
npm run agent -- restyle <slug> lucide|solid|outline
npm run agent -- export <slug>
```

## Hasil

- `src/decks/generated/<slug>/deck.json` + `assets/`: deck AI (sumber kebenaran; edit teksnya di sini)
- `output/<slug>/`: `<slug>.pptx`, `<slug>.pdf`, `qa-report.md`, render pembanding
- `output/icons/<set>/*.svg`, `output/images/*.jpg`: aset lepas

Angka yang ditulis model tetapi tidak ada di brief/sumber dicatat di `meta.warnings` (panel "Perlu dicek").
Tempel data asli di kolom **Materi sumber** agar slide angka dan kutipan boleh dipakai.

## Konfigurasi (environment)

| Variabel | Default |
|---|---|
| `OLLAMA_URL` | `http://127.0.0.1:11434` |
| `COMFYUI_URL` | `http://127.0.0.1:8188` |
| `AGENT_PLANNER_MODEL` / `AGENT_REVIEW_MODEL` | `gemma4:latest` / `qwen2.5vl` |
| `AGENT_FLUX_UNET`, `AGENT_FLUX_TEXT_ENCODER`, `AGENT_FLUX_VAE`, `AGENT_FLUX_TURBO_LORA` | berkas FLUX.2 [dev] di ComfyUI |

ComfyUI di server ini dipakai bersama. Agent hanya membatalkan prompt miliknya sendiri, gambar diambil lewat folder
temp ComfyUI (tidak menumpuk di disk server), dan satu graph memuat setiap model sekali untuk banyak gambar.

## Struktur

- `agent/`: planner (Ollama), klien ComfyUI, pipeline, CLI, API studio (`vite-plugin.ts`, hanya di `npm run dev`)
- `src/engine/`: spesifikasi deck (9 layout), tema, dan render spec → slide React
- `src/studio/`: studio (daftar slide, kanvas, panel AI, inspector, mode presentasi)
- `src/decks/<slug>/`: deck buatan tangan (React), contoh: `ethical-hacking`
- `scripts/`: ekspor, QA, trace ikon
