import type { Note, NoteStatus } from "./types";
import * as mockStore from "./store";
import type { CreateNoteInput } from "./store";

export type { CreateNoteInput };

/**
 * API connectivity mode.
 *
 * "live"  -> the most recent real request to a Vercel Function succeeded.
 * "mock"  -> the most recent request failed and we silently served in-memory
 *            demo data instead. This must be visible in the UI so a backend
 *            misconfiguration (bad OIDC/AWS, 401 from MNEMO_ACCESS_TOKEN, etc.)
 *            cannot hide during a live demo.
 */
export type ApiMode = "live" | "mock";

let currentMode: ApiMode = "live";
let warnedOnce = false;
const modeListeners = new Set<() => void>();

function setApiMode(mode: ApiMode) {
  if (mode === currentMode) return;
  currentMode = mode;
  if (mode === "mock" && !warnedOnce) {
    warnedOnce = true;
    // eslint-disable-next-line no-console
    console.warn(
      "[Mnemo] An API request failed; falling back to in-memory mock data. " +
        "What you see may not reflect Aurora. Check Vercel Functions / AWS " +
        "connectivity and whether MNEMO_ACCESS_TOKEN is set without a client token.",
    );
  }
  modeListeners.forEach((listener) => listener());
}

export function getApiMode(): ApiMode {
  return currentMode;
}

export function subscribeApiMode(listener: () => void): () => void {
  modeListeners.add(listener);
  return () => {
    modeListeners.delete(listener);
  };
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (!response.ok) {
    throw new Error(
      `Request failed: ${response.status} ${response.statusText}`,
    );
  }

  return response.json() as Promise<T>;
}

async function withMockFallback<T>(
  request: () => Promise<T>,
  fallback: () => Promise<T>,
): Promise<T> {
  try {
    const result = await request();
    setApiMode("live");
    return result;
  } catch {
    setApiMode("mock");
    return fallback();
  }
}

export function listNotes(): Promise<Note[]> {
  return withMockFallback(
    () => requestJson<Note[]>("/api/notes"),
    () => mockStore.listNotes(),
  );
}

export function getNote(id: string): Promise<Note | undefined> {
  return withMockFallback(
    () => requestJson<Note>(`/api/notes/${encodeURIComponent(id)}`),
    () => mockStore.getNote(id),
  );
}

export function searchNotes(query: string): Promise<Note[]> {
  const params = new URLSearchParams({ q: query });
  return withMockFallback(
    () => requestJson<Note[]>(`/api/search?${params.toString()}`),
    () => mockStore.searchNotes(query),
  );
}

export function saveNote(
  input: CreateNoteInput & { id?: string },
): Promise<Note> {
  return saveNoteRemote(input);
}

export function saveNoteRemote(
  input: CreateNoteInput & { id?: string },
): Promise<Note> {
  return requestJson<Note>("/api/notes", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function runAiIndexing(
  id: string,
  onStage?: (status: NoteStatus) => void,
): Promise<Note | undefined> {
  return withMockFallback(
    async () => {
      onStage?.("queued");
      const queued = await requestJson<Note>(
        `/api/notes/${encodeURIComponent(id)}/process`,
        {
          method: "POST",
        },
      );
      onStage?.(queued.status);
      return queued;
    },
    () => mockStore.runAiIndexing(id, onStage),
  );
}
