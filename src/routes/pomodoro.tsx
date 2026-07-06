import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  Coffee,
  Zap,
  Trophy,
  Settings as SettingsIcon,
  Focus,
} from "lucide-react";
import { PageHeader } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  logPomodoro,
  logFocusSession,
  pauseTimer,
  resumeTimer,
  startTimer,
  stopTimer,
  timerElapsedMs,
  todayISO,
  updatePomodoroSettings,
  useAppState,
  type ActiveTimer,
} from "@/lib/store";
import { playChime } from "@/lib/sound";
import { Confetti } from "@/components/tasks/confetti";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useCurrentUser } from "@/hooks/use-current-user";
import { incrementPomodoro, insertFocusSession, dashboardStatsKeys } from "@/lib/dashboard-stats";
import { bumpDailyXp } from "@/lib/xp-sync";

export const Route = createFileRoute("/pomodoro")({
  component: PomodoroPage,
});

type Mode = "focus" | "short" | "long";
const KIND_MAP: Record<Mode, ActiveTimer["kind"]> = {
  focus: "pomodoro-focus",
  short: "pomodoro-short",
  long: "pomodoro-long",
};
const MODE_LABEL: Record<Mode, string> = {
  focus: "Focus",
  short: "Short break",
  long: "Long break",
};

function PomodoroPage() {
  const settings = useAppState((s) => s.pomodoroSettings);
  const activeTimer = useAppState((s) => s.activeTimer);
  const pomodoros = useAppState((s) => s.pomodoros);
  const { user } = useCurrentUser();
  const queryClient = useQueryClient();

  const [mode, setMode] = useState<Mode>("focus");
  const [customMin, setCustomMin] = useState<number>(settings.focus);
  const [now, setNow] = useState(Date.now());
  const [confetti, setConfetti] = useState(false);
  const [celebrate, setCelebrate] = useState<Mode | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [sessionCount, setSessionCount] = useState<number>(0);

  // If activeTimer exists and is a pomodoro, infer mode from kind
  const isPomo = activeTimer && activeTimer.kind.startsWith("pomodoro-");
  const currentKind = isPomo ? (activeTimer!.kind as ActiveTimer["kind"]) : KIND_MAP[mode];
  const inferredMode: Mode = isPomo
    ? currentKind === "pomodoro-focus"
      ? "focus"
      : currentKind === "pomodoro-short"
        ? "short"
        : "long"
    : mode;

  const displayMode = inferredMode;
  const targetSec = isPomo ? activeTimer!.targetSeconds : minsFor(mode, settings, customMin) * 60;

  // Tick
  useEffect(() => {
    if (!activeTimer) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [activeTimer]);

  // Focus mode CSS hook
  useEffect(() => {
    if (focusMode) document.body.dataset.focus = "on";
    else delete document.body.dataset.focus;
  }, [focusMode]);

  const elapsedMs = activeTimer ? timerElapsedMs({ ...activeTimer, startedAt: activeTimer.startedAt }) : 0;
  const remainingSec = Math.max(0, targetSec - Math.floor(elapsedMs / 1000));
  const progress = targetSec ? Math.min(1, elapsedMs / (targetSec * 1000)) : 0;

  // Completion detection
  useEffect(() => {
    if (!activeTimer || activeTimer.pausedAt || !isPomo) return;
    if (remainingSec === 0) {
      const finishedMode = inferredMode;
      const targetMin = Math.round(targetSec / 60);
      const startedAtIso = new Date(Date.now() - targetSec * 1000).toISOString();
      stopTimer();
      const { xp: pomoXp } = logPomodoro(finishedMode, targetMin);
      if (finishedMode === "focus") {
        const endedAtIso = new Date().toISOString();
        logFocusSession({
          startedAt: startedAtIso,
          endedAt: endedAtIso,
          targetSeconds: targetSec,
          actualSeconds: targetSec,
          outcome: "completed",
        });
        if (user?.id) {
          const uid = user.id;
          Promise.all([
            incrementPomodoro(uid, targetMin),
            insertFocusSession(uid, {
              started_at: startedAtIso,
              ended_at: endedAtIso,
              duration: targetSec,
              completed: true,
            }),
            bumpDailyXp(uid, pomoXp),
          ]).then(() => {
            queryClient.invalidateQueries({ queryKey: dashboardStatsKeys.today(uid) });
            queryClient.invalidateQueries({ queryKey: dashboardStatsKeys.totals(uid) });
            queryClient.invalidateQueries({ queryKey: dashboardStatsKeys.focusCount(uid) });
          });
        }
      } else if (user?.id) {
        // Short/long break also awards a small amount of XP (mirrors legacy behavior).
        void bumpDailyXp(user.id, pomoXp);
      }
      playChime();
      setConfetti(true);
      setCelebrate(finishedMode);
      if (finishedMode === "focus") {
        setSessionCount((c) => c + 1);
      }
    }
  }, [remainingSec, activeTimer, isPomo, inferredMode, targetSec]);

  // Auto-start next session if enabled
  useEffect(() => {
    if (!celebrate) return;
    if (!settings.autoStart) return;
    const t = setTimeout(() => {
      const next: Mode = celebrate === "focus"
        ? (sessionCount > 0 && sessionCount % settings.longEvery === 0 ? "long" : "short")
        : "focus";
      setMode(next);
      setCelebrate(null);
      startTimer({
        kind: KIND_MAP[next],
        targetSeconds: minsFor(next, settings, customMin) * 60,
        sessionCount,
      });
    }, 1600);
    return () => clearTimeout(t);
  }, [celebrate, settings, sessionCount, customMin]);

  void now; // touch state to trigger renders

  const handleStart = () => {
    if (activeTimer && !isPomo) {
      toast.error("Study timer is running — stop it first");
      return;
    }
    const minutes = minsFor(mode, settings, customMin);
    startTimer({ kind: KIND_MAP[mode], targetSeconds: minutes * 60, sessionCount });
  };

  const handleReset = () => {
    stopTimer();
  };

  const handleSkipBreak = () => {
    if (isPomo && (inferredMode === "short" || inferredMode === "long")) {
      stopTimer();
      setMode("focus");
      toast.success("Break skipped");
    }
  };

  const setPreset = (min: number) => {
    setMode("focus");
    setCustomMin(min);
  };

  const mm = String(Math.floor(remainingSec / 60)).padStart(2, "0");
  const ss = String(remainingSec % 60).padStart(2, "0");

  const todayPomos = pomodoros.filter((p) => p.date === todayISO() && p.mode === "focus").length;

  return (
    <div className={`pb-16 ${focusMode ? "" : ""}`}>
      <PageHeader
        title="Pomodoro Timer"
        subtitle="Deep work in focused blocks."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setFocusMode((v) => !v)}>
              <Focus className="mr-1 h-4 w-4" /> {focusMode ? "Exit focus" : "Focus mode"}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setSettingsOpen(true)}>
              <SettingsIcon className="mr-1 h-4 w-4" /> Settings
            </Button>
          </div>
        }
      />

      {/* Mode chips */}
      <div className="mb-6 flex flex-wrap gap-2">
        {(["focus", "short", "long"] as const).map((m) => (
          <button
            key={m}
            disabled={!!activeTimer}
            onClick={() => setMode(m)}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-all disabled:opacity-50 ${
              displayMode === m
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card hover:bg-muted"
            }`}
          >
            {m === "focus" ? <Zap className="h-3.5 w-3.5" /> : <Coffee className="h-3.5 w-3.5" />}
            {MODE_LABEL[m]}
          </button>
        ))}
      </div>

      {/* Timer ring */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto flex max-w-md flex-col items-center rounded-3xl border border-border bg-card p-8 shadow-lg"
      >
        <Ring progress={progress} mode={displayMode}>
          <div className="text-center">
            <p className="font-mono text-6xl font-bold tabular-nums sm:text-7xl">{mm}:{ss}</p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {activeTimer ? (activeTimer.pausedAt ? "Paused" : MODE_LABEL[displayMode]) : "Ready"}
            </p>
          </div>
        </Ring>

        {/* Presets */}
        {!activeTimer && mode === "focus" && (
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {[25, 50, 90].map((n) => (
              <button
                key={n}
                onClick={() => setPreset(n)}
                className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                  customMin === n
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-card hover:bg-muted"
                }`}
              >
                {n}m
              </button>
            ))}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">Custom</span>
              <Input
                type="number"
                min={1}
                max={180}
                value={customMin}
                onChange={(e) => setCustomMin(Math.max(1, Number(e.target.value) || 1))}
                className="h-8 w-16 text-center"
              />
              <span className="text-xs text-muted-foreground">min</span>
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {!activeTimer && (
            <Button size="lg" onClick={handleStart}>
              <Play className="mr-2 h-5 w-5" /> Start
            </Button>
          )}
          {activeTimer && !activeTimer.pausedAt && (
            <Button size="lg" variant="secondary" onClick={pauseTimer}>
              <Pause className="mr-2 h-5 w-5" /> Pause
            </Button>
          )}
          {activeTimer && activeTimer.pausedAt && (
            <Button size="lg" onClick={resumeTimer}>
              <Play className="mr-2 h-5 w-5" /> Resume
            </Button>
          )}
          {activeTimer && (
            <Button size="lg" variant="outline" onClick={handleReset}>
              <RotateCcw className="mr-2 h-5 w-5" /> Reset
            </Button>
          )}
          {activeTimer && (inferredMode === "short" || inferredMode === "long") && (
            <Button size="lg" variant="ghost" onClick={handleSkipBreak}>
              <SkipForward className="mr-2 h-5 w-5" /> Skip break
            </Button>
          )}
        </div>

        <div className="mt-5 flex items-center gap-2 text-xs text-muted-foreground">
          <Trophy className="h-3.5 w-3.5 text-amber-500" />
          {todayPomos} focus session{todayPomos === 1 ? "" : "s"} completed today
        </div>
      </motion.div>

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Timer settings</DialogTitle>
            <DialogDescription>Customize durations and behavior.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Focus (min)</Label>
                <Input type="number" min={1} value={settings.focus} onChange={(e) => updatePomodoroSettings({ focus: Number(e.target.value) || 25 })} />
              </div>
              <div>
                <Label>Short (min)</Label>
                <Input type="number" min={1} value={settings.short} onChange={(e) => updatePomodoroSettings({ short: Number(e.target.value) || 5 })} />
              </div>
              <div>
                <Label>Long (min)</Label>
                <Input type="number" min={1} value={settings.long} onChange={(e) => updatePomodoroSettings({ long: Number(e.target.value) || 15 })} />
              </div>
            </div>
            <div>
              <Label>Long break every N sessions</Label>
              <Input type="number" min={2} value={settings.longEvery} onChange={(e) => updatePomodoroSettings({ longEvery: Number(e.target.value) || 4 })} />
            </div>
            <div className="flex items-center justify-between rounded-xl border border-border p-3">
              <div>
                <p className="text-sm font-semibold">Auto-start next session</p>
                <p className="text-xs text-muted-foreground">Chain focus and breaks automatically.</p>
              </div>
              <Switch
                checked={settings.autoStart}
                onCheckedChange={(v) => updatePomodoroSettings({ autoStart: v })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setSettingsOpen(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Confetti show={confetti} onDone={() => setConfetti(false)} />

      <Dialog open={!!celebrate} onOpenChange={(v) => !v && setCelebrate(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-primary/15 text-primary">
              {celebrate === "focus" ? <Zap className="h-7 w-7" /> : <Coffee className="h-7 w-7" />}
            </div>
            <DialogTitle className="text-center">
              {celebrate === "focus" ? "Focus complete!" : "Break's over!"}
            </DialogTitle>
            <DialogDescription className="text-center">
              {celebrate === "focus"
                ? "Nice work. Take a short break — your brain needs it."
                : "Ready to dive back in?"}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-center">
            <Button onClick={() => setCelebrate(null)}>Continue</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function minsFor(mode: Mode, s: { focus: number; short: number; long: number }, customFocus: number) {
  if (mode === "focus") return customFocus;
  if (mode === "short") return s.short;
  return s.long;
}

function Ring({
  progress,
  mode,
  children,
}: {
  progress: number;
  mode: Mode;
  children: React.ReactNode;
}) {
  const r = 120;
  const c = 2 * Math.PI * r;
  const dash = c * progress;
  const stroke = mode === "focus" ? "var(--color-primary)" : "var(--color-success)";
  return (
    <div className="relative h-72 w-72">
      <svg viewBox="0 0 280 280" className="h-full w-full -rotate-90">
        <circle cx="140" cy="140" r={r} strokeWidth="14" fill="none" className="stroke-muted" />
        <motion.circle
          cx="140"
          cy="140"
          r={r}
          strokeWidth="14"
          fill="none"
          strokeLinecap="round"
          stroke={stroke}
          initial={{ strokeDasharray: `0 ${c}` }}
          animate={{ strokeDasharray: `${dash} ${c}` }}
          transition={{ duration: 0.3, ease: "linear" }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">{children}</div>
    </div>
  );
}
