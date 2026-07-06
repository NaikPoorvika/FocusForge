import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Moon, Sun, Trash2, Gift, Download, Upload, FileJson, FileSpreadsheet, LogOut, KeyRound, ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { PageHeader } from "@/components/ui-bits";
import {
  resetAchievements,
  resetRedemptionHistory,
  setRewardsPref,
  setState,
  useAppState,
} from "@/lib/store";
import { exportCSV, exportJSON, importJSONFile } from "@/lib/backup";
import { toggleTheme } from "@/components/theme-manager";
import { deleteAccount } from "@/lib/account.functions";
import { resetSpentXpForUser } from "@/lib/xp-sync";
import { useCurrentUser } from "@/hooks/use-current-user";
import { toast } from "sonner";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const settings = useAppState((s) => s.settings)!;
  const theme = useAppState((s) => s.theme);
  const showToasts = useAppState((s) => s.rewardsPrefs.showAchievementToasts);
  const redemptions = useAppState((s) => s.redemptions);
  const achievements = useAppState((s) => s.achievements);

  const update = <K extends keyof typeof settings>(k: K, v: (typeof settings)[K]) =>
    setState((s) => ({ ...s, settings: { ...s.settings!, [k]: v } }));

  const { user } = useCurrentUser();
  const userId = user?.id;

  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const runDeleteAccount = useServerFn(deleteAccount);

  const changePassword = async () => {
    if (newPassword.length < 6) return toast.error("Password must be at least 6 characters");
    if (newPassword !== confirmPassword) return toast.error("Passwords don't match");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setBusy(false);
    if (error) return toast.error(error.message);
    setNewPassword("");
    setConfirmPassword("");
    toast.success("Password updated");
  };

  const removeAccount = async () => {
    const confirmText = window.prompt(
      'This permanently deletes your account and all your data. Type "DELETE" to confirm.',
    );
    if (confirmText !== "DELETE") return;
    setBusy(true);
    try {
      await runDeleteAccount();
      await queryClient.cancelQueries();
      queryClient.clear();
      await supabase.auth.signOut();
      if (typeof window !== "undefined") {
        window.localStorage.removeItem("sst-app-state-v1");
        window.localStorage.removeItem("sst-extras-v1");
      }
      toast.success("Account deleted");
      navigate({ to: "/auth", replace: true });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  };

  const signOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate({ to: "/auth", replace: true });
  };

  const resetAll = () => {
    if (!confirm("Reset everything? This deletes tasks, goals, habits, and journal.")) return;
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("sst-app-state-v1");
      window.localStorage.removeItem("sst-extras-v1");
    }
    location.reload();
  };

  const onImport = async (file: File) => {
    try {
      await importJSONFile(file);
      toast.success("Backup restored");
      setTimeout(() => location.reload(), 400);
    } catch {
      toast.error("Import failed — check the file format");
    }
  };

  return (
    <div>
      <PageHeader title="Settings" subtitle="Tweak your challenge to fit your life." />

      <div className="space-y-6">
        <Card title="Profile">
          <Field label="Your name">
            <Input
              value={settings.studentName}
              onChange={(e) => update("studentName", e.target.value)}
              onBlur={async (e) => {
                const name = e.target.value.trim();
                if (!name) return;
                const { data: userData } = await supabase.auth.getUser();
                const uid = userData.user?.id;
                if (!uid) return;
                await supabase.auth.updateUser({ data: { full_name: name } });
                await supabase.from("profiles").update({ full_name: name }).eq("id", uid);
                toast.success("Name updated");
              }}
            />
          </Field>

          <Field label="Challenge name">
            <Input
              value={settings.challengeName}
              onChange={(e) => update("challengeName", e.target.value)}
            />
          </Field>
        </Card>

        <Card title="Challenge">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Duration (days)">
              <Input
                type="number"
                min={1}
                value={settings.duration}
                onChange={(e) => update("duration", Number(e.target.value) || 30)}
              />
            </Field>
            <Field label="Daily study goal (hours)">
              <Input
                type="number"
                step="0.5"
                min={0.5}
                value={settings.dailyStudyGoal}
                onChange={(e) => update("dailyStudyGoal", Number(e.target.value) || 3)}
              />
            </Field>
          </div>
        </Card>

        <Card title="Schedule">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Wake up">
              <Input type="time" value={settings.wakeTime} onChange={(e) => update("wakeTime", e.target.value)} />
            </Field>
            <Field label="Sleep">
              <Input type="time" value={settings.sleepTime} onChange={(e) => update("sleepTime", e.target.value)} />
            </Field>
            <Field label="Reminder">
              <Input
                type="time"
                value={settings.reminderTime}
                onChange={(e) => update("reminderTime", e.target.value)}
              />
            </Field>
          </div>
        </Card>

        <Card title="Appearance">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">Theme</p>
              <p className="text-xs text-muted-foreground">Switch between light and dark mode.</p>
            </div>
            <Button variant="outline" onClick={toggleTheme}>
              {theme === "dark" ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
              {theme === "dark" ? "Light mode" : "Dark mode"}
            </Button>
          </div>
        </Card>

        <Card title="Rewards & Achievements">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="min-w-0 pr-4">
                <p className="text-sm font-semibold">Achievement notifications</p>
                <p className="text-xs text-muted-foreground">
                  Show a toast when you unlock a new achievement.
                </p>
              </div>
              <Switch
                checked={showToasts}
                onCheckedChange={(v) => setRewardsPref("showAchievementToasts", v)}
              />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
              <div>
                <p className="text-sm font-semibold">Redemption history</p>
                <p className="text-xs text-muted-foreground">
                  {redemptions.length} redemption{redemptions.length === 1 ? "" : "s"} on record.
                </p>
              </div>
              <Button
                variant="outline"
                onClick={async () => {
                  if (!confirm("Clear redemption history and refund spent XP?")) return;
                  resetRedemptionHistory();
                  if (userId) await resetSpentXpForUser(userId);
                  toast.success("Redemption history cleared");
                }}
              >
                <Gift className="mr-2 h-4 w-4" /> Clear history
              </Button>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
              <div>
                <p className="text-sm font-semibold">Achievement progress</p>
                <p className="text-xs text-muted-foreground">
                  {achievements.length} unlocked. Resetting lets you re-unlock them.
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  if (!confirm("Reset achievement unlocks? (XP already earned stays.)")) return;
                  resetAchievements();
                  toast.success("Achievements reset");
                }}
              >
                <Trash2 className="mr-2 h-4 w-4" /> Reset achievements
              </Button>
            </div>
          </div>
        </Card>

        <Card title="Export & Backup">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={exportJSON}>
              <FileJson className="mr-2 h-4 w-4" /> Export JSON
            </Button>
            <Button variant="outline" onClick={exportCSV}>
              <FileSpreadsheet className="mr-2 h-4 w-4" /> Export CSV
            </Button>
            <Button variant="outline" onClick={() => window.print()}>
              <Download className="mr-2 h-4 w-4" /> Print / Save PDF
            </Button>
            <Button variant="outline" onClick={() => fileRef.current?.click()}>
              <Upload className="mr-2 h-4 w-4" /> Restore backup
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onImport(f);
                e.target.value = "";
              }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            JSON includes everything (tasks, habits, journal, resources, coding). CSV covers tasks and study sessions.
          </p>
        </Card>


        <Card title="Account">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">Sign out</p>
              <p className="text-xs text-muted-foreground">
                Sign out of your account on this device.
              </p>
            </div>
            <Button variant="outline" onClick={signOut}>
              <LogOut className="mr-2 h-4 w-4" /> Sign out
            </Button>
          </div>
        </Card>

        <Card title="Password">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="New password">
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 6 characters"
                autoComplete="new-password"
              />
            </Field>
            <Field label="Confirm password">
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
              />
            </Field>
          </div>
          <div className="flex justify-end">
            <Button onClick={changePassword} disabled={busy || !newPassword}>
              <KeyRound className="mr-2 h-4 w-4" /> Update password
            </Button>
          </div>
        </Card>

        <div className="flex items-center justify-between rounded-2xl border border-destructive/30 bg-destructive/5 p-5">
          <div>
            <p className="text-sm font-semibold text-destructive">Reset local data</p>
            <p className="text-xs text-muted-foreground">Clears the local cache and reloads.</p>
          </div>
          <Button variant="destructive" onClick={resetAll}>
            <Trash2 className="mr-2 h-4 w-4" /> Reset
          </Button>
        </div>

        <div className="flex items-center justify-between rounded-2xl border border-destructive/40 bg-destructive/10 p-5">
          <div className="min-w-0 pr-4">
            <p className="text-sm font-semibold text-destructive">Delete account</p>
            <p className="text-xs text-muted-foreground">
              Permanently deletes your account and all your data. This cannot be undone.
            </p>
          </div>
          <Button variant="destructive" onClick={removeAccount} disabled={busy}>
            <ShieldAlert className="mr-2 h-4 w-4" /> Delete
          </Button>
        </div>

        <div className="flex justify-end">
          <Button onClick={() => toast.success("Settings saved")}>Done</Button>
        </div>
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-3xl border border-border bg-card p-6 shadow-sm"
    >
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h3>
      <div className="space-y-4">{children}</div>
    </motion.div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
