import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { AgentEvent, ResultFile, Stage } from "../../agent/events";
import type { AgentStatus, JobSnapshot, StreamMessage } from "../../agent/vite-plugin";

export type { AgentEvent, AgentStatus, JobSnapshot, ResultFile, Stage };

interface AgentContextValue {
  /** null while unknown; false when the dev-server API is missing (static build) or unreachable. */
  online: boolean | null;
  status: AgentStatus | null;
  job: JobSnapshot | null;
  /** POST to `/api/agent/<path>`; rejects with the server's message. */
  post: <T = unknown>(path: string, body: object) => Promise<T>;
  cancel: () => Promise<void>;
  refreshStatus: () => void;
}

const AgentContext = createContext<AgentContextValue | null>(null);

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/agent/${path}`, init);
  // A static build answers every path with index.html; only the dev-server API speaks JSON.
  if (!response.headers.get("content-type")?.includes("application/json")) throw new Error("API agent tidak tersedia.");
  const body = (await response.json().catch(() => ({}))) as { error?: string };
  if (!response.ok) throw new Error(body.error ?? `HTTP ${response.status}`);
  return body as T;
}

function reduce(job: JobSnapshot | null, message: StreamMessage): JobSnapshot | null {
  switch (message.type) {
    case "snapshot":
      return message.job;
    case "job":
      return message.job;
    case "event":
      if (job?.id !== message.id) return job;
      return {
        ...job,
        slug: message.event.type === "deck" ? message.event.slug : job.slug,
        events: [...job.events, message.event],
      };
    case "status":
      return job?.id === message.id ? { ...job, status: message.status } : job;
  }
}

export function AgentProvider({ children }: { children: ReactNode }) {
  const [online, setOnline] = useState<boolean | null>(null);
  const [status, setStatus] = useState<AgentStatus | null>(null);
  const [job, setJob] = useState<JobSnapshot | null>(null);

  const refreshStatus = useCallback(() => {
    request<AgentStatus>("status").then(
      (value) => {
        setStatus(value);
        setOnline(true);
      },
      () => setOnline(false),
    );
  }, []);

  useEffect(() => {
    refreshStatus();
    const timer = window.setInterval(refreshStatus, 30_000);
    return () => window.clearInterval(timer);
  }, [refreshStatus]);

  useEffect(() => {
    if (!online) return;
    const source = new EventSource("/api/agent/events");
    source.onmessage = (event) => setJob((current) => reduce(current, JSON.parse(event.data) as StreamMessage));
    return () => source.close();
  }, [online]);

  const finished = job && job.status !== "running" ? job.id : null;
  useEffect(() => {
    if (finished) refreshStatus();
  }, [finished, refreshStatus]);

  const post = useCallback(
    <T,>(path: string, body: object) =>
      request<T>(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }),
    [],
  );
  const cancel = useCallback(async () => {
    await post("cancel", {});
  }, [post]);

  const value = useMemo(() => ({ online, status, job, post, cancel, refreshStatus }), [online, status, job, post, cancel, refreshStatus]);
  return <AgentContext.Provider value={value}>{children}</AgentContext.Provider>;
}

export function useAgent(): AgentContextValue {
  const value = useContext(AgentContext);
  if (!value) throw new Error("useAgent must be used inside <AgentProvider>");
  return value;
}

export interface JobSummary {
  stage?: Stage;
  message?: string;
  progress?: { value: number; total: number };
  log?: string;
  done?: Extract<AgentEvent, { type: "done" }>;
  error?: string;
  stages: Stage[];
}

export function summarize(job: JobSnapshot): JobSummary {
  const summary: JobSummary = { stages: [] };
  for (const event of job.events) {
    switch (event.type) {
      case "stage":
        summary.stage = event.stage;
        summary.message = event.message;
        summary.progress = undefined;
        if (!summary.stages.includes(event.stage)) summary.stages.push(event.stage);
        break;
      case "progress":
        if (event.stage === summary.stage) summary.progress = { value: event.value, total: event.total };
        break;
      case "log":
        summary.log = event.message;
        break;
      case "done":
        summary.done = event;
        break;
      case "error":
        summary.error = event.message;
        break;
    }
  }
  return summary;
}

export const fileUrl = (file: Pick<ResultFile, "url">, download = false) => (download ? `${file.url}?download=1` : file.url);
