# Catatan sumber — The Blueprint of Ethical Hacking
Sumber: The_Blueprint_of_Ethical_Hacking.pptx (15 slide, berbasis gambar)

Catatan: setiap slide hanya berisi satu gambar PNG 1376×768 tanpa teks yang dapat diedit, dan file tidak memiliki speaker notes (tidak ada `ppt/notesSlides`), sehingga semua teks di bawah ditranskripsi dari gambar. Judul di gambar slide 1 adalah "The Anatomy of an Ethical Hack", berbeda dari nama file ("Blueprint"). Keterangan tambahan dari saya ditulis sebagai _[...]_.

## Slide 1 — The Anatomy of an Ethical Hack
- **Pesan utama:** Slide judul yang membingkai deck sebagai pembedahan alur peretasan etis, mulai dari kerangka hukum sampai analisis kerentanan yang presisi.
- **Teks di slide (verbatim):**
  - The Anatomy of an Ethical Hack
  - From Legal Frameworks to Precision Vulnerability Analysis
  - [tidak terbaca] _[label mikro dekoratif pada ikon node isometrik di kiri bawah; tampak seperti "683" atau "6S3"]_
  - Gemini Notebook _[watermark berlogo, pojok kanan bawah]_
- **Struktur visual:** Cover tipografis: judul putih tebal dua baris di tengah dengan subjudul biru muda di bawahnya, dibingkai diagram jaringan isometrik bergaya blueprint (node, server, dokumen, garis rute cyan dan hijau, panah naik ke kanan) yang membentuk belah ketupat di atas latar navy bergrid.
- **Data/angka:** tidak ada (label mikro di kiri bawah tidak terbaca pasti dan hanya dekorasi, bukan data)
- **Peluang desain ulang:** cover — judul dan subjudul di atas ilustrasi jaringan bergaya blueprint yang lebih tenang.

## Slide 2 — THE HACKER SPECTRUM MATRIX
- **Pesan utama:** Peretas dibedakan menurut niat, legalitas, otorisasi, dan hasil, dan hanya White Hat (ethical hacker) yang legal karena bekerja dengan otorisasi tertulis dan eksplisit.
- **Teks di slide (verbatim):**
  - THE HACKER SPECTRUM MATRIX
  - BLACK HAT
    - Intent: Malicious / Personal Gain
    - Legality: Strictly Illegal
    - Authorization: None
    - Outcome: Data Theft, Ransom, Sabotage
  - GREY HAT
    - Intent: Altruistic but Misguided
    - Legality: Illegal (Trespassing)
    - Authorization: None
    - Outcome: Unsolicited Vulnerability Disclosure (High Legal Risk)
  - WHITE HAT (ETHICAL HACKER)
    - Intent: Protective / System Improvement
    - Legality: Fully Legal
    - Authorization: Written & Explicit
    - Outcome: Secured Systems, Maintained Trust (Amanah)
  - Gemini Notebook _[watermark, pojok kanan bawah]_
- **Struktur visual:** Matriks perbandingan 3 kolom × 4 baris atribut yang sama (Intent, Legality, Authorization, Outcome), dibaca kiri→kanan sebagai spektrum. Black Hat berbingkai cyan dan Grey Hat berbingkai oranye/amber. White Hat tampil sebagai kartu hijau menyala yang menonjol keluar dari tabel, dengan ikon perisai-gembok di atas, lencana centang di bawah, dan pusaran cahaya hijau. Label atribut diwarnai sesuai kolom: ikon target/crosshair di tiap baris, segitiga peringatan pada Outcome Black/Grey Hat, serta ikon perisai dan centang di kolom White Hat. Kata "Amanah" disorot hijau.
- **Data/angka:** tidak ada
- **Peluang desain ulang:** perbandingan — tabel spektrum 3 kolom dengan sorotan pada White Hat.

## Slide 3 — THE PILLARS OF SECURITY & THE LEGAL SHIELD
- **Pesan utama:** Pentest menyasar triad CIA yang harus tetap utuh, dan pelaksanaannya dilindungi tiga "roda gigi" legal: ruang lingkup, NDA/kontrak, dan otorisasi tertulis sebagai perisai hukum utama.
- **Teks di slide (verbatim):**
  - THE PILLARS OF SECURITY & THE LEGAL SHIELD
  - THE TARGET
    - AVAILABILITY
      - Ensuring systems remain accessible to legitimate users.
    - CONFIDENTIALITY
      - Protecting data from unauthorized eyes.
    - INTEGRITY
      - Ensuring data remains accurate and unaltered.
    - If one pillar cracks, the system collapses.
  - THE PROTECTION
    - GEAR 1: SCOPE OF ENGAGEMENT
      - Defining exactly what assets are in and out of bounds.
    - GEAR 2: NDA / CONTRACT
      - Protecting client secrecy.
    - GEAR 3: WRITTEN AUTHORIZATION
      - The ultimate legal shield against cybercrime laws.
  - Gemini Notebook _[watermark, pojok kanan bawah]_
- **Struktur visual:** Dua panel kiri–kanan dipisah garis vertikal. Panel kiri ("THE TARGET") berupa gapura wireframe: pilar hijau kiri = CONFIDENTIALITY, pilar hijau kanan = INTEGRITY, dan lengkung cyan dengan batu kunci hijau di puncak = AVAILABILITY. Gapura berdiri di atas alas cyan, dengan kotak callout amber di bawahnya. Panel kanan ("THE PROTECTION") berisi tiga roda gigi saling mengunci dengan panah rotasi. Gear 1 dan Gear 2 berwarna cyan dan lebih kecil di atas, sedangkan Gear 3 hijau, terbesar, dan bercahaya di bawah sebagai titik fokus. Setiap label terhubung ke objeknya lewat garis penunjuk.
- **Data/angka:** tidak ada (hanya penomoran GEAR 1–3)
- **Peluang desain ulang:** konsep — dua panel "target vs perlindungan" (triad CIA dan tiga lapis perlindungan legal).

## Slide 4 — THE MASTER PLAN: FRAMEWORKS COMPARED
- **Pesan utama:** Tiga kerangka kerja pentest punya fokus berbeda (PTES untuk red teaming menyeluruh, OWASP untuk aplikasi web dan API, NIST SP 800-115 untuk kepatuhan dan audit), sehingga kerangka yang dipilih menentukan rencana pengujian.
- **Teks di slide (verbatim):**
  - THE MASTER PLAN: FRAMEWORKS COMPARED
  - PTES
    - (Penetration Testing Execution Standard)
    - Focus: Comprehensive, Full-Scale Red Teaming.
    - Key Feature: 7-phase process with heavy emphasis on Threat Modeling and post-exploitation.
  - OWASP
    - (Open Worldwide Application Security Project)
    - Focus: Web Applications and APIs.
    - Key Feature: Granular testing categories targeting the Top 10 web vulnerabilities (e.g., Injection, Broken Auth).
  - NIST SP 800-115
    - (National Institute of Standards and Technology)
    - Focus: Federal Standards & Corporate Compliance.
    - Key Feature: A formal 4-phase iterative cycle (Planning -> Discovery -> Attack -> Reporting) used heavily for audits.
  - Gemini Notebook _[watermark, pojok kanan bawah]_
- **Struktur visual:** Perbandingan 3 kolom berupa tiga papan/tablet wireframe yang dimiringkan di atas penyangga. Setiap papan punya warna sendiri (PTES cyan, OWASP amber, NIST hijau) dan isi paralel: nama, kepanjangan dalam kurung, Focus, dan Key Feature. Ikon dekoratif (kubus wireframe, simpul jaringan) ada di sudut papan. Latarnya blueprint bergrid dengan garis kontur.
- **Data/angka:** 7-phase (PTES); Top 10 web vulnerabilities (OWASP); SP 800-115 (nomor publikasi NIST); 4-phase (NIST: Planning -> Discovery -> Attack -> Reporting)
- **Peluang desain ulang:** perbandingan — tiga kolom kerangka kerja dengan baris Focus dan Key Feature, plus indikator jumlah fase (7 vs 4).

## Slide 5 — THE VULNERABILITY EQUATION
- **Pesan utama:** Risiko dirumuskan sebagai Threat × Vulnerability × Impact dan dinyatakan dengan skor CVSS 0.0–10.0, tetapi skor dasar CVSS perlu konteks lingkungan agar mencerminkan risiko bisnis yang sebenarnya.
- **Teks di slide (verbatim):**
  - THE VULNERABILITY EQUATION
  - THREAT (ACTOR) × VULNERABILITY (CWE/CVE) × IMPACT (CIA) = RISK (CVSS)
  - THREAT
    - The likelihood of an actor attacking.
  - VULNERABILITY
    - The actual flaw.
    - CWE = Weakness category (e.g., CWE-89 SQLi)
    - CVE = Specific known flaw (e.g., CVE-2014-0160 Heartbleed).
  - IMPACT
    - The damage to Confidentiality, Integrity, or Availability.
  - RISK
    - The prioritized score (0.0 to 10.0), calculated using CVSS.
  - Base CVSS is not enough. Environmental context dictates true business risk.
  - LIKELIHOOD _[label sumbu vertikal matriks]_
  - IMPACT _[label sumbu horizontal matriks]_
  - Gemini Notebook _[watermark, pojok kanan bawah]_
- **Struktur visual:** Di atas ada rumus besar satu baris: empat suku dengan keterangan dalam kurung di bawah masing-masing, dihubungkan operator × dan =, dengan warna yang bergeser dari cyan ke hijau. Di bawahnya ada tabel definisi 4 kolom yang sejajar dengan suku rumus; kolom RISK berlatar hijau sebagai sorotan. Di kanan ada matriks risiko 3×3 dengan sumbu LIKELIHOOD (vertikal) dan IMPACT (horizontal). Sel diagonalnya disorot cyan (kiri bawah) → hijau (tengah) → amber (kanan atas), dan callout amber menunjuk sel kanan atas.
- **Data/angka:** CWE-89 (SQLi); CVE-2014-0160 (Heartbleed); rentang skor CVSS 0.0 to 10.0; matriks 3×3 hanya ilustratif (tanpa nilai)
- **Peluang desain ulang:** data — rumus risiko sebagai persamaan visual yang mengalir ke matriks/heatmap risiko 3×3.

## Slide 6 — PHASE 1: THE SILENT OBSERVER (FOOTPRINTING & RECONNAISSANCE)
- **Pesan utama:** Pada fase 1, OSINT memetakan permukaan serangan: informasi publik hanya puncak gunung es, sedangkan aset tersembunyi seperti subdomain terlupakan, kredensial bocor, dan koneksi vendor sudah terungkap sebelum satu paket pun dikirim.
- **Teks di slide (verbatim):**
  - PHASE 1: THE SILENT OBSERVER (FOOTPRINTING & RECONNAISSANCE)
  - VISIBLE/PUBLIC OSINT
    - Search Engine Caches & Google Dorking
    - Social Media & LinkedIn (Personnel mapping)
    - Public WHOIS records
  - THE HIDDEN ATTACK SURFACE
    - Forgotten Subdomains (e.g., dev.target.com)
    - Leaked Credential Databases
    - Third-party vendor connections exposed via DNS TXT records.
  - KEY TAKEAWAY: OSINT BUILDS THE ATTACK SURFACE BEFORE A SINGLE PACKET IS SENT.
  - Gemini Notebook _[watermark, pojok kanan bawah]_
- **Struktur visual:** Metafora gunung es: gunung es wireframe cyan bermotif sirkuit menembus bidang grid yang menjadi "permukaan air". Label kategori ada di kiri: VISIBLE/PUBLIC OSINT di atas air dan THE HIDDEN ATTACK SURFACE di bawah air. Di kanan ada 3 + 3 callout berawalan "-" yang terhubung lewat garis penunjuk ke bagian atas atau bawah gunung es. Bagian bawah air dibuat lebih besar untuk menekankan permukaan serangan tersembunyi. KEY TAKEAWAY ditulis dengan huruf kapital hijau di bagian bawah.
- **Data/angka:** tidak ada (hanya penomoran "PHASE 1"; dev.target.com adalah contoh domain, bukan data)
- **Peluang desain ulang:** konsep — metafora gunung es dua lapis (terlihat vs tersembunyi) dengan dua daftar tiga butir.

## Slide 7 — Passive vs. Active Reconnaissance
- **Pesan utama:** Recon pasif (tanpa kontak dengan target, risiko rendah) sangat berbeda dari recon aktif (kontak langsung, meninggalkan log, wajib otorisasi eksplisit), dan semakin aktif tekniknya, semakin tajam naiknya probabilitas deteksi dan risiko hukum.
- **Teks di slide (verbatim):**
  - Passive vs. Active Reconnaissance
  - Passive Reconnaissance
    - Interaction: None. Target is unaware.
    - Tools: theHarvester, Maltego, Wayback Machine.
    - Risk Level: Low / Safe.
  - Active Reconnaissance
    - Interaction: Direct contact with target servers. Leaves log entries.
    - Tools: Ping sweeps, DNS Zone Transfers (dig axfr), Banner Grabbing.
    - Risk Level: High. Requires explicit Authorization.
  - Detection Probability & Legal Risk _[label sumbu Y grafik]_
  - Transition from Passive to Active _[label sumbu X, panah dua arah]_
  - [tidak terbaca] _[mikro-teks dekoratif di area grafik]_
  - Gemini Notebook _[watermark, pojok kanan bawah]_
- **Struktur visual:** Bagian atas berupa tabel perbandingan 2 kolom: Passive berwarna cyan di kiri dan Active berwarna amber di kanan dengan latar amber transparan. Keduanya punya tiga baris atribut paralel (Interaction, Tools, Risk Level). Di bawahnya ada grafik garis konseptual tanpa skala: garis bergradasi cyan → amber → oranye-merah yang datar di kiri lalu menanjak curam ke panah di kanan atas. Gelombang sinyal dekoratif muncul di sisi Active, dan aksen garis sirkuit ada di tepi slide.
- **Data/angka:** tidak ada (grafik bersifat konseptual, tanpa angka atau skala)
- **Peluang desain ulang:** perbandingan — dua kolom pasif vs aktif dengan grafik eskalasi risiko sebagai jembatan.

## Slide 8 — PHASE 2: SCANNING THE PERIMETER
- **Pesan utama:** Fase 2 memindai perimeter berlapis dari luar ke dalam, yaitu host discovery (siapa yang hidup), port scanning (pintu mana yang terbuka), lalu version detection (apa persisnya di balik pintu), masing-masing dengan perintah nmap yang sesuai.
- **Teks di slide (verbatim):**
  - PHASE 2: SCANNING THE PERIMETER
  - _[blok 1, terhubung ke cincin HOST DISCOVERY]_
    - Question: Who is alive?
    - Action: ICMP Pings (nmap -sn) to map active IPs in the subnet.
  - _[blok 2, terhubung ke cincin PORT SCANNING]_
    - Question: Which doors are open?
    - Action: Probing 65,535 TCP/UDP ports to find listening services.
  - VERSION DETECTION
    - Question: What exactly is behind the door?
    - Action: Banner grabbing (nmap -sV and --O) to pinpoint exact software versions and OS fingerprints. _[di slide baris pertama berakhir "(nmap -sV and -" dan baris berikutnya diawali "-O)"; kemungkinan artefak pemenggalan dari "-O"]_
  - HOST DISCOVERY _[label cincin luar]_
  - PORT SCANNING _[label cincin tengah]_
  - VERSION DETECTION _[label cincin dalam]_
  - [tidak terbaca] _[puluhan angka mirip alamat IP sebagai tekstur dekoratif di dalam radar]_
  - Gemini Notebook _[watermark, pojok kanan bawah]_
- **Struktur visual:** Radar/sonar konsentris dengan tiga cincin: luar cyan (HOST DISCOVERY), tengah hijau (PORT SCANNING), dan dalam amber (VERSION DETECTION). Radar dilengkapi sapuan dan tekstur angka mirip IP. Di kiri ada tiga blok teks rata kanan yang terhubung lewat garis penunjuk ke cincin masing-masing, dengan warna label mengikuti warna cincin. Urutan atas → bawah sama dengan luar → dalam, sehingga terbaca sebagai penyempitan fokus. Hanya blok ketiga yang punya judul sendiri ("VERSION DETECTION").
- **Data/angka:** 65,535 TCP/UDP ports; flag nmap -sn, -sV, -O; penomoran "PHASE 2" (angka mirip IP di radar hanya dekorasi, bukan data)
- **Peluang desain ulang:** proses — tiga langkah bertingkat yang menyempit (luar → dalam) dengan pertanyaan pemandu dan perintah nmap.

## Slide 9 — The Anatomy of a Scan: TCP vs. SYN
- **Pesan utama:** TCP Connect scan menyelesaikan three-way handshake penuh sehingga andal tetapi berisik dan tercatat, sedangkan SYN stealth scan memutus koneksi dengan RST setelah SYN-ACK (half-open), lebih senyap, tetapi membutuhkan root.
- **Teks di slide (verbatim):**
  - The Anatomy of a Scan: TCP vs. SYN
  - Handshake Diagram
  - TCP Connect Scan (-sT)
    - Attacker
    - Target
    - SYN _[panah Attacker → Target]_
    - SYN-ACK _[panah Target → Attacker]_
    - ACK _[panah Attacker → Target, amber]_
    - Full Handshake. Loud, Reliable, Logged.
  - SYN Stealth Scan (-sS)
    - Attacker
    - Target
    - SYN _[panah Attacker → Target]_
    - SYN-ACK _[panah Target → Attacker]_
    - RST (Reset) _[panah Attacker → Target, hijau]_
    - Half-Open. Stealthy, Bypasses some logs, Requires Root.
  - [tidak terbaca] _[mikro-teks dekoratif pada motif sirkuit di sisi kiri tiap panel]_
  - Gemini Notebook _[watermark, pojok kanan bawah]_
- **Struktur visual:** Perbandingan berupa dua diagram sekuens berdampingan di bawah subjudul "Handshake Diagram". Setiap diagram punya garis hidup vertikal Attacker dan Target serta tiga panah diagonal yang bergantian arah. Panah ketiga dibedakan warnanya (ACK amber di kiri, RST hijau di kanan), dan warnanya sama dengan bingkai serta kotak kesimpulan di bawah setiap panel. Dekorasinya berupa graf jaringan, motif sirkuit bermikro-teks, dan radar seperempat lingkaran di dekat garis Target.
- **Data/angka:** tidak ada data numerik (hanya flag nmap -sT dan -sS)
- **Peluang desain ulang:** perbandingan — dua diagram sekuens berdampingan yang menyorot satu langkah pembeda (ACK vs RST).

## Slide 10 — DECODING THE NOISE: PORT STATES
- **Pesan utama:** Respons probe Nmap dibaca sebagai tiga status port, yaitu OPEN (target utama), CLOSED (host hidup tetapi tidak ada layanan), dan FILTERED (ada firewall/IDS), dan setiap status menuntut tindakan lanjutan yang berbeda.
- **Teks di slide (verbatim):**
  - DECODING THE NOISE: PORT STATES
  - NMAP PORT PROBE RESPONSE
  - OPEN (TARGET ACQUIRED)
    - Meaning: An application is actively accepting connections.
    - Action: Prime target for enumeration and exploitation.
  - CLOSED (HOST ALIVE, DOOR LOCKED)
    - Meaning: Port is accessible, but but no service is listening. _[kata "but" ganda memang tertulis di slide]_
    - Action: Proves the host is up; useful for mapping, but is up useful for mapping, but not a direct vector. _[frasa berulang memang tertulis di slide]_
  - FILTERED (FIREWALL DETECTED)
    - Meaning: Probes are being dropped. Nmap cannot tell if the port is open.
    - Action: Reveals active network defenses (Firewalls/IDS). Requires evasion tactics.
  - Gemini Notebook _[watermark, pojok kanan bawah]_
- **Struktur visual:** Diagram percabangan 1 → 3. Simpul pusat "NMAP PORT PROBE RESPONSE" di atas bercabang lewat jalur bergaya sirkuit ke tiga kartu sejajar: OPEN hijau di kiri, CLOSED biru-abu di tengah, dan FILTERED amber di kanan. Setiap kartu bersudut chamfer, dengan header status dan dua baris Meaning/Action berlabel tebal. Sapuan radar samar ada di latar tengah.
- **Data/angka:** tidak ada
- **Peluang desain ulang:** perbandingan — tiga kartu status (Meaning/Action) yang bercabang dari satu simpul respons.

## Slide 11 — Phase 3: Enumeration
- **Pesan utama:** Fase 3 menggali informasi rinci dari layanan yang terbuka (SMB, FTP, HTTP/HTTPS, dan SNMP), lengkap dengan target dan data yang dapat diekstrak dari setiap port.
- **Teks di slide (verbatim):**
  - Phase 3: Enumeration
  - SMB (Port 139/445)
    - Target: Windows File Shares.
    - Extraction: Hidden network shares, user lists, OS domains (smb-enum-shares).
  - FTP (Port 21)
    - Target: File Transfer Protocol.
    - Extraction: Anonymous login access, cleartext credentials, exposed directories.
  - HTTP/HTTPS (Port 80/443)
    - Target: Web Servers.
    - Extraction: Hidden admin panels, directory brute-forcing (gobuster), web frameworks.
  - SNMP (Port 161 UDP)
    - Target: Network Management.
    - Extraction: Device routing tables, process lists via default ‘public' community strings. _[kutip pembuka melengkung dan kutip penutup lurus, sesuai slide]_
  - Gemini Notebook _[watermark, pojok kanan bawah]_
- **Struktur visual:** Grid 2×2 berisi kartu bersudut chamfer dengan bingkai cyan menyala, dipisah garis silang di tengah. Setiap kartu memuat judul protokol + port, baris "Target:" dan "Extraction:" (label cyan tebal), serta ikon garis di kanan. Ikonnya: jaringan folder–server untuk SMB, server dan dokumen dengan panah transfer untuk FTP, jendela browser dengan kaca pembesar untuk HTTP/HTTPS, dan perangkat jaringan yang terhubung ke empat komputer untuk SNMP. Paletnya monokrom cyan, dengan radar samar di kanan atas.
- **Data/angka:** port 139/445 (SMB), 21 (FTP), 80/443 (HTTP/HTTPS), 161 UDP (SNMP); penomoran "Phase 3"
- **Peluang desain ulang:** konsep — grid ikon 2×2 layanan dengan nomor port sebagai elemen visual yang menonjol.

## Slide 12 — Phase 4: Vulnerability Scanning
- **Pesan utama:** Fase 4 adalah pipeline otomatis: data Nmap diolah scanner (Nessus, OpenVAS, NSE), dicocokkan dengan signature CVE, lalu menjadi laporan berprioritas dengan skor CVSS. Namun, pemindaian hanyalah penemuan otomatis, sedangkan assessment adalah validasi oleh manusia.
- **Teks di slide (verbatim):**
  - Phase 4: Vulnerability Scanning
  - Input (Raw Data)
    - Nmap port, service, and OS version data.
  - The Scanner Engine
    - Tools like Nessus, OpenVAS, or NSE (Nmap Scripting Engine) ingest the data.
  - Database Matching
    - Engine checks target versions against known CVE (Common Vulnerabilities and Exposures) signatures.
  - Output
    - A prioritized report scored via CVSS.
  - Scanning is automated discovery. Assessment is human validation.
  - Gemini Notebook _[watermark, pojok kanan bawah]_
- **Struktur visual:** Proses linear 4 langkah dari kiri ke kanan: empat kotak ikon bersudut chamfer dihubungkan panah tebal bergaya sirkuit. Ikonnya berturut-turut server berjaringan, chip dengan roda gigi, database dengan kaca pembesar dan centang, serta dokumen checklist dengan perisai-centang. Warnanya bergeser dari cyan (dua langkah pertama) ke amber (Database Matching) lalu hijau (Output). Di bawah setiap kotak ada judul langkah dengan warna yang sama dan deskripsi putih rata tengah. Kalimat penutup besar dua baris ada di bawah, dengan "automated discovery." disorot cyan dan "human validation." disorot amber. Radar samar ada di kanan atas.
- **Data/angka:** tidak ada (hanya penomoran "Phase 4")
- **Peluang desain ulang:** proses — pipeline 4 langkah dengan pernyataan kontras otomatis vs manusia sebagai penutup.

## Slide 13 — The Scanner’s Dilemma
- **Pesan utama:** Jenis pemindaian adalah dilema trade-off: scan network-based tanpa autentikasi memberi sudut pandang peretas dengan false positive tinggi, sedangkan scan host-based terautentikasi memberi sudut pandang auditor dengan false positive terendah, tetapi menuntut kepercayaan klien paling tinggi.
- **Teks di slide (verbatim):**
  - The Scanner’s Dilemma
  - Host-based _[label sumbu Y, bagian atas]_
  - Network-based _[label sumbu Y, bagian bawah]_
  - Unauthenticated _[label sumbu X, kiri]_
  - Authenticated _[label sumbu X, kanan]_
  - The Auditor’s View _[kuadran kanan atas: Host-based × Authenticated]_
    - Scanner logs in with credentials.
    - Deep inspection of patches, registry, and local configs.
    - Lowest false positives.
  - The Hacker’s View _[kuadran kiri bawah: Network-based × Unauthenticated]_
    - Scans from the outside. High false positives, identifies external attack surface.
  - Authenticated scans yield the highest fidelity but require the highest level of client trust.
  - Gemini Notebook _[watermark, pojok kanan bawah]_
- **Struktur visual:** Matriks 2×2 di atas grid, dengan sumbu Y dari Network-based ke Host-based dan sumbu X dari Unauthenticated ke Authenticated. Hanya dua kuadran diagonal yang terisi dan berbingkai cyan menyala: kiri bawah "The Hacker’s View" dengan ikon kaca pembesar yang dikelilingi panah ke dalam, dan kanan atas "The Auditor’s View" dengan ikon server dan perisai-centang. Dua kuadran lainnya kosong. Banner hijau dengan ikon chip di bagian bawah memuat kesimpulan. Paletnya cyan di atas latar slate gelap.
- **Data/angka:** tidak ada
- **Peluang desain ulang:** perbandingan — matriks 2×2 yang mengontraskan dua sudut pandang pemindaian dengan trade-off fidelitas vs kepercayaan.

## Slide 14 — The Analyst’s Burden: Navigating the Noise
- **Pesan utama:** Ribuan alert mentah dari scanner harus disaring analis (membuang false positive, memvalidasi secara manual, dan menimbang konteks bisnis) sampai menjadi intelijen kritis yang dapat ditindaklanjuti, karena laporan scanner yang belum diverifikasi bukanlah penetration test.
- **Teks di slide (verbatim):**
  - The Analyst’s Burden: Navigating the Noise
  - Thousands of Raw Scanner Alerts
    - (Nessus/OpenVAS output)
  - False Positive Removal & Manual Validation
  - Business Logic & Environmental Context
    - (Is it internet-facing? Does it hold PII?)
  - Critical Actionable Intelligence
  - Tools are rigid. Analysts are smart. An unverified scanner report is not a penetration test. _[kalimat terakhir dicetak tebal]_
  - Gemini Notebook _[watermark, pojok kanan bawah]_
- **Struktur visual:** Corong wireframe 4 tingkat yang menyempit dari atas ke bawah, bermotif simpul jaringan, dengan warna bergeser cyan → amber → hijau. Label tingkat 1–2 berada di dalam corong, sedangkan tingkat 3–4 ditulis rata kanan di sisi kiri corong. Cahaya hijau memancar dari ujung corong. Di kanan ada kotak callout bersudut chamfer yang kalimat terakhirnya dicetak tebal, dan radar samar ada di kanan atas.
- **Data/angka:** tidak ada angka; hanya kuantitas verbal "Thousands" (ribuan alert mentah)
- **Peluang desain ulang:** proses — corong penyaringan 4 tahap dari ribuan alert menjadi intelijen kritis.

## Slide 15 — The Ethical Hacker’s Arc
- **Pesan utama:** Peretasan etis adalah alur naik lima tahap (Authorization, OSINT & Recon, Network Scanning, Enumeration, dan Vuln Analysis), dan penguasaan sejati memadukan kedalaman teknis dengan integritas: membobol sistem hanya untuk membuatnya lebih kuat.
- **Teks di slide (verbatim):**
  - The Ethical Hacker’s Arc
  - Authorization
    - The Legal Shield
  - OSINT & Recon
    - The Silent Observer
  - Network Scanning
    - Mapping the Perimeter
  - Enumeration
    - Extracting the Intel
  - Vuln Analysis
    - Scoring the Risk
  - True mastery is the combination of relentless technical depth and unyielding integrity. We break systems only to build them stronger.
  - Gemini Notebook _[watermark, pojok kanan bawah]_
- **Struktur visual:** Alur naik diagonal dari kiri bawah ke kanan atas berisi 5 simpul lingkaran berikon: gulungan dokumen dengan perisai, mata dengan globe, radar, brankas dengan server, dan perisai-centang dengan grafik naik. Label tahap dan subjudulnya mengikuti kenaikan garis. Warna garis dan simpul cyan bergeser ke hijau, dan tahap terakhir paling terang. Subjudul tahap menggemakan judul slide sebelumnya ("The Legal Shield", "The Silent Observer", "Perimeter"). Kalimat penutup besar tiga baris bergradasi cyan → hijau ada di bawah, dengan ornamen titik-garis dan radar kecil.
- **Data/angka:** tidak ada (lima tahap tanpa nomor)
- **Peluang desain ulang:** penutup — rangkuman perjalanan 5 tahap yang naik, ditutup dengan pernyataan nilai.
