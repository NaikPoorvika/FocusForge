// Additional persistent slices layered on top of the main store.
// Reads/writes are kept in a separate localStorage key so existing state
// remains untouched.
import { useSyncExternalStore } from "react";

export interface Resource {
  id: string;
  title: string;
  url?: string;
  type: "link" | "pdf" | "note" | "github" | "youtube" | "interview";
  tags: string[];
  notes?: string;
  createdAt: string;
}

export interface CodingProblem {
  id: string;
  name: string;
  url?: string;
  platform: "LeetCode" | "HackerRank" | "CodeChef" | "Codeforces" | "GeeksforGeeks" | "AtCoder" | "Other";
  difficulty: "Easy" | "Medium" | "Hard";
  topic: string;
  solved: boolean;
  timeMinutes?: number;
  notes?: string;
  solvedAt?: string;
  createdAt: string;
}

export interface ExtrasState {
  resources: Resource[];
  coding: CodingProblem[];
}

const KEY = "sst-extras-v1";
const defaults: ExtrasState = { resources: [], coding: [] };

function load(): ExtrasState {
  if (typeof window === "undefined") return defaults;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw);
    return {
      resources: Array.isArray(parsed.resources) ? parsed.resources : [],
      coding: Array.isArray(parsed.coding) ? parsed.coding : [],
    };
  } catch {
    return defaults;
  }
}

let state: ExtrasState = defaults;
let hydrated = false;
const listeners = new Set<() => void>();

function ensureHydrated() {
  if (hydrated || typeof window === "undefined") return;
  state = load();
  hydrated = true;
}

function persist() {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(state));
}

function emit() {
  listeners.forEach((l) => l());
}

export function getExtras() {
  ensureHydrated();
  return state;
}

export function setExtras(updater: (s: ExtrasState) => ExtrasState) {
  ensureHydrated();
  state = updater(state);
  persist();
  emit();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useExtras<T>(selector: (s: ExtrasState) => T): T {
  return useSyncExternalStore(
    subscribe,
    () => selector(getExtras()),
    () => selector(defaults),
  );
}

function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

// ---- Resources ----
export function addResource(input: Omit<Resource, "id" | "createdAt" | "tags"> & { tags?: string[] }) {
  setExtras((s) => ({
    ...s,
    resources: [
      { ...input, tags: input.tags ?? [], id: uid(), createdAt: new Date().toISOString() },
      ...s.resources,
    ],
  }));
}
export function updateResource(id: string, patch: Partial<Resource>) {
  setExtras((s) => ({ ...s, resources: s.resources.map((r) => (r.id === id ? { ...r, ...patch } : r)) }));
}
export function deleteResource(id: string) {
  setExtras((s) => ({ ...s, resources: s.resources.filter((r) => r.id !== id) }));
}

// ---- Coding problems ----
export function addCodingProblem(input: Omit<CodingProblem, "id" | "createdAt" | "solved"> & { solved?: boolean }) {
  setExtras((s) => ({
    ...s,
    coding: [
      {
        ...input,
        id: uid(),
        solved: input.solved ?? false,
        solvedAt: input.solved ? new Date().toISOString() : undefined,
        createdAt: new Date().toISOString(),
      },
      ...s.coding,
    ],
  }));
}
export function updateCodingProblem(id: string, patch: Partial<CodingProblem>) {
  setExtras((s) => ({
    ...s,
    coding: s.coding.map((p) => {
      if (p.id !== id) return p;
      const merged = { ...p, ...patch };
      if (patch.solved !== undefined) {
        merged.solvedAt = patch.solved ? new Date().toISOString() : undefined;
      }
      return merged;
    }),
  }));
}
export function deleteCodingProblem(id: string) {
  setExtras((s) => ({ ...s, coding: s.coding.filter((p) => p.id !== id) }));
}

export function replaceExtras(next: ExtrasState) {
  setExtras(() => ({
    resources: next.resources ?? [],
    coding: next.coding ?? [],
  }));
}

/** Wipe local extras when the signed-in user changes to prevent cross-user leakage. */
export function resetExtras() {
  setExtras(() => ({ resources: [], coding: [] }));
}
