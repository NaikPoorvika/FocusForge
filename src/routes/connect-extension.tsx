import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Copy, Check, Puzzle, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui-bits";
import { toast } from "sonner";

export const Route = createFileRoute("/connect-extension")({
  component: ConnectExtensionPage,
});

type PairingPayload = {
  supabaseUrl: string;
  supabasePublishableKey: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: number | null;
  userId: string;
  email: string | null;
};

function ConnectExtensionPage() {
  const [payload, setPayload] = useState<PairingPayload | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.auth.getSession();
    const s = data.session;
    if (!s) {
      setPayload(null);
      setLoading(false);
      return;
    }
    setPayload({
      supabaseUrl: import.meta.env.VITE_SUPABASE_URL as string,
      supabasePublishableKey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string,
      accessToken: s.access_token,
      refreshToken: s.refresh_token,
      expiresAt: s.expires_at ?? null,
      userId: s.user.id,
      email: s.user.email ?? null,
    });
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const json = useMemo(() => (payload ? JSON.stringify(payload, null, 2) : ""), [payload]);

  const copy = async () => {
    if (!json) return;
    await navigator.clipboard.writeText(json);
    setCopied(true);
    toast.success("Session payload copied");
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div>
      <PageHeader
        title="Connect Chrome extension"
        subtitle="Pair your extension so it can write XP, streaks, and focus sessions to your account."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-2">
              <Puzzle className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Manual pairing</h3>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Copy the JSON below, then in your extension popup click{" "}
              <strong>Paste Session JSON</strong> and paste it in. The extension will call{" "}
              <code>supabase.auth.setSession()</code> and store it in{" "}
              <code>chrome.storage.local</code>.
            </p>

            <ol className="mt-4 list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
              <li>Click <strong>Copy JSON</strong> below.</li>
              <li>Open the extension popup and click <strong>Paste Session JSON</strong>.</li>
              <li>Paste and confirm — the extension will authenticate as you.</li>
            </ol>
          </div>

          <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Session payload</h3>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={load} disabled={loading}>
                  <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                  Refresh
                </Button>
                <Button size="sm" onClick={copy} disabled={!json}>
                  {copied ? (
                    <>
                      <Check className="mr-1.5 h-3.5 w-3.5" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy className="mr-1.5 h-3.5 w-3.5" /> Copy JSON
                    </>
                  )}
                </Button>
              </div>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Contains your Supabase URL, publishable key, and current session tokens. Refresh
              if the extension reports an expired token.
            </p>
            <pre className="mt-4 max-h-80 overflow-auto rounded-xl bg-muted/60 p-4 text-xs">
              {loading ? "Loading…" : json || "Not signed in"}
            </pre>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
            <h3 className="text-lg font-semibold">Extension popup — Paste Session JSON</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Reference implementation for the button handler in the extension popup:
            </p>
            <pre className="mt-3 overflow-auto rounded-lg bg-muted/60 p-3 text-xs">{`// popup.js
document.getElementById("paste").addEventListener("click", async () => {
  const raw = prompt("Paste the session JSON from the web app");
  if (!raw) return;
  let s;
  try { s = JSON.parse(raw); } catch { return alert("Invalid JSON"); }

  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(s.supabaseUrl, s.supabasePublishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await supabase.auth.setSession({
    access_token: s.accessToken,
    refresh_token: s.refreshToken,
  });
  if (error) return alert(error.message);

  await chrome.storage.local.set({ lovableSession: s });
  alert("Paired!");
});`}</pre>
          </div>

          <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
            <h3 className="text-lg font-semibold">Write contract</h3>
            <div className="mt-3 space-y-3 text-xs">
              <div>
                <p className="font-medium text-foreground">daily_stats (upsert on user_id + stat_date)</p>
                <pre className="mt-1 overflow-auto rounded-lg bg-muted/60 p-3">{`{
  user_id, stat_date: "YYYY-MM-DD",
  xp, streak, longest_streak,
  focus_score,
  today_distractions, total_distractions,
  completed_pomodoros, study_minutes
}`}</pre>
              </div>
              <div>
                <p className="font-medium text-foreground">focus_sessions (insert)</p>
                <pre className="mt-1 overflow-auto rounded-lg bg-muted/60 p-3">{`{
  user_id, website,
  started_at, ended_at,
  duration, completed
}`}</pre>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
