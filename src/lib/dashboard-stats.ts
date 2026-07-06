import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

function todayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export type DailyStatsRow = {
  id: string;
  user_id: string;
  stat_date: string;
  xp: number;
  streak: number;
  longest_streak: number;
  focus_score: number;
  today_distractions: number;
  total_distractions: number;
  completed_pomodoros: number;
  study_minutes: number;
};

export const todayStatsQueryOptions = (userId: string | undefined) =>
  queryOptions({
    queryKey: ["daily_stats", "today", userId],
    enabled: !!userId,
    queryFn: async (): Promise<DailyStatsRow | null> => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from("daily_stats")
        .select("*")
        .eq("user_id", userId)
        .eq("stat_date", todayDate())
        .maybeSingle();
      if (error) throw error;
      return (data as DailyStatsRow | null) ?? null;
    },
  });

export const totalsQueryOptions = (userId: string | undefined) =>
  queryOptions({
    queryKey: ["daily_stats", "totals", userId],
    enabled: !!userId,
    queryFn: async () => {
      if (!userId) return { total_distractions: 0, completed_pomodoros: 0, study_minutes: 0 };
      const { data, error } = await supabase
        .from("daily_stats")
        .select("total_distractions, completed_pomodoros, study_minutes")
        .eq("user_id", userId);
      if (error) throw error;
      const rows = (data ?? []) as Array<Pick<DailyStatsRow, "total_distractions" | "completed_pomodoros" | "study_minutes">>;
      return rows.reduce(
        (acc, r) => ({
          total_distractions: acc.total_distractions + (r.total_distractions ?? 0),
          completed_pomodoros: acc.completed_pomodoros + (r.completed_pomodoros ?? 0),
          study_minutes: acc.study_minutes + (r.study_minutes ?? 0),
        }),
        { total_distractions: 0, completed_pomodoros: 0, study_minutes: 0 },
      );
    },
  });

export const focusSessionsCountQueryOptions = (userId: string | undefined) =>
  queryOptions({
    queryKey: ["focus_sessions", "count", userId],
    enabled: !!userId,
    queryFn: async () => {
      if (!userId) return 0;
      const { count, error } = await supabase
        .from("focus_sessions")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId);
      if (error) throw error;
      return count ?? 0;
    },
  });

/** Ensure today's row exists (idempotent). */
export async function ensureTodayStatsRow(userId: string): Promise<void> {
  const { data, error: selErr } = await supabase
    .from("daily_stats")
    .select("id")
    .eq("user_id", userId)
    .eq("stat_date", todayDate())
    .maybeSingle();
  if (selErr) throw selErr;
  if (data) return;
  const { error } = await supabase.from("daily_stats").insert({
    user_id: userId,
    stat_date: todayDate(),
  });
  // Ignore unique-violation races
  if (error && !String(error.message).toLowerCase().includes("duplicate")) {
    throw error;
  }
}

async function fetchToday(userId: string): Promise<DailyStatsRow> {
  await ensureTodayStatsRow(userId);
  const { data, error } = await supabase
    .from("daily_stats")
    .select("*")
    .eq("user_id", userId)
    .eq("stat_date", todayDate())
    .single();
  if (error) throw error;
  return data as DailyStatsRow;
}

async function patchToday(userId: string, patch: Partial<DailyStatsRow>): Promise<void> {
  const { error } = await supabase
    .from("daily_stats")
    .update(patch)
    .eq("user_id", userId)
    .eq("stat_date", todayDate());
  if (error) throw error;
}

export async function incrementPomodoro(userId: string, minutes: number): Promise<void> {
  // XP is intentionally NOT bumped here — the pomodoro route pushes XP
  // through bumpDailyXp (see src/lib/xp-sync.ts) so there is a single XP path.
  try {
    const row = await fetchToday(userId);
    await patchToday(userId, {
      completed_pomodoros: (row.completed_pomodoros ?? 0) + 1,
      study_minutes: (row.study_minutes ?? 0) + Math.max(0, minutes),
    });
  } catch (e) {
    console.error("incrementPomodoro failed", e);
  }
}

export async function incrementStudyMinutes(userId: string, minutes: number): Promise<void> {
  try {
    if (minutes <= 0) return;
    const row = await fetchToday(userId);
    await patchToday(userId, {
      study_minutes: (row.study_minutes ?? 0) + minutes,
    });
  } catch (e) {
    console.error("incrementStudyMinutes failed", e);
  }
}

export async function incrementDistraction(userId: string): Promise<void> {
  try {
    const row = await fetchToday(userId);
    await patchToday(userId, {
      today_distractions: (row.today_distractions ?? 0) + 1,
      total_distractions: (row.total_distractions ?? 0) + 1,
      focus_score: Math.max(0, (row.focus_score ?? 100) - 5),
    });
  } catch (e) {
    console.error("incrementDistraction failed", e);
  }
}

export async function insertFocusSession(
  userId: string,
  entry: {
    website?: string | null;
    started_at: string;
    ended_at: string;
    duration: number;
    completed: boolean;
  },
): Promise<void> {
  try {
    const { error } = await supabase.from("focus_sessions").insert({
      user_id: userId,
      website: entry.website ?? null,
      started_at: entry.started_at,
      ended_at: entry.ended_at,
      duration: entry.duration,
      completed: entry.completed,
    });
    if (error) throw error;
  } catch (e) {
    console.error("insertFocusSession failed", e);
  }
}

export const dashboardStatsKeys = {
  today: (userId?: string) => ["daily_stats", "today", userId] as const,
  totals: (userId?: string) => ["daily_stats", "totals", userId] as const,
  focusCount: (userId?: string) => ["focus_sessions", "count", userId] as const,
};
