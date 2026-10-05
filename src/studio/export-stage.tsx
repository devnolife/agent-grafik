import { useEffect, useState } from "react";
import type { DeckDefinition } from "@/slides/types";

/** Marks the document as an export page and signals readiness once fonts, images and layout have settled. */
function useExportDocument(print: boolean) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("is-export");
    if (print) root.classList.add("is-print");

    let cancelled = false;
    const images = Array.from(document.images, (image) => image.decode().catch(() => undefined));
    void Promise.all([document.fonts.ready, ...images]).then(() => {
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          if (!cancelled) setReady(true);
        }),
      );
    });

    return () => {
      cancelled = true;
      root.classList.remove("is-export", "is-print");
    };
  }, [print]);

  return ready;
}

/** Renders one slide at 1920×1080 with no chrome — used for screenshots and PPTX capture. */
export function ExportStage({ deck, slideNumber }: { deck: DeckDefinition; slideNumber: number }) {
  const ready = useExportDocument(false);
  const slide = deck.slides[slideNumber - 1];

  if (!slide) {
    return <p data-export-error="">{`Slide ${slideNumber} tidak ada di deck "${deck.slug}".`}</p>;
  }

  const SlideComponent = slide.component;
  return (
    <div id="export-stage" data-slide-id={slide.id} data-export-ready={ready ? "" : undefined}>
      <SlideComponent />
    </div>
  );
}

/** Renders every slide as its own 1920×1080 page — used for the vector PDF. */
export function PrintStage({ deck }: { deck: DeckDefinition }) {
  const ready = useExportDocument(true);

  return (
    <div id="print-stage" data-export-ready={ready ? "" : undefined}>
      {deck.slides.map(({ id, component: SlideComponent }) => (
        <section key={id} className="print-page" data-slide-id={id}>
          <SlideComponent />
        </section>
      ))}
    </div>
  );
}
