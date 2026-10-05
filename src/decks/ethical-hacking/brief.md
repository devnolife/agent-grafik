# Brief — ethical-hacking (uji coba 3 slide)

- **Topik:** metodologi ethical hacking, dari kerangka hukum sampai analisis kerentanan
- **Audiens:** mahasiswa/praktisi pemula keamanan siber
- **Tujuan:** menguji alur UI-first → PPTX hybrid + PDF pada materi nyata
- **Jumlah slide:** 3 (cover, konsep, data)
- **Bahasa slide:** Inggris, mengikuti materi sumber. Speaker notes dalam Bahasa Indonesia.
- **Sumber:** `The_Blueprint_of_Ethical_Hacking.pptx` (15 slide berbasis gambar). Hasil transkripsinya ada di `source-notes.md`.
- **Brand:** tidak ada, jadi arah visual ditentukan sendiri.

## Arah visual (alasan)

1. **Blueprint teknis**, mengikuti judul sumber: navy gelap dengan grid ukur 24/96 px, gambar garis sian, dan satu aksen amber
   untuk hal yang paling penting (otorisasi, risiko).
2. **Bahnschrift** (bergaya DIN, teknis, jelas di proyektor) dipadukan dengan **Cascadia Mono** untuk label/ID. Keduanya terpasang lokal,
   sehingga PowerPoint merendernya sama persis.
3. Motif "anatomi berlapis" pada cover (lingkaran fase dari luar ke dalam) menjadi metafora alur engagement. Klise visual hacker dihindari.
4. **Ikon:** Lucide dengan stroke 2,5 px berwarna sian. Amber hanya untuk item yang disorot (Gear 3, Risk).
5. **Ilustrasi:** unDraw (library lokal `~/.ideagram/undraw`) di-recolor dengan `scripts/recolor-illustration.py --mode outline`
   menjadi gambar garis teknis sian dengan aksen amber:
   - `searching-everywhere` untuk recon (inti cover)
   - `secure-server` untuk perisai yang melindungi sistem (slide 2)
   - `warning` untuk risiko (slide 3)
