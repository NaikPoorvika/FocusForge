// Single source of truth for XP.
//
// Architecture:
// - Supabase `public.daily_stats` is the ONLY persistent store for XP.
//   - `daily_stats.xp`       = XP earned that day (sum across all days = lifetime XP)
//   - `daily_stats.xp_spent` = XP spent that day (sum across all days = spent XP)
// - The local Zustand store (`state.xp`, `state.xpSpent`) is a read-only
//   mirror maintained by `useXpTotalsSync` — all UI reads through it so no
//   component needs to know how XP is stored.
// - Every XP producer (tasks, habits, goals, pomodoro, achievement unlocks,
//   tasks all-done bonus, extension) writes to `daily_stats` via `bumpDailyXp`.
// - Every XP consumer (redemptions) writes to `daily_stats.xp_spent` via
//   `bumpDailyXpSpent`.
//
// Do NOT mutate `state.xp` / `state.xpSpent` directly anywhere else.
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { setState } from "@/lib/store";
import {
  dashboardStatsKeys,
  ensureTodayStatsRow,
} from "@/lib/dashboard-stats";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Bump earned XP for a given day (defaults to today). Clamped to >= 0. */
export async function bumpDailyXp(
  userId: string,
  delta: number,
  date: string = today(),
): Promise<void> {
  if (!userId || !delta) return;
  try {
    if (date === today()) await ensureTodayStatsRow(userId);
    const { data, error } = await supabase
      .from("daily_stats")
      .select("xp")
      .eq("user_id", userId)
      .eq("stat_date", date)
      .maybeSingle();
    if (error) throw error;
    if (!data) {
      if (delta <= 0) return;
      const { error: insErr } = await supabase
        .from("daily_stats")
        .insert({ user_id: userId, stat_date: date, xp: delta });
      if (insErr && !String(insErr.message).toLowerCase().includes("duplicate")) {
        throw insErr;
      }
      return;
    }
    const next = Math.max(0, (data.xp ?? 0) + delta);
    const { error: upErr } = await supabase
      .from("daily_stats")
      .update({ xp: next })
      .eq("user_id", userId)
      .eq("stat_date", date);
    if (upErr) throw upErr;
  } catch (e) {
    console.error("bumpDailyXp failed", e);
  }
}

/** Bump spent XP for a given day (defaults to today). Clamped to >= 0. */
export async function bumpDailyXpSpent(
  userId: string,
  delta: number,
  date: string = today(),
): Promise<void> {
  if (!userId || !delta) return;
  try {
    if (date === today()) await ensureTodayStatsRow(userId);
    const { data, error } = await supabase
      .from("daily_stats")
      .select("xp_spent")
      .eq("user_id", userId)
      .eq("stat_date", date)
      .maybeSingle();
    if (error) throw error;
    if (!data) {
      if (delta <= 0) return;
      const { error: insErr } = await supabase
        .from("daily_stats")
        .insert({ user_id: userId, stat_date: date, xp_spent: delta });
      if (insErr && !String(insErr.message).toLowerCase().includes("duplicate")) {
        throw insErr;
      }
      return;
    }
    const next = Math.max(0, (data.xp_spent ?? 0) + delta);
    const { error: upErr } = await supabase
      .from("daily_stats")
      .update({ xp_spent: next })
      .eq("user_id", userId)
      .eq("stat_date", date);
    if (upErr) throw upErr;
  } catch (e) {
    console.error("bumpDailyXpSpent failed", e);
  }
}

/** Reset spent XP to 0 across every day for the given user. */
export async function resetSpentXpForUser(userId: string): Promise<void> {
  if (!userId) return;
  try {
    const { error } = await supabase
      .from("daily_stats")
      .update({ xp_spent: 0 })
      .eq("user_id", userId)
      .gt("xp_spent", 0);
    if (error) throw error;
  } catch (e) {
    console.error("resetSpentXpForUser failed", e);
  }
}

async function fetchTotals(
  userId: string,
): Promise<{ xp: number; xpSpent: number }> {
  const { data, error } = await supabase
    .from("daily_stats")
    .select("xp, xp_spent")
    .eq("user_id", userId);
  if (error) throw error;
  const rows = (data ?? []) as Array<{ xp: number | null; xp_spent: number | null }>;
  return rows.reduce(
    (acc, r) => ({
      xp: acc.xp + (r.xp ?? 0),
      xpSpent: acc.xpSpent + (r.xp_spent ?? 0),
    }),
    { xp: 0, xpSpent: 0 },
  );
}

/**
 * Mirrors XP totals from Supabase into the local store and keeps them in
 * sync via realtime `daily_stats` changes. Mount once (root).
 */
export function useXpTotalsSync(userId: string | undefined) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    const refresh = async () => {
      try {
        const { xp, xpSpent } = await fetchTotals(userId);
        if (cancelled) return;
        setState((s) => {
          if (s.xp === xp && s.xpSpent === xpSpent) return s;
          return { ...s, xp, xpSpent };
        });
      } catch (e) {
        console.error("useXpTotalsSync refresh failed", e);
      }
    };

    void refresh();

    const channel = supabase
      .channel(`xp-totals-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "daily_stats",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          void refresh();
          qc.invalidateQueries({ queryKey: dashboardStatsKeys.today(userId) });
          qc.invalidateQueries({ queryKey: dashboardStatsKeys.totals(userId) });
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [userId, qc]);
}
