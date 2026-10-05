import type { DeckDefinition } from "@/slides/types";
import { CoverSlide } from "./slides/cover";
import { EquationSlide } from "./slides/equation";
import { PillarsSlide } from "./slides/pillars";
import { deckTitle } from "./tokens";

const deck: DeckDefinition = {
  slug: "ethical-hacking",
  title: deckTitle,
  subtitle: "From Legal Frameworks to Precision Vulnerability Analysis",
  author: "Presentation Designer",
  lang: "en",
  slides: [
    {
      id: "cover",
      title: "Cover: anatomy of an ethical hack",
      archetype: "cover",
      component: CoverSlide,
      notes:
        "Buka dengan gambaran besar: ethical hacking adalah proses berlapis, dari pengamatan pasif yang luas sampai analisis kerentanan yang presisi. Empat lingkaran pada gambar mewakili empat fase: footprinting & reconnaissance, scanning, enumeration, dan vulnerability scanning.\n\nTekankan sejak awal bahwa semua pengujian hanya sah dengan otorisasi tertulis.\n\nSumber: The_Blueprint_of_Ethical_Hacking.pptx, slide 1, 6, 8, 11, 12.",
    },
    {
      id: "pillars",
      title: "CIA triad dan perlindungan hukum",
      archetype: "konsep",
      component: PillarsSlide,
      notes:
        "Kiri: yang diuji adalah tiga pilar keamanan, yaitu confidentiality, integrity, dan availability. Jika satu pilar retak, sistem runtuh.\n\nKanan: sebelum menyentuh sistem, penguji membutuhkan tiga lapis perlindungan, yaitu ruang lingkup yang jelas, NDA/kontrak, dan otorisasi tertulis. Otorisasi tertulis adalah perisai hukum utama terhadap undang-undang kejahatan siber.\n\nSumber: The_Blueprint_of_Ethical_Hacking.pptx, slide 3.",
    },
    {
      id: "equation",
      title: "Persamaan kerentanan dan risiko",
      archetype: "data",
      component: EquationSlide,
      notes:
        "Risk adalah hasil dari threat × vulnerability × impact, dan diprioritaskan dengan skor CVSS 0.0–10.0. Bedakan CWE (kategori kelemahan, misalnya CWE-89 SQL injection) dari CVE (kerentanan spesifik yang diketahui, misalnya CVE-2014-0160 Heartbleed).\n\nPesan utamanya: base CVSS saja tidak cukup. Konteks lingkungan dapat menggeser posisi temuan pada matriks likelihood × impact, sehingga konteks itulah yang menentukan risiko bisnis yang sebenarnya.\n\nSumber: The_Blueprint_of_Ethical_Hacking.pptx, slide 5.",
    },
  ],
};

export default deck;
