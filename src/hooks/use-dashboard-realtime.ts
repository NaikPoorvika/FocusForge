import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { dashboardStatsKeys } from "@/lib/dashboard-stats";

/**
 * Subscribes to postgres_changes on daily_stats and focus_sessions for the
 * signed-in user and invalidates dashboard queries so extension writes show
 * up live without a manual refresh.
 */
export function useDashboardRealtime(userId: string | undefined) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!userId) return;

    const invalidate = () => {
      qc.invalidateQueries({ queryKey: dashboardStatsKeys.today(userId) });
      qc.invalidateQueries({ queryKey: dashboardStatsKeys.totals(userId) });
      qc.invalidateQueries({ queryKey: dashboardStatsKeys.focusCount(userId) });
    };

    const channel = supabase
      .channel(`dashboard-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "daily_stats", filter: `user_id=eq.${userId}` },
        invalidate,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "focus_sessions", filter: `user_id=eq.${userId}` },
        invalidate,
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, qc]);
}
