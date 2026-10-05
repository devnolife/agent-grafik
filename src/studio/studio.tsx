import { Check, ChevronLeft, ChevronRight, Copy, Download, NotebookText, Play } from "lucide-react";
import { useCallback, useEffect, useEffectEvent, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Toggle } from "@/components/ui/toggle";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { SLIDE_WIDTH } from "@/slides/primitives";
import type { DeckDefinition, SlideDefinition } from "@/slides/types";
import { SlideViewport } from "@/studio/slide-viewport";

const THUMB_WIDTH = 196;
const pad = (value: number) => String(value).padStart(2, "0");

function readInitialIndex(total: number) {
  const requested = Number(new URLSearchParams(window.location.search).get("slide") ?? "1") - 1;
  return Number.isFinite(requested) ? Math.min(Math.max(requested, 0), total - 1) : 0;
}

export function Studio({ deck }: { deck: DeckDefinition }) {
  const total = deck.slides.length;
  const [index, setIndex] = useState(() => readInitialIndex(total));
  const [notesOpen, setNotesOpen] = useState(true);
  const [presenting, setPresenting] = useState(false);

  const go = useCallback(
    (delta: number) => setIndex((current) => Math.min(Math.max(current + delta, 0), total - 1)),
    [total],
  );
  const exitPresent = useCallback(() => setPresenting(false), []);

  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("deck", deck.slug);
    url.searchParams.set("slide", String(index + 1));
    window.history.replaceState(null, "", url);
  }, [deck.slug, index]);

  const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
    const target = event.target instanceof HTMLElement ? event.target : null;
    if (target?.closest("input, textarea, select, [contenteditable='true']")) return;

    switch (event.key) {
      case "ArrowRight":
      case "PageDown":
        event.preventDefault();
        go(1);
        break;
      case " ":
        if (target?.closest("button, a")) return;
        event.preventDefault();
        go(1);
        break;
      case "ArrowLeft":
      case "PageUp":
        event.preventDefault();
        go(-1);
        break;
      case "Home":
        setIndex(0);
        break;
      case "End":
        setIndex(total - 1);
        break;
      case "f":
      case "F":
        setPresenting(true);
        break;
      case "n":
      case "N":
        setNotesOpen((open) => !open);
        break;
      case "Escape":
        setPresenting(false);
        break;
    }
  });

  useEffect(() => {
    const listener = (event: KeyboardEvent) => onKeyDown(event);
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);

  const slide = deck.slides[index];
  const CurrentSlide = slide.component;

  return (
    <div className="grid h-dvh grid-rows-[auto_minmax(0,1fr)] bg-background text-foreground">
      <header className="flex h-14 items-center gap-4 border-b px-4">
        <div className="min-w-0">
          <h1 className="truncate text-sm font-medium">{deck.title}</h1>
          <p className="text-xs text-muted-foreground tabular-nums">
            {total} slide · 1920 × 1080 · PPTX + PDF
          </p>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger
              render={
                <Toggle
                  size="sm"
                  variant="outline"
                  aria-label="Catatan pembicara"
                  pressed={notesOpen}
                  onPressedChange={setNotesOpen}
                />
              }
            >
              <NotebookText />
            </TooltipTrigger>
            <TooltipContent>
              Catatan pembicara <Kbd>N</Kbd>
            </TooltipContent>
          </Tooltip>
          <ExportPopover slug={deck.slug} />
          <Button size="sm" onClick={() => setPresenting(true)}>
            <Play data-icon="inline-start" />
            Presentasikan
            <Kbd className="ml-1 bg-primary-foreground/15 text-primary-foreground">F</Kbd>
          </Button>
        </div>
      </header>

      <div className="grid min-h-0 grid-cols-[232px_minmax(0,1fr)]">
        <nav aria-label="Daftar slide" className="min-h-0 border-r">
          <ScrollArea className="h-full">
            <ol className="flex flex-col gap-1 p-3">
              {deck.slides.map((item, itemIndex) => (
                <SlideThumb
                  key={item.id}
                  slide={item}
                  number={itemIndex + 1}
                  active={itemIndex === index}
                  onSelect={() => setIndex(itemIndex)}
                />
              ))}
            </ol>
          </ScrollArea>
        </nav>

        <main className="flex min-h-0 flex-col">
          <div className="min-h-0 flex-1 p-6">
            <SlideViewport frameClassName="rounded-md shadow-2xl shadow-black/40 ring-1 ring-foreground/10">
              <CurrentSlide />
            </SlideViewport>
          </div>

          <div className="flex items-center gap-4 border-t px-4 py-2">
            <p className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
              <span className="text-foreground">{slide.title}</span>
              <span className="ml-2 font-mono text-xs">#{slide.id}</span>
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Slide sebelumnya"
                disabled={index === 0}
                onClick={() => go(-1)}
              >
                <ChevronLeft />
              </Button>
              <span className="min-w-16 text-center text-sm tabular-nums" aria-live="polite">
                {pad(index + 1)} / {pad(total)}
              </span>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Slide berikutnya"
                disabled={index === total - 1}
                onClick={() => go(1)}
              >
                <ChevronRight />
              </Button>
            </div>
          </div>

          {notesOpen && (
            <section aria-label="Catatan pembicara" className="max-h-44 overflow-y-auto border-t px-4 py-3">
              <div className="mb-1.5 flex items-center gap-2">
                <h2 className="text-xs font-medium text-muted-foreground">Catatan pembicara</h2>
                {!slide.notes && <Badge variant="outline">kosong</Badge>}
              </div>
              <p className="max-w-[72ch] text-sm leading-relaxed whitespace-pre-line text-pretty">
                {slide.notes || "Belum ada catatan untuk slide ini."}
              </p>
            </section>
          )}
        </main>
      </div>

      {presenting && <PresentMode slide={slide} number={index + 1} onNext={() => go(1)} onExit={exitPresent} />}
    </div>
  );
}

function SlideThumb({
  slide,
  number,
  active,
  onSelect,
}: {
  slide: SlideDefinition;
  number: number;
  active: boolean;
  onSelect: () => void;
}) {
  const ThumbSlide = slide.component;
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (active) buttonRef.current?.scrollIntoView({ block: "nearest" });
  }, [active]);

  return (
    <li>
      <button
        ref={buttonRef}
        type="button"
        onClick={onSelect}
        aria-current={active ? "true" : undefined}
        aria-label={`Slide ${number}: ${slide.title}`}
        className="group flex w-full flex-col gap-1.5 rounded-lg p-1.5 text-left outline-none transition-colors duration-150 hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring aria-[current]:bg-muted"
      >
        <span
          className="relative block overflow-hidden rounded-md ring-1 ring-foreground/10 group-aria-[current]:ring-2 group-aria-[current]:ring-foreground/70"
          style={{ width: THUMB_WIDTH, aspectRatio: "16 / 9" }}
        >
          <span
            inert
            aria-hidden="true"
            className="pointer-events-none absolute top-0 left-0 block origin-top-left"
            style={{ transform: `scale(${THUMB_WIDTH / SLIDE_WIDTH})` }}
          >
            <ThumbSlide />
          </span>
        </span>
        <span className="flex min-w-0 items-baseline gap-2 px-0.5 text-xs">
          <span className="font-mono text-muted-foreground tabular-nums">{pad(number)}</span>
          <span className="truncate">{slide.title}</span>
        </span>
      </button>
    </li>
  );
}

function PresentMode({
  slide,
  number,
  onNext,
  onExit,
}: {
  slide: SlideDefinition;
  number: number;
  onNext: () => void;
  onExit: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const PresentedSlide = slide.component;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();
    dialog.requestFullscreen?.().catch(() => undefined);

    function onFullscreenChange() {
      if (!document.fullscreenElement) onExit();
    }
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
      if (dialog.open) dialog.close();
    };
  }, [onExit]);

  return (
    <dialog
      ref={dialogRef}
      aria-label={`Mode presentasi, slide ${number}`}
      onCancel={(event) => {
        event.preventDefault();
        onExit();
      }}
      className="m-0 h-dvh max-h-none w-dvw max-w-none border-0 bg-black p-0 outline-none backdrop:bg-black"
    >
      <SlideViewport>
        <div key={slide.id} className="slide-enter slide-animate">
          <PresentedSlide />
        </div>
      </SlideViewport>
      <button
        type="button"
        autoFocus
        aria-label="Slide berikutnya"
        onClick={onNext}
        className="absolute inset-0 cursor-none outline-none"
      />
    </dialog>
  );
}

function ExportPopover({ slug }: { slug: string }) {
  const command = `npm run export -- ${slug}`;
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timeout = window.setTimeout(() => setCopied(false), 1600);
    return () => window.clearTimeout(timeout);
  }, [copied]);

  return (
    <Popover>
      <PopoverTrigger render={<Button variant="outline" size="sm" />}>
        <Download data-icon="inline-start" />
        Ekspor
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        <PopoverHeader>
          <PopoverTitle>Ekspor PPTX + PDF</PopoverTitle>
          <PopoverDescription>
            Jalankan di terminal proyek. Semua hasil masuk ke <code className="font-mono">output/{slug}/</code>.
          </PopoverDescription>
        </PopoverHeader>
        <div className="flex items-center gap-2 rounded-md bg-muted py-1 pr-1 pl-2.5">
          <code className="min-w-0 flex-1 truncate font-mono text-xs">{command}</code>
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label={copied ? "Perintah tersalin" : "Salin perintah"}
            onClick={() => {
              void navigator.clipboard.writeText(command).then(() => setCopied(true));
            }}
          >
            {copied ? <Check /> : <Copy />}
          </Button>
        </div>
        <ul className="flex flex-col gap-1 text-xs text-muted-foreground">
          <li>
            <span className="font-mono text-foreground">{slug}.pptx</span>: teks dan bentuk dapat diedit
          </li>
          <li>
            <span className="font-mono text-foreground">{slug}.pdf</span>: vektor, sama persis dengan browser
          </li>
          <li>
            <span className="font-mono text-foreground">qa-report.md</span>: temuan per slide dan selisih render
          </li>
        </ul>
      </PopoverContent>
    </Popover>
  );
}
