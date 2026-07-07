// Bridges the local task store to Supabase.
// - On sign-in: replaces the local `tasks` array with rows from Supabase.
// - On any local task change: diffs against the last-synced snapshot and
//   upserts new/changed rows and deletes removed ones.
// - When a task is newly completed, bumps today's XP in daily_stats.
import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  getState,
  setState,
  subscribeStore,
  XP_BY_PRIORITY,
  type Task,
} from "@/lib/store";
import {
  dashboardStatsKeys,
} from "@/lib/dashboard-stats";
import { bumpDailyXp } from "@/lib/xp-sync";

type Row = {
  local_id: string;
  title: string;
  description: string | null;
  notes: string | null;
  task_date: string;
  category: string;
  priority: string;
  estimated_minutes: number | null;
  due_time: string | null;
  deadline_date: string | null;
  tags: string[] | null;
  completed: boolean;
  completed_at: string | null;
  archived: boolean;
  sort_order: number;
  recurrence: unknown;
  recurrence_parent_id: string | null;
  goal_id: string | null;
  created_at: string;
};

function rowToTask(r: Row): Task {
  return {
    id: r.local_id,
    title: r.title,
    description: r.description ?? undefined,
    notes: r.notes ?? undefined,
    date: r.task_date,
    category: r.category,
    priority: (r.priority as Task["priority"]) ?? "medium",
    estimatedMinutes: r.estimated_minutes ?? undefined,
    dueTime: r.due_time ?? undefined,
    deadlineDate: r.deadline_date ?? undefined,
    tags: Array.isArray(r.tags) ? r.tags : [],
    completed: !!r.completed,
    completedAt: r.completed_at ?? undefined,
    archived: !!r.archived,
    order: Number(r.sort_order ?? 0),
    recurrence: (r.recurrence as Task["recurrence"]) ?? undefined,
    recurrenceParentId: r.recurrence_parent_id ?? undefined,
    goalId: r.goal_id ?? undefined,
    createdAt: r.created_at,
  };
}

function taskToRow(t: Task, userId: string) {
  return {
    user_id: userId,
    local_id: t.id,
    title: t.title,
    description: t.description ?? null,
    notes: t.notes ?? null,
    task_date: t.date,
    category: t.category,
    priority: t.priority,
    estimated_minutes: t.estimatedMinutes ?? null,
    due_time: t.dueTime ?? null,
    deadline_date: t.deadlineDate ?? null,
    tags: t.tags ?? [],
    completed: t.completed,
    completed_at: t.completedAt ?? null,
    archived: t.archived,
    sort_order: t.order,
    recurrence: (t.recurrence ?? null) as unknown as never,
    recurrence_parent_id: t.recurrenceParentId ?? null,
    goal_id: t.goalId ?? null,
    created_at: t.createdAt,
  };
}

function tasksEqual(a: Task, b: Task): boolean {
  return (
    a.title === b.title &&
    a.description === b.description &&
    a.notes === b.notes &&
    a.date === b.date &&
    a.category === b.category &&
    a.priority === b.priority &&
    a.estimatedMinutes === b.estimatedMinutes &&
    a.dueTime === b.dueTime &&
    a.deadlineDate === b.deadlineDate &&
    a.completed === b.completed &&
    a.completedAt === b.completedAt &&
    a.archived === b.archived &&
    a.order === b.order &&
    a.goalId === b.goalId &&
    a.recurrenceParentId === b.recurrenceParentId &&
    JSON.stringify(a.tags ?? []) === JSON.stringify(b.tags ?? []) &&
    JSON.stringify(a.recurrence ?? null) === JSON.stringify(b.recurrence ?? null)
  );
}

// Task XP flows through the unified xp-sync layer; only bump for events
// that happen on today's date so the "today" mirror stays accurate.
async function bumpTaskXp(userId: string, delta: number, taskDate: string) {
  const today = new Date().toISOString().slice(0, 10);
  if (taskDate !== today) return;
  await bumpDailyXp(userId, delta);
}

async function hydrateFromRemote(userId: string): Promise<Task[] | null> {
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("user_id", userId);
  if (error) {
    console.error("Failed to load tasks", error);
    return null;
  }
  return ((data ?? []) as unknown as Row[]).map(rowToTask);
}

export function useTasksSync(userId: string | undefined) {
  const qc = useQueryClient();
  const prevRef = useRef<Map<string, Task>>(new Map());
  const readyRef = useRef(false);

  useEffect(() => {
    readyRef.current = false;
    prevRef.current = new Map();
    if (!userId) return;

    let cancelled = false;

    (async () => {
      const remote = await hydrateFromRemote(userId);
      if (cancelled || remote === null) return;
      // Always adopt the authenticated user's remote rows as the source of
      // truth. Never upload leftover local rows into this account — those may
      // belong to a different user who was signed in previously on this device.
      setState((s) => ({ ...s, tasks: remote }));
      prevRef.current = new Map(remote.map((t) => [t.id, t]));
      readyRef.current = true;
    })();


    return () => {
      cancelled = true;
    };
  }, [userId]);

  // Realtime: refresh from remote on changes from other tabs/devices.
  useEffect(() => {
    if (!userId) return;
    const refresh = async () => {
      const remote = await hydrateFromRemote(userId);
      if (!remote) return;
      setState((s) => ({ ...s, tasks: remote }));
      prevRef.current = new Map(remote.map((t) => [t.id, t]));
      qc.invalidateQueries({ queryKey: dashboardStatsKeys.today(userId) });
    };
    const channel = supabase
      .channel(`tasks-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tasks",
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

  useEffect(() => {
    if (!userId) return;
    let scheduled = false;

    const flush = async () => {
      scheduled = false;
      if (!readyRef.current) return;
      const current = getState().tasks;
      const prev = prevRef.current;
      const currentMap = new Map(current.map((t) => [t.id, t]));

      const toUpsert: Task[] = [];
      const completions: Task[] = [];
      const uncompletions: Task[] = [];

      for (const t of current) {
        const before = prev.get(t.id);
        if (!before) {
          toUpsert.push(t);
          if (t.completed) completions.push(t);
          continue;
        }
        if (!tasksEqual(before, t)) {
          toUpsert.push(t);
          if (!before.completed && t.completed) completions.push(t);
          else if (before.completed && !t.completed) uncompletions.push(t);
        }
      }

      const toDelete: string[] = [];
      for (const id of prev.keys()) if (!currentMap.has(id)) toDelete.push(id);

      try {
        if (toUpsert.length) {
          const rows = toUpsert.map((t) => taskToRow(t, userId));
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { error } = await supabase
            .from("tasks")
            .upsert(rows as any, { onConflict: "user_id,local_id" });
          if (error) throw error;
        }
        if (toDelete.length) {
          const { error } = await supabase
            .from("tasks")
            .delete()
            .eq("user_id", userId)
            .in("local_id", toDelete);
          if (error) throw error;
        }
      } catch (e) {
        console.error("Task sync failed", e);
        return; // keep prev snapshot so we retry next tick
      }

      for (const t of completions) {
        await bumpTaskXp(userId, XP_BY_PRIORITY[t.priority] ?? 0, t.date);
      }
      for (const t of uncompletions) {
        await bumpTaskXp(userId, -(XP_BY_PRIORITY[t.priority] ?? 0), t.date);
      }
      if (completions.length || uncompletions.length) {
        qc.invalidateQueries({ queryKey: dashboardStatsKeys.today(userId) });
      }

      prevRef.current = currentMap;
    };

    let lastTasks = getState().tasks;
    const unsubscribe = subscribeStore(() => {
      const now = getState().tasks;
      if (now === lastTasks) return;
      lastTasks = now;
      if (scheduled) return;
      scheduled = true;
      queueMicrotask(() => void flush());
    });

    return () => {
      unsubscribe();
    };
  }, [userId, qc]);
}
