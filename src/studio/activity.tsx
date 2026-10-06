import {
  Ban,
  ChevronDown,
  ChevronUp,
  CircleAlert,
  CircleCheck,
  Download,
  FileDown,
  ImageIcon,
  ListTree,
  LoaderCircle,
  Save,
  ScanEye,
  Shapes,
  X,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { fileUrl, summarize, useAgent, type JobSnapshot, type ResultFile, type Stage } from "./agent-client";

const STAGES: Record<Stage, { label: string; icon: LucideIcon }> = {
  plan: { label: "Rencana", icon: ListTree },
  icons: { label: "Ikon", icon: Shapes },
  images: { label: "Gambar", icon: ImageIcon },
  review: { label: "Periksa", icon: ScanEye },
  write: { label: "Simpan", icon: Save },
  export: { label: "Ekspor", icon: FileDown },
};

const STATUS = {
  running: { label: "Berjalan", variant: "secondary" },
  done: { label: "Selesai", variant: "default" },
  error: { label: "Gagal", variant: "destructive" },
  cancelled: { label: "Dibatalkan", variant: "outline" },
} as const;

function useNow(active: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [active]);
  return now;
}

const clock = (ms: number) => {
  const seconds = Math.max(0, Math.round(ms / 1000));
  return seconds < 60 ? `${seconds} dtk` : `${Math.floor(seconds / 60)} mnt ${seconds % 60} dtk`;
};

function ResultFiles({ files }: { files: ResultFile[] }) {
  const pictures = files.filter((file) => /\.(svg|jpg)$/.test(file.name));
  const documents = files.filter((file) => !/\.(svg|jpg)$/.test(file.name));
  return (
    <div className="flex flex-col gap-2">
      {pictures.length > 0 && (
        <ul className="grid grid-cols-6 gap-1.5">
          {pictures.slice(0, 12).map((file) => (
            <li key={file.url}>
              <a
                href={fileUrl(file, true)}
                download={file.name}
                title={file.name}
                className={cn(
                  "flex aspect-square items-center justify-center overflow-hidden rounded-md bg-white/90 ring-1 ring-foreground/10 transition hover:ring-brand",
                  file.name.endsWith(".svg") ? "p-1.5" : "p-0",
                )}
              >
                <img src={file.url} alt={file.name} className="size-full object-contain" />
              </a>
            </li>
          ))}
        </ul>
      )}
      {documents.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {documents.map((file) => (
            <Button
              key={file.url}
              size="xs"
              variant="outline"
              nativeButton={false}
              render={<a href={fileUrl(file, true)} download={file.name} />}
            >
              <Download data-icon="inline-start" />
              {file.name.split(".").at(-1)?.toUpperCase() === "MD" ? "Laporan QA" : file.name.split(".").at(-1)?.toUpperCase()}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Stage chips, progress bar, last log line and result files of one agent job. */
export function JobProgress({ job, compact = false }: { job: JobSnapshot; compact?: boolean }) {
  const summary = summarize(job);
  const running = job.status === "running";
  const percent = summary.progress && summary.progress.total > 0 ? (summary.progress.value / summary.progress.total) * 100 : null;

  return (
    <div className="flex flex-col gap-3">
      {summary.stages.length > 0 && (
        <ol className="flex flex-wrap items-center gap-1" aria-label="Tahapan">
          {summary.stages.map((stage) => {
            const { label, icon: StageIcon } = STAGES[stage];
            const active = running && stage === summary.stage;
            return (
              <li
                key={stage}
                className={cn(
                  "flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px]",
                  active ? "border-brand/60 bg-brand/10 text-foreground" : "border-border text-muted-foreground",
                )}
              >
                {active ? <LoaderCircle className="size-3 animate-spin text-brand" /> : <StageIcon className="size-3" />}
                {label}
              </li>
            );
          })}
        </ol>
      )}

      {running && (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between gap-3 text-xs">
            <span className="min-w-0 truncate text-foreground">{summary.message ?? "Menyiapkan…"}</span>
            {summary.progress && summary.progress.total > 1 && (
              <span className="shrink-0 text-muted-foreground tabular-nums">
                {summary.progress.value}/{summary.progress.total}
              </span>
            )}
          </div>
          <Progress value={percent} aria-label="Kemajuan" className="[&_[data-slot=progress-indicator]]:bg-brand" />
        </div>
      )}

      {!compact && summary.log && running && <p className="line-clamp-2 text-xs text-muted-foreground">{summary.log}</p>}
      {summary.done && !running && <p className="text-xs text-foreground">{summary.done.message}</p>}
      {summary.error && job.status !== "done" && (
        <p role="alert" className="flex items-start gap-1.5 text-xs text-destructive">
          <CircleAlert className="mt-px size-3.5 shrink-0" />
          {summary.error}
        </p>
      )}
      {summary.done?.files && summary.done.files.length > 0 && <ResultFiles files={summary.done.files} />}
    </div>
  );
}

/** Floating card that follows the running job; it stays after the job ends until dismissed. */
export function ActivityDock({ hidden }: { hidden?: boolean }) {
  const { job, cancel } = useAgent();
  const [dismissed, setDismissed] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const running = job?.status === "running";
  const now = useNow(running);

  if (!job || hidden || dismissed === job.id) return null;
  const status = STATUS[job.status];

  return (
    <section
      aria-label="Proses agent"
      aria-live="polite"
      className="fixed right-4 bottom-4 z-40 w-[360px] rounded-xl border bg-popover/95 p-3 text-popover-foreground shadow-2xl shadow-black/50 backdrop-blur"
    >
      <header className="flex items-center gap-2">
        <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-brand/15 text-brand">
          {running ? (
            <LoaderCircle className="size-3.5 animate-spin" />
          ) : job.status === "done" ? (
            <CircleCheck className="size-3.5" />
          ) : job.status === "cancelled" ? (
            <Ban className="size-3.5" />
          ) : (
            <CircleAlert className="size-3.5" />
          )}
        </span>
        <h2 className="min-w-0 flex-1 truncate text-sm font-medium">{job.label}</h2>
        {running ? (
          <span className="text-xs text-muted-foreground tabular-nums">{clock(now - job.startedAt)}</span>
        ) : (
          <Badge variant={status.variant}>{status.label}</Badge>
        )}
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label={collapsed ? "Buka rincian" : "Ciutkan"}
          aria-expanded={!collapsed}
          onClick={() => setCollapsed((value) => !value)}
        >
          {collapsed ? <ChevronUp /> : <ChevronDown />}
        </Button>
        {!running && (
          <Button variant="ghost" size="icon-xs" aria-label="Tutup" onClick={() => setDismissed(job.id)}>
            <X />
          </Button>
        )}
      </header>

      {!collapsed && (
        <div className="mt-3 flex flex-col gap-3">
          <JobProgress job={job} />
          {running && (
            <Button variant="outline" size="sm" className="self-start" onClick={() => void cancel()}>
              <Ban data-icon="inline-start" />
              Batalkan
            </Button>
          )}
        </div>
      )}
    </section>
  );
}
