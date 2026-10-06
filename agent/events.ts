export type Stage = "plan" | "icons" | "images" | "review" | "write" | "export";

export interface ResultFile {
  name: string;
  /** Download URL served by the studio (`/api/agent/files/...`). */
  url: string;
  /** Absolute path on the server. */
  path: string;
}

export type AgentEvent =
  | { type: "stage"; stage: Stage; message: string }
  | { type: "log"; message: string }
  | { type: "progress"; stage: Stage; value: number; total: number }
  /** deck.json or an asset changed on disk (the studio reloads it through Vite HMR). */
  | { type: "deck"; slug: string }
  | { type: "done"; slug?: string; message: string; files?: ResultFile[] }
  | { type: "error"; message: string };

export type Emit = (event: AgentEvent) => void;

export const silent: Emit = () => { };

export const consoleEmit: Emit = (event) => {
  switch (event.type) {
    case "stage":
      console.log(`\n▸ ${event.message}`);
      break;
    case "log":
      console.log(`  ${event.message}`);
      break;
    case "progress":
      process.stdout.write(`\r  ${event.stage} ${event.value}/${event.total}   `);
      if (event.value >= event.total) process.stdout.write("\n");
      break;
    case "done":
      console.log(`\n✔ ${event.message}`);
      for (const file of event.files ?? []) console.log(`  ${file.path}`);
      break;
    case "error":
      console.error(`\n✖ ${event.message}`);
      break;
  }
};

export class AbortError extends Error {
  constructor(message = "Dibatalkan.") {
    super(message);
    this.name = "AbortError";
  }
}

export function throwIfAborted(signal: AbortSignal | undefined) {
  if (signal?.aborted) throw new AbortError();
}
