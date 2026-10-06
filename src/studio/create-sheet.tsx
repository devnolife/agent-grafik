import { FileUp, ImageIcon, LoaderCircle, Presentation, Shapes, WandSparkles } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { ThemeId } from "@/engine/spec";
import { THEMES } from "@/engine/themes";
import { cn } from "@/lib/utils";
import { JobProgress } from "./activity";
import { fileUrl, useAgent, type ResultFile } from "./agent-client";
import { ThemeSwatches } from "./theme-swatches";

export type CreateTab = "deck" | "icons" | "images";

type IconMode = "lucide" | "solid" | "outline";
type Quality = "turbo" | "full";

interface DeckForm {
  brief: string;
  sources: string;
  slides: string;
  lang: string;
  theme: ThemeId;
  icons: IconMode;
  images: boolean;
  review: boolean;
  quality: Quality;
  model: string;
  author: string;
}

const SLIDE_COUNTS = ["5", "7", "10", "12", "15"];
const NOT_PLANNERS = /embed|bge|nomic|minilm|vl\b|vision|llava/i;
const PICTURE_STYLES: { value: ThemeId | "free"; label: string }[] = [
  { value: "free", label: "Bebas (prompt apa adanya)" },
  ...Object.values(THEMES).map((theme) => ({ value: theme.id, label: `Tema ${theme.name}` })),
];

/** Single-choice segmented control on top of ToggleGroup (which works with value arrays). */
function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
  disabled,
}: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: ReactNode; disabled?: boolean }[];
  label: string;
  disabled?: boolean;
}) {
  return (
    <ToggleGroup
      aria-label={label}
      variant="outline"
      size="sm"
      spacing={0}
      value={[value]}
      disabled={disabled}
      onValueChange={(values: string[]) => {
        if (values[0]) onChange(values[0] as T);
      }}
      className="w-full"
    >
      {options.map((option) => (
        <ToggleGroupItem
          key={option.value}
          value={option.value}
          disabled={option.disabled}
          className="flex-1 data-pressed:bg-brand/15 data-pressed:text-foreground"
        >
          {option.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

function SwitchRow({
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <Field orientation="horizontal" data-disabled={disabled || undefined}>
      <div className="flex flex-1 flex-col gap-0.5">
        <FieldLabel>{label}</FieldLabel>
        <FieldDescription className="text-xs">{description}</FieldDescription>
      </div>
      <Switch aria-label={label} checked={checked} onCheckedChange={onChange} disabled={disabled} />
    </Field>
  );
}

function StatusLine() {
  const { online, status } = useAgent();
  if (online === false) {
    return (
      <p className="rounded-md border border-destructive/40 bg-destructive/10 px-2.5 py-1.5 text-xs text-destructive">
        API agent tidak aktif. Jalankan <code className="font-mono">npm run dev</code> di server.
      </p>
    );
  }
  const gpus = status?.comfy.devices ?? [];
  const items = [
    { ok: status?.ollama.ok, label: status ? `Ollama · ${status.ollama.planner}` : "Ollama" },
    {
      ok: status?.comfy.ok && status.comfy.models,
      label: gpus.length ? `FLUX.2 · ${gpus.length}× ${gpus[0].name.replace(/^NVIDIA\s+/, "")}` : "FLUX.2",
    },
  ];
  return (
    <ul className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground">
          <span
            className={cn("size-1.5 rounded-full", item.ok === undefined ? "bg-muted-foreground" : item.ok ? "bg-emerald-400" : "bg-red-400")}
          />
          {item.label}
        </li>
      ))}
    </ul>
  );
}

interface Library {
  icons: { set: string; files: ResultFile[] }[];
  images: ResultFile[];
}

function useLibrary(active: boolean, refresh: unknown) {
  const [library, setLibrary] = useState<Library | null>(null);
  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    fetch("/api/agent/library")
      .then((response) => (response.ok ? (response.json() as Promise<Library>) : null))
      .then((value) => !cancelled && setLibrary(value))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [active, refresh]);
  return library;
}

export function CreateSheet({
  open,
  onOpenChange,
  tab,
  onTabChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tab: CreateTab;
  onTabChange: (tab: CreateTab) => void;
}) {
  const { online, status, job, post } = useAgent();
  const busy = job?.status === "running";
  const imagesReady = Boolean(status?.comfy.ok && status.comfy.models);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const [deck, setDeck] = useState<DeckForm>({
    brief: "",
    sources: "",
    slides: "7",
    lang: "id",
    theme: "aurora",
    icons: "solid",
    images: true,
    review: false,
    quality: "turbo",
    model: "",
    author: "",
  });
  const [icons, setIcons] = useState({ concepts: "", style: "solid" as "solid" | "outline" });
  const [picture, setPicture] = useState({ prompt: "", style: "free" as ThemeId | "free", shape: "wide", count: "2" });
  const update = <K extends keyof DeckForm>(key: K, value: DeckForm[K]) => setDeck((current) => ({ ...current, [key]: value }));

  const finishedJob = job && job.status !== "running" ? job.id : null;
  const library = useLibrary(open && tab !== "deck", finishedJob);
  const models = (status?.ollama.models ?? []).filter((name) => !NOT_PLANNERS.test(name));
  const tabJob = job && ((tab === "icons" && job.kind === "icons") || (tab === "images" && job.kind === "image")) ? job : null;

  async function submit(event: FormEvent, path: string, body: object, close: boolean) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await post(path, body);
      if (close) onOpenChange(false);
    } catch (failure) {
      setError((failure as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  const disabled = !online || busy || submitting;
  const submitLabel = (idle: string) => (busy ? "Menunggu proses lain…" : submitting ? "Mengirim…" : idle);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="gap-0 data-[side=right]:w-full data-[side=right]:sm:max-w-[480px]">
        <SheetHeader className="gap-2 border-b pr-12">
          <SheetTitle className="flex items-center gap-2">
            <span className="brand-gradient flex size-6 items-center justify-center rounded-md">
              <WandSparkles className="size-3.5" />
            </span>
            Buat dengan AI
          </SheetTitle>
          <SheetDescription>Semua model berjalan lokal di server ini: Ollama untuk isi, FLUX.2 untuk ikon dan gambar.</SheetDescription>
          <StatusLine />
        </SheetHeader>

        <Tabs value={tab} onValueChange={(value) => onTabChange(value as CreateTab)} className="min-h-0 flex-1 gap-0">
          <div className="px-4 pt-3">
            <TabsList className="w-full">
              <TabsTrigger value="deck">
                <Presentation />
                Presentasi
              </TabsTrigger>
              <TabsTrigger value="icons">
                <Shapes />
                Ikon
              </TabsTrigger>
              <TabsTrigger value="images">
                <ImageIcon />
                Gambar
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="deck" className="min-h-0 overflow-y-auto">
            <form
              className="flex flex-col gap-5 p-4"
              onSubmit={(event) =>
                void submit(
                  event,
                  "deck",
                  {
                    brief: deck.brief,
                    sources: deck.sources || undefined,
                    slides: Number(deck.slides),
                    lang: deck.lang,
                    theme: deck.theme,
                    icons: imagesReady ? deck.icons : "lucide",
                    images: imagesReady && deck.images,
                    review: deck.review,
                    quality: deck.quality,
                    model: deck.model || undefined,
                    author: deck.author || undefined,
                  },
                  true,
                )
              }
            >
              <FieldGroup className="gap-5">
                <Field>
                  <FieldLabel htmlFor="brief">Topik dan tujuan</FieldLabel>
                  <Textarea
                    id="brief"
                    required
                    minLength={8}
                    rows={4}
                    value={deck.brief}
                    onChange={(event) => update("brief", event.target.value)}
                    placeholder="Contoh: Pengantar keamanan siber untuk pemilik UMKM. Jelaskan ancaman umum, dampaknya, dan 5 langkah dasar yang murah."
                  />
                  <FieldDescription className="text-xs">Sebut audiens, tujuan, dan poin yang wajib ada.</FieldDescription>
                </Field>

                <Field>
                  <div className="flex items-center justify-between">
                    <FieldLabel htmlFor="sources">Materi sumber (opsional)</FieldLabel>
                    <Button type="button" variant="ghost" size="xs" onClick={() => fileInput.current?.click()}>
                      <FileUp data-icon="inline-start" />
                      Unggah .txt/.md
                    </Button>
                    <input
                      ref={fileInput}
                      type="file"
                      accept=".txt,.md,.markdown,.csv,text/plain,text/markdown"
                      className="hidden"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) void file.text().then((value) => update("sources", value.slice(0, 60_000)));
                        event.target.value = "";
                      }}
                    />
                  </div>
                  <Textarea
                    id="sources"
                    rows={3}
                    value={deck.sources}
                    onChange={(event) => update("sources", event.target.value)}
                    placeholder="Tempel data, angka, atau kutipan. Angka dan kutipan di slide hanya diambil dari sini."
                  />
                </Field>

                <div className="grid grid-cols-2 gap-3">
                  <Field>
                    <FieldLabel>Jumlah slide</FieldLabel>
                    <Segmented
                      label="Jumlah slide"
                      value={deck.slides}
                      onChange={(value) => update("slides", value)}
                      options={SLIDE_COUNTS.map((count) => ({ value: count, label: count }))}
                    />
                  </Field>
                  <Field>
                    <FieldLabel>Bahasa</FieldLabel>
                    <Segmented
                      label="Bahasa"
                      value={deck.lang}
                      onChange={(value) => update("lang", value)}
                      options={[
                        { value: "id", label: "Indonesia" },
                        { value: "en", label: "English" },
                      ]}
                    />
                  </Field>
                </div>

                <Field>
                  <FieldLabel>Tema</FieldLabel>
                  <ThemeSwatches compact value={deck.theme} onChange={(theme) => update("theme", theme)} />
                </Field>

                <Field>
                  <FieldLabel>Ikon</FieldLabel>
                  <Segmented<IconMode>
                    label="Gaya ikon"
                    value={imagesReady ? deck.icons : "lucide"}
                    onChange={(value) => update("icons", value)}
                    options={[
                      { value: "lucide", label: "Lucide" },
                      { value: "solid", label: "AI solid", disabled: !imagesReady },
                      { value: "outline", label: "AI garis", disabled: !imagesReady },
                    ]}
                  />
                  <FieldDescription className="text-xs">Ikon AI digambar FLUX.2 lalu diubah jadi SVG satu warna.</FieldDescription>
                </Field>

                <div className="flex flex-col gap-4 rounded-lg border p-3">
                  <SwitchRow
                    label="Gambar ilustrasi AI"
                    description="FLUX.2 [dev] melukis sampul dan gambar pendukung sesuai tema."
                    checked={imagesReady && deck.images}
                    onChange={(value) => update("images", value)}
                    disabled={!imagesReady}
                  />
                  <SwitchRow
                    label="Periksa gambar"
                    description={`${status?.ollama.review ?? "Model visi"} menolak gambar yang berisi teks atau layar.`}
                    checked={deck.review}
                    onChange={(value) => update("review", value)}
                    disabled={!imagesReady || !deck.images}
                  />
                </div>

                <details className="group rounded-lg border px-3 py-2">
                  <summary className="cursor-pointer text-sm font-medium text-muted-foreground select-none group-open:text-foreground">
                    Pengaturan lanjutan
                  </summary>
                  <div className="mt-3 flex flex-col gap-4">
                    <Field>
                      <FieldLabel>Model penyusun isi</FieldLabel>
                      <Select
                        items={models.map((model) => ({ value: model, label: model }))}
                        value={deck.model || status?.ollama.planner || ""}
                        onValueChange={(value) => update("model", String(value ?? ""))}
                      >
                        <SelectTrigger className="w-full" aria-label="Model penyusun isi">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {models.map((model) => (
                            <SelectItem key={model} value={model}>
                              {model}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field>
                      <FieldLabel>Kualitas gambar</FieldLabel>
                      <Segmented<Quality>
                        label="Kualitas gambar"
                        value={deck.quality}
                        onChange={(value) => update("quality", value)}
                        options={[
                          { value: "turbo", label: "Turbo · 8 langkah" },
                          { value: "full", label: "Penuh · 28 langkah" },
                        ]}
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="author">Nama penyaji</FieldLabel>
                      <Input id="author" value={deck.author} maxLength={80} onChange={(event) => update("author", event.target.value)} />
                    </Field>
                  </div>
                </details>
              </FieldGroup>

              {error && tab === "deck" && (
                <p role="alert" className="text-sm text-destructive">
                  {error}
                </p>
              )}
              <Button type="submit" size="lg" className="brand-gradient w-full hover:opacity-90" disabled={disabled || deck.brief.trim().length < 8}>
                {submitting ? <LoaderCircle className="animate-spin" data-icon="inline-start" /> : <WandSparkles data-icon="inline-start" />}
                {submitLabel("Buat presentasi")}
              </Button>
              <p className="-mt-2 text-center text-xs text-muted-foreground">Sekitar 3–5 menit untuk 7 slide. Slide muncul bertahap di studio.</p>
            </form>
          </TabsContent>

          <TabsContent value="icons" className="min-h-0 overflow-y-auto">
            <form
              className="flex flex-col gap-5 p-4"
              onSubmit={(event) => void submit(event, "icons", { concepts: icons.concepts, style: icons.style }, false)}
            >
              <Field>
                <FieldLabel htmlFor="concepts">Konsep ikon</FieldLabel>
                <Textarea
                  id="concepts"
                  rows={4}
                  required
                  value={icons.concepts}
                  onChange={(event) => setIcons((current) => ({ ...current, concepts: event.target.value }))}
                  placeholder={"rocket launch\nshield with check mark\nteam of three people"}
                />
                <FieldDescription className="text-xs">Satu konsep per baris (maks. 24). Bahasa Inggris paling akurat.</FieldDescription>
              </Field>
              <Field>
                <FieldLabel>Gaya</FieldLabel>
                <Segmented
                  label="Gaya ikon"
                  value={icons.style}
                  onChange={(style) => setIcons((current) => ({ ...current, style }))}
                  options={[
                    { value: "solid", label: "Solid" },
                    { value: "outline", label: "Garis" },
                  ]}
                />
              </Field>
              {error && tab === "icons" && (
                <p role="alert" className="text-sm text-destructive">
                  {error}
                </p>
              )}
              <Button type="submit" className="brand-gradient w-full hover:opacity-90" disabled={disabled || !imagesReady || !icons.concepts.trim()}>
                <Shapes data-icon="inline-start" />
                {submitLabel("Buat ikon SVG")}
              </Button>
              {tabJob && <JobProgress job={tabJob} />}
              <Gallery title="Set ikon terbaru">
                {library?.icons.length ? (
                  library.icons.map((set) => (
                    <div key={set.set} className="flex flex-col gap-1.5">
                      <p className="truncate font-mono text-[11px] text-muted-foreground">{set.set}</p>
                      <ul className="grid grid-cols-6 gap-1.5">
                        {set.files.map((file) => (
                          <li key={file.url}>
                            <a
                              href={fileUrl(file, true)}
                              download={file.name}
                              title={`Unduh ${file.name}`}
                              className="flex aspect-square items-center justify-center rounded-md bg-white/90 p-1.5 ring-1 ring-foreground/10 transition hover:ring-brand"
                            >
                              <img src={file.url} alt={file.name} className="size-full object-contain" />
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground">Belum ada ikon.</p>
                )}
              </Gallery>
            </form>
          </TabsContent>

          <TabsContent value="images" className="min-h-0 overflow-y-auto">
            <form
              className="flex flex-col gap-5 p-4"
              onSubmit={(event) =>
                void submit(
                  event,
                  "image",
                  { prompt: picture.prompt, style: picture.style, shape: picture.shape, count: Number(picture.count) },
                  false,
                )
              }
            >
              <Field>
                <FieldLabel htmlFor="prompt">Deskripsi gambar</FieldLabel>
                <Textarea
                  id="prompt"
                  rows={4}
                  required
                  value={picture.prompt}
                  onChange={(event) => setPicture((current) => ({ ...current, prompt: event.target.value }))}
                  placeholder="A glass greenhouse on a rooftop at dusk, soft warm light, isometric 3D"
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field>
                  <FieldLabel>Gaya</FieldLabel>
                  <Select
                    items={PICTURE_STYLES}
                    value={picture.style}
                    onValueChange={(value) => setPicture((current) => ({ ...current, style: value as ThemeId | "free" }))}
                  >
                    <SelectTrigger className="w-full" aria-label="Gaya gambar">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PICTURE_STYLES.map((style) => (
                        <SelectItem key={style.value} value={style.value}>
                          {style.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel>Jumlah</FieldLabel>
                  <Segmented
                    label="Jumlah gambar"
                    value={picture.count}
                    onChange={(count) => setPicture((current) => ({ ...current, count }))}
                    options={["1", "2", "3", "4"].map((count) => ({ value: count, label: count }))}
                  />
                </Field>
              </div>
              <Field>
                <FieldLabel>Bentuk</FieldLabel>
                <Segmented
                  label="Bentuk gambar"
                  value={picture.shape}
                  onChange={(shape) => setPicture((current) => ({ ...current, shape }))}
                  options={[
                    { value: "wide", label: "Lebar 16:9" },
                    { value: "portrait", label: "Potret" },
                    { value: "square", label: "Persegi" },
                  ]}
                />
              </Field>
              {error && tab === "images" && (
                <p role="alert" className="text-sm text-destructive">
                  {error}
                </p>
              )}
              <Button type="submit" className="brand-gradient w-full hover:opacity-90" disabled={disabled || !imagesReady || !picture.prompt.trim()}>
                <ImageIcon data-icon="inline-start" />
                {submitLabel("Buat gambar")}
              </Button>
              {tabJob && <JobProgress job={tabJob} />}
              <Gallery title="Gambar terbaru">
                {library?.images.length ? (
                  <ul className="grid grid-cols-3 gap-2">
                    {library.images.map((file) => (
                      <li key={file.url}>
                        <a
                          href={fileUrl(file, true)}
                          download={file.name}
                          title={`Unduh ${file.name}`}
                          className="block overflow-hidden rounded-md ring-1 ring-foreground/10 transition hover:ring-brand"
                        >
                          <img src={file.url} alt={file.name} loading="lazy" className="aspect-video w-full object-cover" />
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-muted-foreground">Belum ada gambar.</p>
                )}
              </Gallery>
            </form>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

function Gallery({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2 border-t pt-4">
      <h3 className="text-xs font-medium text-muted-foreground uppercase">{title}</h3>
      {children}
    </section>
  );
}
