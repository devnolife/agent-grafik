# Outline — ethical-hacking

| # | id | Arketipe | Judul (takeaway) | Isi | Visual | Sumber |
|---|---|---|---|---|---|---|
| 1 | cover | cover | The Anatomy of an Ethical Hack | Subjudul sumber, 4 lingkaran fase (01–04) dengan legenda, cap "Authorized testing only" | Ilustrasi globe recon di inti lingkaran. Ikon ScanSearch/Radar/ListTree/Bug di legenda | slide 1, 6, 8, 11, 12 |
| 2 | pillars | konsep | Every test targets the CIA triad, so the legal shield comes first | Kiri: sistem bertumpu pada C/I/A + "If one pillar cracks…". Kanan: Gear 1–3, dengan Gear 3 (written authorization) disorot | Ilustrasi perisai + server di kanan atas. Ikon EyeOff/FileCheck/Server dan Crosshair/FileLock/Signature | slide 3 |
| 3 | equation | data | Base CVSS is not enough: context dictates true business risk | Persamaan Threat × Vulnerability × Impact = Risk, CWE vs CVE dengan contoh, matriks risiko 3×3 dengan panah "+ Context" dari Medium ke High | Ilustrasi peringatan risiko di kanan atas. Ikon Swords/Bug/Zap/Gauge di kartu persamaan | slide 5 |

## Catatan keputusan

- Judul slide 2 dan 3 diparafrasekan menjadi kalimat takeaway. Judul asli dipertahankan sebagai eyebrow.
- Urutan CIA diubah menjadi Confidentiality → Integrity → Availability (urutan baku). Di sumber tertulis A, C, I, dan urutan ini tidak bermakna.
- Matriks 3×3 di sumber tidak berisi nilai, sehingga label Low/Medium/High hanya penanda kualitatif dan tidak ada angka yang ditambahkan.
