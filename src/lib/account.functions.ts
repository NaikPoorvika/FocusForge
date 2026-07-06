import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Permanently delete the authenticated user's account and all associated data.
 * Row cascades handle related rows via ON DELETE CASCADE on user_id FKs to auth.users.
 */
export const deleteAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const userId = context.userId;

    // Best-effort cleanup of app tables (in case cascade isn't set)
    const tables = [
      "tasks",
      "habits",
      "habit_logs",
      "goals",
      "journal_entries",
      "focus_sessions",
      "daily_stats",
    ] as const;
    for (const t of tables) {
      await supabaseAdmin.from(t).delete().eq("user_id", userId);
    }
    await supabaseAdmin.from("profiles").delete().eq("id", userId);

    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) throw error;
    return { ok: true };
  });
