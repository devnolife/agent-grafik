import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  NotebookText,
  PanelRight,
  Play,
  Sparkles,
  WandSparkles,
} from "lucide-react";
import { useCallback, useEffect, useEffectEvent, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import type { DeckSpec } from "@/engine/spec";
import { cn } from "@/lib/utils";
import { SLIDE_WIDTH } from "@/slides/primitives";
import type { DeckDefinition, SlideDefinition } from "@/slides/types";
import { ActivityDock } from "@/studio/activity";
import { useAgent } from "@/studio/agent-client";
import { CreateSheet, type CreateTab } from "@/studio/create-sheet";
import { Inspector } from "@/studio/inspector";
import { SlideViewport } from "@/studio/slide-viewport";

const THUMB_WIDTH = 196;
const pad = (value: number) => String(value).padStart(2, "0");

function readInitialIndex(slug: string, total: number) {
  const params = new URLSearchParams(window.location.search);
  if (params.get("deck") !== slug) return 0;
  const requested = Number(params.get("slide") ?? "1") - 1;
  return Number.isFinite(requested) ? Math.min(Math.max(requested, 0), total - 1) : 0;
}

function usePersistentFlag(key: string, initial: boolean) {
  const [value, setValue] = useState(() => {
    try {
      const stored = window.localStorage.getItem(key);
      return stored === null ? initial : stored === "1";
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      window.localStorage.setItem(key, value ? "1" : "0");
    } catch {
      // storage can be unavailable (private mode); the flag just won't persist
    }
  }, [key, value]);
  return [value, setValue] as const;
}

export function Studio({
  deck,
  decks,
  spec,
  onSelectDeck,
}: {
  deck: DeckDefinition;
  decks: DeckDefinition[];
  spec?: DeckSpec;
  onSelectDeck: (slug: string) => void;
}) {
  const { online, status, job } = useAgent();
  const total = deck.slides.length;
  const [index, setIndex] = useState(() => readInitialIndex(deck.slug, total));
  const [shownSlug, setShownSlug] = useState(deck.slug);
  if (shownSlug !== deck.slug) {
    setShownSlug(deck.slug);
    setIndex(0);
  }
  const current = Math.min(index, total - 1);
  const [notesOpen, setNotesOpen] = usePersistentFlag("studio.notes", true);
  const [inspectorOpen, setInspectorOpen] = usePersistentFlag("studio.inspector", true);
  const [presenting, setPresenting] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createTab, setCreateTab] = useState<CreateTab>("deck");

  const go = useCallback(
    (delta: number) => setIndex((value) => Math.min(Math.max(Math.min(value, total - 1) + delta, 0), total - 1)),
    [total],
  );
  const exitPresent = useCallback(() => setPresenting(false), []);

  // Follow a deck the agent is writing, so its slides fill in on screen.
  const followed = useRef<string | null>(null);
  useEffect(() => {
    if (job?.kind === "deck" && job.status === "running" && job.slug && followed.current !== job.id) {
      followed.current = job.id;
      onSelectDeck(job.slug);
    }
  }, [job, onSelectDeck]);

  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("deck", deck.slug);
    url.searchParams.set("slide", String(current + 1));
    window.history.replaceState(null, "", url);
  }, [deck.slug, current]);

  const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
    const target = event.target instanceof HTMLElement ? event.target : null;
    if (target?.closest("input, textarea, select, [contenteditable='true'], [role='dialog'], [role='menu'], [role='listbox']")) return;

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
      case "i":
      case "I":
        setInspectorOpen((open) => !open);
        break;
      case "g":
      case "G":
        if (online) setCreateOpen(true);
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

  const slide = deck.slides[current];
  const CurrentSlide = slide.component;
  const agentState =
    online === false
      ? { tone: "bg-red-400", label: "Agent offline" }
      : !status
        ? { tone: "bg-muted-foreground", label: "Memeriksa agent…" }
        : status.ollama.ok && status.comfy.ok && status.comfy.models
          ? { tone: "bg-emerald-400", label: `Siap · ${status.comfy.devices.length}× GPU` }
          : { tone: "bg-amber-400", label: status.ollama.ok ? "FLUX.2 tidak siap" : "Ollama tidak siap" };

  return (
    <div className="grid h-dvh grid-rows-[auto_minmax(0,1fr)] bg-background text-foreground">
      <header className="flex h-14 items-center gap-3 border-b px-3">
        <div className="flex items-center gap-2 pr-1">
          <span className="brand-gradient flex size-7 items-center justify-center rounded-lg shadow-sm">
            <Sparkles className="size-4" aria-hidden="true" />
          </span>
          <span className="hidden text-sm font-semibold tracking-tight lg:inline">Agent Grafik</span>
        </div>

        <DeckSwitcher deck={deck} decks={decks} generated={Boolean(spec)} onSelect={onSelectDeck} />

        <div className="ml-auto flex items-center gap-1.5">
          <span className="mr-1 hidden items-center gap-1.5 text-xs text-muted-foreground md:flex" title={status?.comfy.message}>
            <span className={cn("size-1.5 rounded-full", agentState.tone)} aria-hidden="true" />
            {agentState.label}
          </span>
          <Tooltip>
            <TooltipTrigger
              render={
                <Toggle size="sm" variant="outline" aria-label="Catatan pembicara" pressed={notesOpen} onPressedChange={setNotesOpen} />
              }
            >
              <NotebookText />
            </TooltipTrigger>
            <TooltipContent>
              Catatan pembicara <Kbd>N</Kbd>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger
              render={
                <Toggle size="sm" variant="outline" aria-label="Panel deck" pressed={inspectorOpen} onPressedChange={setInspectorOpen} />
              }
            >
              <PanelRight />
            </TooltipTrigger>
            <TooltipContent>
              Panel deck <Kbd>I</Kbd>
            </TooltipContent>
          </Tooltip>
          {online === false && <ExportPopover slug={deck.slug} />}
          <Button size="sm" variant="outline" onClick={() => setPresenting(true)}>
            <Play data-icon="inline-start" />
            Presentasikan
            <Kbd className="ml-1">F</Kbd>
          </Button>
          <Button size="sm" className="brand-gradient hover:opacity-90" disabled={!online} onClick={() => setCreateOpen(true)}>
            <WandSparkles data-icon="inline-start" />
            Buat dengan AI
          </Button>
        </div>
      </header>

      <div className={cn("grid min-h-0", inspectorOpen ? "grid-cols-[232px_minmax(0,1fr)_300px]" : "grid-cols-[232px_minmax(0,1fr)]")}>
        <nav aria-label="Daftar slide" className="min-h-0 border-r">
          <ScrollArea className="h-full">
            <ol className="flex flex-col gap-1 p-3">
              {deck.slides.map((item, itemIndex) => (
                <SlideThumb
                  key={item.id}
                  slide={item}
                  number={itemIndex + 1}
                  active={itemIndex === current}
                  onSelect={() => setIndex(itemIndex)}
                />
              ))}
            </ol>
          </ScrollArea>
        </nav>

        <main className="flex min-h-0 flex-col">
          <div className="studio-canvas min-h-0 flex-1 p-8">
            <SlideViewport frameClassName="rounded-xl shadow-2xl shadow-black/60 ring-1 ring-white/10">
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
                disabled={current === 0}
                onClick={() => go(-1)}
              >
                <ChevronLeft />
              </Button>
              <span className="min-w-16 text-center text-sm tabular-nums" aria-live="polite">
                {pad(current + 1)} / {pad(total)}
              </span>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Slide berikutnya"
                disabled={current === total - 1}
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

        {inspectorOpen && <Inspector deck={deck} spec={spec} slideIndex={current} />}
      </div>

      <CreateSheet open={createOpen} onOpenChange={setCreateOpen} tab={createTab} onTabChange={setCreateTab} />
      <ActivityDock hidden={createOpen || presenting} />
      {presenting && <PresentMode slide={slide} number={current + 1} onNext={() => go(1)} onExit={exitPresent} />}
    </div>
  );
}

function DeckSwitcher({
  deck,
  decks,
  generated,
  onSelect,
}: {
  deck: DeckDefinition;
  decks: DeckDefinition[];
  generated: boolean;
  onSelect: (slug: string) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" className="h-10 max-w-[min(46vw,520px)] justify-start gap-2 px-2 text-left" aria-label="Ganti deck" />}
      >
        <span className="flex min-w-0 flex-col">
          <span className="flex items-center gap-1.5">
            <span className="truncate text-sm font-medium">{deck.title}</span>
            {generated && (
              <Badge variant="outline" className="h-4 shrink-0 border-brand/40 px-1 text-[10px] text-brand">
                AI
              </Badge>
            )}
          </span>
          <span className="text-xs font-normal text-muted-foreground tabular-nums">
            {deck.slides.length} slide · 1920 × 1080 · PPTX + PDF
          </span>
        </span>
        <ChevronDown className="ml-1 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-80">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Deck</DropdownMenuLabel>
          {decks.map((item) => (
            <DropdownMenuItem key={item.slug} onClick={() => onSelect(item.slug)} className="flex items-start gap-2 py-1.5">
              <Check className={cn("mt-0.5", item.slug === deck.slug ? "opacity-100" : "opacity-0")} />
              <span className="flex min-w-0 flex-col">
                <span className="truncate">{item.title}</span>
                <span className="truncate font-mono text-[11px] text-muted-foreground">
                  {item.slug} · {item.slides.length} slide
                </span>
              </span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <p className="px-1.5 py-1 text-[11px] text-muted-foreground">
          Deck AI tersimpan di <span className="font-mono">src/decks/generated/</span>
        </p>
      </DropdownMenuContent>
    </DropdownMenu>
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
          className="relative block overflow-hidden rounded-md ring-1 ring-foreground/10 group-aria-[current]:ring-2 group-aria-[current]:ring-brand"
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
