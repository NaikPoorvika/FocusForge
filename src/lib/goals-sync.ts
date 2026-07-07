// Bridges the local goal store to Supabase.
// - On sign-in: hydrates local goals from Supabase (or uploads local ones on first sign-in).
// - On any local goal change: diffs against last-synced snapshot and upserts/deletes rows.
// - Subscribes to Postgres Realtime so changes from other tabs/devices refresh the store.
// Same architecture used by tasks-sync and habits-sync.
import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  getState,
  setState,
  subscribeStore,
  type Goal,
} from "@/lib/store";
import { dashboardStatsKeys, ensureTodayStatsRow } from "@/lib/dashboard-stats";
import { bumpDailyXp } from "@/lib/xp-sync";

export const DEFAULT_GOAL_XP = 100;

function isCompleted(g: Goal): boolean {
  return !!g.completed || !!g.completedAt;
}

function completedToday(g: Goal): boolean {
  if (!isCompleted(g)) return false;
  const today = new Date().toISOString().slice(0, 10);
  return (g.completedAt ?? "").slice(0, 10) === today;
}

function goalXp(g: Goal): number {
  const v = typeof g.xpReward === "number" ? g.xpReward : DEFAULT_GOAL_XP;
  return Math.max(0, Math.round(v));
}

async function bumpDailyStats(
  userId: string,
  xpDelta: number,
  goalsDelta: number,
) {
  if (xpDelta === 0 && goalsDelta === 0) return;
  try {
    // XP always flows through the unified xp-sync layer.
    if (xpDelta !== 0) await bumpDailyXp(userId, xpDelta);
    if (goalsDelta === 0) return;
    const today = new Date().toISOString().slice(0, 10);
    await ensureTodayStatsRow(userId);
    const { data, error } = await supabase
      .from("daily_stats")
      .select("goals_completed_today")
      .eq("user_id", userId)
      .eq("stat_date", today)
      .single();
    if (error) throw error;
    const nextGoals = Math.max(0, (data?.goals_completed_today ?? 0) + goalsDelta);
    const { error: uErr } = await supabase
      .from("daily_stats")
      .update({ goals_completed_today: nextGoals })
      .eq("user_id", userId)
      .eq("stat_date", today);
    if (uErr) throw uErr;
  } catch (e) {
    console.error("bumpDailyStats (goal) failed", e);
  }
}


type Row = {
  local_id: string;
  title: string;
  description: string | null;
  category: string | null;
  priority: "low" | "medium" | "high";
  progress: number;
  completed: boolean;
  completed_at: string | null;
  target_date: string | null;
  xp_reward: number;
  sort_order: number;
  created_at: string;
};

function rowToGoal(r: Row): Goal {
  return {
    id: r.local_id,
    title: r.title,
    description: r.description ?? undefined,
    target: 100,
    progress: Number(r.progress ?? 0),
    category: r.category ?? undefined,
    priority: (r.priority as Goal["priority"]) ?? "medium",
    completed: !!r.completed,
    completedAt: r.completed_at ?? undefined,
    targetDate: r.target_date ?? undefined,
    deadline: r.target_date ?? undefined,
    xpReward: Number(r.xp_reward ?? 100),
    createdAt: r.created_at,
  };
}

function goalToRow(g: Goal, userId: string, sortOrder: number) {
  const progressPct = Math.max(
    0,
    Math.min(100, Math.round(((g.progress ?? 0) / (g.target || 100)) * 100)),
  );
  return {
    user_id: userId,
    local_id: g.id,
    title: g.title,
    description: g.description ?? null,
    category: g.category ?? null,
    priority: g.priority ?? "medium",
    progress: progressPct,
    completed: !!g.completed || !!g.completedAt,
    completed_at: g.completedAt ?? null,
    target_date: g.targetDate ?? g.deadline ?? null,
    xp_reward: g.xpReward ?? 100,
    sort_order: sortOrder,
    created_at: g.createdAt,
  };
}

function goalsEqual(a: Goal, b: Goal): boolean {
  return (
    a.title === b.title &&
    a.description === b.description &&
    a.category === b.category &&
    a.priority === b.priority &&
    a.progress === b.progress &&
    a.target === b.target &&
    !!a.completed === !!b.completed &&
    a.completedAt === b.completedAt &&
    (a.targetDate ?? a.deadline) === (b.targetDate ?? b.deadline) &&
    (a.xpReward ?? 100) === (b.xpReward ?? 100)
  );
}

async function hydrateFromRemote(userId: string): Promise<Goal[] | null> {
  const { data, error } = await supabase
    .from("goals")
    .select("*")
    .eq("user_id", userId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) {
    console.error("Failed to load goals", error);
    return null;
  }
  return ((data ?? []) as unknown as Row[]).map(rowToGoal);
}

export function useGoalsSync(userId: string | undefined) {
  const qc = useQueryClient();
  const prevRef = useRef<Map<string, Goal>>(new Map());
  const readyRef = useRef(false);

  // Initial hydrate / upload
  useEffect(() => {
    readyRef.current = false;
    prevRef.current = new Map();
    if (!userId) return;

    let cancelled = false;

    (async () => {
      const remote = await hydrateFromRemote(userId);
      if (cancelled || remote === null) return;
      // Adopt Supabase as the source of truth for this account. Never upload
      // leftover local goals into this account (they may be a different user's).
      setState((s) => ({ ...s, goals: remote }));
      prevRef.current = new Map(remote.map((g) => [g.id, g]));
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
      setState((s) => ({ ...s, goals: remote }));
      prevRef.current = new Map(remote.map((g) => [g.id, g]));
      qc.invalidateQueries({ queryKey: dashboardStatsKeys.today(userId) });
    };
    const channel = supabase
      .channel(`goals-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "goals",
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

  // Push local changes to Supabase (optimistic — local state has already updated)
  useEffect(() => {
    if (!userId) return;
    let scheduled = false;

    const flush = async () => {
      scheduled = false;
      if (!readyRef.current) return;
      const current = getState().goals;
      const prev = prevRef.current;
      const currentMap = new Map(current.map((g) => [g.id, g]));

      const toUpsert: { goal: Goal; index: number }[] = [];
      let xpDelta = 0;
      let goalsDelta = 0;
      current.forEach((g, i) => {
        const before = prev.get(g.id);
        if (!before || !goalsEqual(before, g)) toUpsert.push({ goal: g, index: i });

        const wasDone = before ? isCompleted(before) : false;
        const nowDone = isCompleted(g);
        if (!wasDone && nowDone) {
          xpDelta += goalXp(g);
          if (completedToday(g)) goalsDelta += 1;
        } else if (wasDone && !nowDone) {
          // Reverse XP awarded previously (use previous xpReward)
          xpDelta -= goalXp(before!);
          if (before && completedToday(before)) goalsDelta -= 1;
        }
      });

      const toDelete: string[] = [];
      for (const id of prev.keys()) if (!currentMap.has(id)) toDelete.push(id);

      try {
        if (toUpsert.length) {
          const rows = toUpsert.map(({ goal, index }) =>
            goalToRow(goal, userId, index),
          );
          const { error } = await supabase
            .from("goals")
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .upsert(rows as any, { onConflict: "user_id,local_id" });
          if (error) throw error;
        }
        if (toDelete.length) {
          const { error } = await supabase
            .from("goals")
            .delete()
            .eq("user_id", userId)
            .in("local_id", toDelete);
          if (error) throw error;
        }
      } catch (e) {
        console.error("Goal sync failed", e);
        return; // keep prev snapshot so we retry next tick
      }

      if (xpDelta !== 0 || goalsDelta !== 0) {
        await bumpDailyStats(userId, xpDelta, goalsDelta);
        qc.invalidateQueries({ queryKey: dashboardStatsKeys.today(userId) });
      }

      prevRef.current = currentMap;
    };

    let lastGoals = getState().goals;
    const unsubscribe = subscribeStore(() => {
      const now = getState().goals;
      if (now === lastGoals) return;
      lastGoals = now;
      if (scheduled) return;
      scheduled = true;
      queueMicrotask(() => void flush());
    });

    return () => {
      unsubscribe();
    };
  }, [userId, qc]);
}

// Convenience one-shot fetcher (mirrors the API surface asked for)
export async function fetchGoals(userId: string): Promise<Goal[]> {
  const remote = await hydrateFromRemote(userId);
  if (!remote) return getState().goals;
  setState((s) => ({ ...s, goals: remote }));
  return remote;
}
