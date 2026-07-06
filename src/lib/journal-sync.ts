// Bridges the local journal store to Supabase.
// - Hydrates from journal_entries on sign-in (or uploads local ones on first sign-in).
// - Diffs local changes and upserts/deletes rows.
// - Subscribes to Realtime so entries stay in sync across tabs/devices.
// Same architecture as tasks-sync / habits-sync / goals-sync.
import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  getState,
  setState,
  subscribeStore,
  type JournalEntry,
  type MoodKey,
} from "@/lib/store";

type Row = {
  local_id: string;
  title: string | null;
  content: string | null;
  mood: string | null;
  tags: string[] | null;
  entry_date: string;
  learned: string | null;
  problems: string | null;
  went_well: string | null;
  improve: string | null;
  tomorrow_plan: string | null;
  created_at: string;
  updated_at: string | null;
};

function rowToEntry(r: Row): JournalEntry {
  return {
    id: r.local_id,
    date: r.entry_date,
    title: r.title ?? "",
    tags: Array.isArray(r.tags) ? r.tags : [],
    mood: (r.mood as MoodKey) ?? "good",
    content: r.content ?? "",
    learned: r.learned ?? undefined,
    problems: r.problems ?? undefined,
    wentWell: r.went_well ?? undefined,
    improve: r.improve ?? undefined,
    tomorrowPlan: r.tomorrow_plan ?? undefined,
    createdAt: r.created_at,
    updatedAt: r.updated_at ?? undefined,
  };
}

function entryToRow(j: JournalEntry, userId: string) {
  return {
    user_id: userId,
    local_id: j.id,
    title: j.title ?? "",
    content: j.content ?? "",
    mood: j.mood ?? "good",
    tags: j.tags ?? [],
    entry_date: j.date,
    learned: j.learned ?? null,
    problems: j.problems ?? null,
    went_well: j.wentWell ?? null,
    improve: j.improve ?? null,
    tomorrow_plan: j.tomorrowPlan ?? null,
    created_at: j.createdAt,
  };
}

function entriesEqual(a: JournalEntry, b: JournalEntry): boolean {
  return (
    a.date === b.date &&
    (a.title ?? "") === (b.title ?? "") &&
    (a.content ?? "") === (b.content ?? "") &&
    a.mood === b.mood &&
    JSON.stringify(a.tags ?? []) === JSON.stringify(b.tags ?? []) &&
    (a.learned ?? "") === (b.learned ?? "") &&
    (a.problems ?? "") === (b.problems ?? "") &&
    (a.wentWell ?? "") === (b.wentWell ?? "") &&
    (a.improve ?? "") === (b.improve ?? "") &&
    (a.tomorrowPlan ?? "") === (b.tomorrowPlan ?? "")
  );
}

async function hydrateFromRemote(userId: string): Promise<JournalEntry[] | null> {
  const { data, error } = await supabase
    .from("journal_entries")
    .select("*")
    .eq("user_id", userId)
    .order("entry_date", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) {
    console.error("Failed to load journal entries", error);
    return null;
  }
  return ((data ?? []) as unknown as Row[]).map(rowToEntry);
}

/** Fetch entries from Supabase and hydrate the store. */
export async function fetchJournalEntries(userId: string): Promise<JournalEntry[]> {
  const remote = await hydrateFromRemote(userId);
  if (!remote) return getState().journal;
  setState((s) => ({ ...s, journal: remote }));
  return remote;
}

export function useJournalSync(userId: string | undefined) {
  const prevRef = useRef<Map<string, JournalEntry>>(new Map());
  const readyRef = useRef(false);

  // Initial hydrate / migration upload
  useEffect(() => {
    readyRef.current = false;
    prevRef.current = new Map();
    if (!userId) return;

    let cancelled = false;
    (async () => {
      const remote = await hydrateFromRemote(userId);
      if (cancelled || remote === null) return;
      const localExisting = getState().journal;

      if (remote.length === 0 && localExisting.length > 0) {
        const rows = localExisting.map((j) => entryToRow(j, userId));
        const { error } = await supabase
          .from("journal_entries")
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .upsert(rows as any, { onConflict: "user_id,local_id" });
        if (error) console.error("Initial journal upload failed", error);
        prevRef.current = new Map(localExisting.map((j) => [j.id, j]));
      } else {
        setState((s) => ({ ...s, journal: remote }));
        prevRef.current = new Map(remote.map((j) => [j.id, j]));
      }
      readyRef.current = true;
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  // Realtime
  useEffect(() => {
    if (!userId) return;
    const refresh = async () => {
      const remote = await hydrateFromRemote(userId);
      if (!remote) return;
      setState((s) => ({ ...s, journal: remote }));
      prevRef.current = new Map(remote.map((j) => [j.id, j]));
    };
    const channel = supabase
      .channel(`journal-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "journal_entries",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          if (readyRef.current) void refresh();
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  // Push local changes to Supabase
  useEffect(() => {
    if (!userId) return;
    let scheduled = false;

    const flush = async () => {
      scheduled = false;
      if (!readyRef.current) return;
      const current = getState().journal;
      const prev = prevRef.current;
      const currentMap = new Map(current.map((j) => [j.id, j]));

      const toUpsert: JournalEntry[] = [];
      current.forEach((j) => {
        const before = prev.get(j.id);
        if (!before || !entriesEqual(before, j)) toUpsert.push(j);
      });

      const toDelete: string[] = [];
      for (const id of prev.keys()) if (!currentMap.has(id)) toDelete.push(id);

      try {
        if (toUpsert.length) {
          const rows = toUpsert.map((j) => entryToRow(j, userId));
          const { error } = await supabase
            .from("journal_entries")
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .upsert(rows as any, { onConflict: "user_id,local_id" });
          if (error) throw error;
        }
        if (toDelete.length) {
          const { error } = await supabase
            .from("journal_entries")
            .delete()
            .eq("user_id", userId)
            .in("local_id", toDelete);
          if (error) throw error;
        }
      } catch (e) {
        console.error("Journal sync failed", e);
        return; // keep prev snapshot so we retry next tick
      }

      prevRef.current = currentMap;
    };

    let last = getState().journal;
    const unsubscribe = subscribeStore(() => {
      const now = getState().journal;
      if (now === last) return;
      last = now;
      if (scheduled) return;
      scheduled = true;
      queueMicrotask(() => void flush());
    });
    return () => {
      unsubscribe();
    };
  }, [userId]);
}
