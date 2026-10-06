import { FileDown, ImageIcon, RefreshCw, TriangleAlert } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { assetUrl } from "@/engine/registry";
import type { DeckSpec, LayoutId, ThemeId } from "@/engine/spec";
import { THEMES } from "@/engine/themes";
import type { DeckDefinition } from "@/slides/types";
import { useAgent } from "./agent-client";
import { ThemeSwatches } from "./theme-swatches";

const LAYOUT_LABEL: Record<LayoutId, string> = {
  cover: "Sampul",
  section: "Pembatas bagian",
  cards: "Kartu",
  steps: "Langkah",
  compare: "Perbandingan",
  stats: "Angka",
  quote: "Kutipan",
  split: "Teks + gambar",
  closing: "Penutup",
};

type IconMode = "lucide" | "solid" | "outline";

function iconMode(spec: DeckSpec): IconMode {
  for (const slide of spec.slides) {
    for (const target of [...(slide.items ?? []), ...(slide.columns ?? [])]) {
      if (target.iconSrc?.startsWith("icon-outline-")) return "outline";
      if (target.iconSrc) return "solid";
    }
  }
  return "lucide";
}

function Section({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="flex flex-col gap-2.5 border-b px-4 py-4 last:border-b-0">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

const dateFormat = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" });

/** Right-hand panel: deck facts, theme, icon style, the current slide's picture, export. */
export function Inspector({ deck, spec, slideIndex }: { deck: DeckDefinition; spec?: DeckSpec; slideIndex: number }) {
  const { online, job, post } = useAgent();
  const [error, setError] = useState<string | null>(null);
  const busy = job?.status === "running";
  const working = busy && job.slug === deck.slug;
  const slide = spec?.slides[slideIndex];
  const pictures = spec?.slides.filter((item) => item.image).length ?? 0;

  const act = (path: string, body: object) => {
    setError(null);
    post(path, body).catch((failure: Error) => setError(failure.message));
  };

  return (
    <aside aria-label="Panel deck" className="min-h-0 border-l bg-card/40">
      <ScrollArea className="h-full">
        <Section title="Deck">
          <div className="flex flex-col gap-1">
            <p className="text-sm leading-snug font-medium text-balance">{deck.title}</p>
            {deck.subtitle && <p className="line-clamp-2 text-xs text-muted-foreground">{deck.subtitle}</p>}
          </div>
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
            <dt className="text-muted-foreground">Slide</dt>
            <dd className="tabular-nums">{deck.slides.length}</dd>
            {spec ? (
              <>
                <dt className="text-muted-foreground">Isi</dt>
                <dd className="truncate">{spec.meta?.model ?? "–"}</dd>
                <dt className="text-muted-foreground">Gambar</dt>
                <dd className="truncate">{spec.meta?.imageModel ?? "–"}</dd>
                {spec.meta?.generatedAt && (
                  <>
                    <dt className="text-muted-foreground">Dibuat</dt>
                    <dd>{dateFormat.format(new Date(spec.meta.generatedAt))}</dd>
                  </>
                )}
              </>
            ) : (
              <>
                <dt className="text-muted-foreground">Sumber</dt>
                <dd className="font-mono">src/decks/{deck.slug}/</dd>
              </>
            )}
          </dl>
          {!spec && <p className="text-xs text-muted-foreground">Deck ini dibuat dengan kode React; ubah lewat berkasnya.</p>}
        </Section>

        {spec?.meta?.warnings && (
          <Section title="Perlu dicek" action={<Badge variant="outline">{spec.meta.warnings.length}</Badge>}>
            <ul className="flex flex-col gap-1.5">
              {spec.meta.warnings.map((warning) => (
                <li key={warning} className="flex items-start gap-1.5 text-xs text-amber-300/90">
                  <TriangleAlert className="mt-px size-3.5 shrink-0" />
                  {warning}
                </li>
              ))}
            </ul>
          </Section>
        )}

        {spec && (
          <Section title="Tema">
            <ThemeSwatches
              value={spec.theme}
              disabled={!online || working}
              onChange={(theme: ThemeId) => act("theme", { slug: deck.slug, theme })}
            />
            {pictures > 0 && (
              <Button
                variant="outline"
                size="sm"
                disabled={!online || busy}
                onClick={() => act("repaint", { slug: deck.slug })}
                title={`Lukis ulang ${pictures} gambar dengan gaya tema ${THEMES[spec.theme].name}`}
              >
                <RefreshCw data-icon="inline-start" />
                Selaraskan {pictures} gambar dengan tema
              </Button>
            )}
          </Section>
        )}

        {spec && (
          <Section title="Ikon">
            <ToggleGroup
              aria-label="Gaya ikon deck"
              variant="outline"
              size="sm"
              spacing={0}
              value={[iconMode(spec)]}
              disabled={!online || busy}
              onValueChange={(values: string[]) => {
                if (values[0]) act("restyle", { slug: deck.slug, icons: values[0] });
              }}
              className="w-full"
            >
              <ToggleGroupItem value="lucide" className="flex-1 data-pressed:bg-brand/15">
                Lucide
              </ToggleGroupItem>
              <ToggleGroupItem value="solid" className="flex-1 data-pressed:bg-brand/15">
                AI solid
              </ToggleGroupItem>
              <ToggleGroupItem value="outline" className="flex-1 data-pressed:bg-brand/15">
                AI garis
              </ToggleGroupItem>
            </ToggleGroup>
            <p className="text-xs text-muted-foreground">Ganti gaya menggambar ulang semua ikon deck (±1 menit).</p>
          </Section>
        )}

        {slide && (
          <Section title={`Slide ${slideIndex + 1}`} action={<Badge variant="outline">{LAYOUT_LABEL[slide.layout]}</Badge>}>
            {slide.image ? (
              <div className="flex flex-col gap-2.5">
                <div className="overflow-hidden rounded-lg bg-muted ring-1 ring-foreground/10">
                  {assetUrl(deck.slug, slide.image.src) ? (
                    <img src={assetUrl(deck.slug, slide.image.src)} alt={slide.image.alt} className="aspect-[8/9] w-full object-cover" />
                  ) : (
                    <div className="flex aspect-[8/9] w-full items-center justify-center text-muted-foreground">
                      <ImageIcon className="size-6" />
                    </div>
                  )}
                </div>
                <p className="line-clamp-4 text-xs text-muted-foreground" title={slide.image.prompt}>
                  {slide.image.prompt}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!online || busy}
                  onClick={() => act("repaint", { slug: deck.slug, slideId: slide.id })}
                >
                  <RefreshCw data-icon="inline-start" />
                  Gambar baru
                </Button>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Slide ini tanpa gambar.</p>
            )}
          </Section>
        )}

        <Section title="Ekspor">
          <p className="text-xs text-muted-foreground">PPTX (teks dapat diedit), PDF vektor, dan laporan QA ke output/{deck.slug}/.</p>
          <Button size="sm" disabled={!online || busy} onClick={() => act("export", { slug: deck.slug })}>
            <FileDown data-icon="inline-start" />
            Ekspor PPTX + PDF
          </Button>
        </Section>

        {error && (
          <p role="alert" className="flex items-start gap-1.5 px-4 pb-4 text-xs text-destructive">
            <TriangleAlert className="mt-px size-3.5 shrink-0" />
            {error}
          </p>
        )}
      </ScrollArea>
    </aside>
  );
}
