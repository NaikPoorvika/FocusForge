// Bridges the local habit store to Supabase.
// - On sign-in: hydrates local habits + logs from Supabase (or uploads local ones on first sign-in).
// - On any local habit change: diffs against last-synced snapshot and upserts/deletes rows.
// - Also syncs habit_logs (per-day completed/skipped).
// - Awards XP when a habit is newly completed for today.
// - Subscribes to realtime changes so the dashboard updates across devices.
import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  getState,
  setState,
  subscribeStore,
  type Habit,
} from "@/lib/store";
import {
  dashboardStatsKeys,
} from "@/lib/dashboard-stats";
import { bumpDailyXp } from "@/lib/xp-sync";

export const HABIT_XP = 10;

type HabitRow = {
  local_id: string;
  name: string;
  emoji: string;
  color: string;
  category: string | null;
  frequency: string;
  weekly_target: number | null;
  custom_days: number[] | null;
  reminder_time: string | null;
  notes: string | null;
  archived: boolean;
  sort_order: number;
  created_at: string;
};

type LogRow = {
  habit_local_id: string;
  log_date: string;
  completed: boolean;
  skipped: boolean;
};

function rowToHabit(r: HabitRow, logs: LogRow[]): Habit {
  const history: Record<string, boolean> = {};
  const skips: Record<string, boolean> = {};
  for (const l of logs) {
    if (l.habit_local_id !== r.local_id) continue;
    if (l.completed) history[l.log_date] = true;
    if (l.skipped) skips[l.log_date] = true;
  }
  return {
    id: r.local_id,
    name: r.name,
    emoji: r.emoji,
    color: r.color,
    category: r.category ?? undefined,
    frequency: (r.frequency as Habit["frequency"]) ?? "daily",
    weeklyTarget: r.weekly_target ?? undefined,
    customDays: Array.isArray(r.custom_days) ? r.custom_days : undefined,
    reminderTime: r.reminder_time ?? undefined,
    notes: r.notes ?? undefined,
    createdAt: r.created_at,
    history,
    skips,
  };
}

function habitToRow(h: Habit, userId: string, sortOrder: number) {
  return {
    user_id: userId,
    local_id: h.id,
    name: h.name,
    emoji: h.emoji,
    color: h.color,
    category: h.category ?? null,
    frequency: h.frequency,
    weekly_target: h.weeklyTarget ?? null,
    custom_days: h.customDays ?? [],
    reminder_time: h.reminderTime ?? null,
    notes: h.notes ?? null,
    archived: false,
    sort_order: sortOrder,
    created_at: h.createdAt,
  };
}

function habitMetaEqual(a: Habit, b: Habit): boolean {
  return (
    a.name === b.name &&
    a.emoji === b.emoji &&
    a.color === b.color &&
    a.category === b.category &&
    a.frequency === b.frequency &&
    a.weeklyTarget === b.weeklyTarget &&
    a.reminderTime === b.reminderTime &&
    a.notes === b.notes &&
    JSON.stringify(a.customDays ?? []) === JSON.stringify(b.customDays ?? [])
  );
}

function diffLogs(prev: Habit, next: Habit) {
  const added: { date: string; completed: boolean; skipped: boolean }[] = [];
  const removed: string[] = [];
  const allDates = new Set([
    ...Object.keys(prev.history),
    ...Object.keys(next.history),
    ...Object.keys(prev.skips),
    ...Object.keys(next.skips),
  ]);
  for (const d of allDates) {
    const pc = !!prev.history[d];
    const ps = !!prev.skips[d];
    const nc = !!next.history[d];
    const ns = !!next.skips[d];
    if (pc === nc && ps === ns) continue;
    if (!nc && !ns) removed.push(d);
    else added.push({ date: d, completed: nc, skipped: ns });
  }
  return { added, removed };
}

// Habit XP flows through the unified xp-sync layer.


async function hydrateFromRemote(userId: string) {
  const [{ data: habitRows, error: hErr }, { data: logRows, error: lErr }] =
    await Promise.all([
      supabase
        .from("habits")
        .select("*")
        .eq("user_id", userId)
        .eq("archived", false)
        .order("sort_order", { ascending: true }),
      supabase.from("habit_logs").select("*").eq("user_id", userId),
    ]);
  if (hErr) {
    console.error("Failed to load habits", hErr);
    return null;
  }
  if (lErr) {
    console.error("Failed to load habit logs", lErr);
    return null;
  }
  const logs = (logRows ?? []) as unknown as LogRow[];
  const habits = ((habitRows ?? []) as unknown as HabitRow[]).map((r) =>
    rowToHabit(r, logs),
  );
  return habits;
}

export function useHabitsSync(userId: string | undefined) {
  const qc = useQueryClient();
  const prevRef = useRef<Map<string, Habit>>(new Map());
  const readyRef = useRef(false);

  // Initial load / upload
  useEffect(() => {
    readyRef.current = false;
    prevRef.current = new Map();
    if (!userId) return;

    let cancelled = false;

    (async () => {
      const remote = await hydrateFromRemote(userId);
      if (cancelled || remote === null) return;
      // Adopt Supabase as the source of truth for this account. Never upload
      // leftover local habits/logs — they may belong to a previous user.
      setState((s) => ({ ...s, habits: remote }));
      prevRef.current = new Map(remote.map((h) => [h.id, h]));
      readyRef.current = true;
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  // Realtime: refresh from remote on any change from other clients
  useEffect(() => {
    if (!userId) return;
    const refresh = async () => {
      const remote = await hydrateFromRemote(userId);
      if (!remote) return;
      setState((s) => ({ ...s, habits: remote }));
      prevRef.current = new Map(remote.map((h) => [h.id, h]));
      qc.invalidateQueries({ queryKey: dashboardStatsKeys.today(userId) });
    };
    const channel = supabase
      .channel(`habits-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "habits",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          if (readyRef.current) void refresh();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "habit_logs",
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
  }, [userId, qc]);

  // Push local changes to Supabase
  useEffect(() => {
    if (!userId) return;
    let scheduled = false;
    const today = () => new Date().toISOString().slice(0, 10);

    const flush = async () => {
      scheduled = false;
      if (!readyRef.current) return;
      const current = getState().habits;
      const prev = prevRef.current;
      const currentMap = new Map(current.map((h) => [h.id, h]));

      const toUpsertHabits: { habit: Habit; index: number }[] = [];
      const logsToUpsert: {
        habit_local_id: string;
        log_date: string;
        completed: boolean;
        skipped: boolean;
      }[] = [];
      const logsToDelete: { habit_local_id: string; log_date: string }[] = [];
      let xpDelta = 0;

      current.forEach((h, i) => {
        const before = prev.get(h.id);
        if (!before) {
          toUpsertHabits.push({ habit: h, index: i });
          // seed all existing logs
          for (const d of Object.keys(h.history)) {
            logsToUpsert.push({
              habit_local_id: h.id,
              log_date: d,
              completed: true,
              skipped: false,
            });
            if (d === today()) xpDelta += HABIT_XP;
          }
          for (const d of Object.keys(h.skips)) {
            if (h.history[d]) continue;
            logsToUpsert.push({
              habit_local_id: h.id,
              log_date: d,
              completed: false,
              skipped: true,
            });
          }
          return;
        }
        if (!habitMetaEqual(before, h)) {
          toUpsertHabits.push({ habit: h, index: i });
        }
        const { added, removed } = diffLogs(before, h);
        for (const a of added) {
          logsToUpsert.push({
            habit_local_id: h.id,
            log_date: a.date,
            completed: a.completed,
            skipped: a.skipped,
          });
          if (a.date === today()) {
            const wasCompleted = !!before.history[a.date];
            if (a.completed && !wasCompleted) xpDelta += HABIT_XP;
            else if (!a.completed && wasCompleted) xpDelta -= HABIT_XP;
          }
        }
        for (const d of removed) {
          logsToDelete.push({ habit_local_id: h.id, log_date: d });
          if (d === today() && before.history[d]) xpDelta -= HABIT_XP;
        }
      });

      const habitsToDelete: string[] = [];
      for (const id of prev.keys()) {
        if (!currentMap.has(id)) habitsToDelete.push(id);
      }

      try {
        if (toUpsertHabits.length) {
          const rows = toUpsertHabits.map(({ habit, index }) =>
            habitToRow(habit, userId, index),
          );
          const { error } = await supabase
            .from("habits")
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .upsert(rows as any, { onConflict: "user_id,local_id" });
          if (error) throw error;
        }
        if (habitsToDelete.length) {
          const { error } = await supabase
            .from("habits")
            .delete()
            .eq("user_id", userId)
            .in("local_id", habitsToDelete);
          if (error) throw error;
        }
        if (logsToUpsert.length) {
          const rows = logsToUpsert.map((l) => ({ ...l, user_id: userId }));
          const { error } = await supabase
            .from("habit_logs")
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .upsert(rows as any, {
              onConflict: "user_id,habit_local_id,log_date",
            });
          if (error) throw error;
        }
        for (const l of logsToDelete) {
          const { error } = await supabase
            .from("habit_logs")
            .delete()
            .eq("user_id", userId)
            .eq("habit_local_id", l.habit_local_id)
            .eq("log_date", l.log_date);
          if (error) throw error;
        }
      } catch (e) {
        console.error("Habit sync failed", e);
        return;
      }

      if (xpDelta !== 0) {
        await bumpDailyXp(userId, xpDelta);
        qc.invalidateQueries({ queryKey: dashboardStatsKeys.today(userId) });
      }

      prevRef.current = currentMap;
    };

    let lastHabits = getState().habits;
    const unsubscribe = subscribeStore(() => {
      const now = getState().habits;
      if (now === lastHabits) return;
      lastHabits = now;
      if (scheduled) return;
      scheduled = true;
      queueMicrotask(() => void flush());
    });

    return () => {
      unsubscribe();
    };
  }, [userId, qc]);
}
