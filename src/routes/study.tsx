import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Clock,
  Play,
  Pause,
  StopCircle,
  Plus,
  Trash2,
  Pencil,
  Timer,
  TrendingUp,
  Calendar as CalendarIcon,
  Trophy,
} from "lucide-react";
import { PageHeader } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  addSession,
  computeStudyStats,
  deleteSession,
  pauseTimer,
  resumeTimer,
  startTimer,
  stopTimer,
  timerElapsedMs,
  todayISO,
  updateSession,
  useAppState,
  type StudySession,
} from "@/lib/store";
import { DEFAULT_CATEGORIES } from "@/lib/task-constants";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useCurrentUser } from "@/hooks/use-current-user";
import { incrementStudyMinutes, dashboardStatsKeys } from "@/lib/dashboard-stats";

export const Route = createFileRoute("/study")({
  component: StudyPage,
});

function fmt(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function StudyPage() {
  const sessions = useAppState((s) => s.sessions);
  const activeTimer = useAppState((s) => s.activeTimer);
  const stats = useMemo(() => computeStudyStats(sessions), [sessions]);
  const { user } = useCurrentUser();
  const queryClient = useQueryClient();

  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState<string>("DSA");
  const [notes, setNotes] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [logOpen, setLogOpen] = useState(false);
  const [editing, setEditing] = useState<StudySession | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<StudySession | null>(null);

  const isStudyTimer = activeTimer?.kind === "study";
  const isRunning = isStudyTimer && !activeTimer?.pausedAt;

  useEffect(() => {
    if (!isStudyTimer) return;
    const id = setInterval(() => {
      setElapsed(timerElapsedMs(activeTimer!));
    }, 250);
    setElapsed(timerElapsedMs(activeTimer!));
    return () => clearInterval(id);
  }, [isStudyTimer, activeTimer]);

  const minutes = Math.floor(elapsed / 60000);
  const seconds = Math.floor((elapsed % 60000) / 1000);
  const timeText = `${String(Math.floor(elapsed / 3600000)).padStart(2, "0")}:${String(
    minutes % 60,
  ).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  const handleStart = () => {
    if (activeTimer && activeTimer.kind !== "study") {
      toast.error("A pomodoro is already running");
      return;
    }
    startTimer({
      kind: "study",
      targetSeconds: 0,
      subject: subject || undefined,
      category,
      notes: notes || undefined,
    });
  };

  const handleStop = () => {
    const t = stopTimer();
    if (!t) return;
    const mins = Math.max(1, Math.round((t.accumulatedMs + (t.pausedAt ? 0 : Date.now() - t.startedAt)) / 60000));
    addSession({
      date: todayISO(),
      minutes: mins,
      subject: t.subject,
      category: t.category,
      notes: t.notes,
      startedAt: new Date(Date.now() - t.accumulatedMs).toISOString(),
      source: "timer",
    });
    if (user?.id) {
      const uid = user.id;
      incrementStudyMinutes(uid, mins).then(() => {
        queryClient.invalidateQueries({ queryKey: dashboardStatsKeys.today(uid) });
        queryClient.invalidateQueries({ queryKey: dashboardStatsKeys.totals(uid) });
      });
    }
    setSubject("");
    setNotes("");
    setElapsed(0);
    toast.success(`Logged ${fmt(mins)} of study`);
  };

  return (
    <div className="pb-16">
      <PageHeader
        title="Study Tracker"
        subtitle="Track time on task. Consistency compounds."
        actions={
          <Button variant="outline" onClick={() => { setEditing(null); setLogOpen(true); }}>
            <Plus className="mr-1 h-4 w-4" /> Log manually
          </Button>
        }
      />

      {/* Live timer */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="gradient-primary relative overflow-hidden rounded-3xl p-6 text-primary-foreground shadow-xl shadow-primary/25"
      >
        <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-5">
            <div className="grid h-16 w-16 place-items-center rounded-2xl bg-white/15 backdrop-blur">
              <Timer className="h-8 w-8" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest opacity-80">
                {isStudyTimer ? (isRunning ? "Studying" : "Paused") : "Ready to start"}
              </p>
              <p className="mt-1 font-mono text-4xl font-bold tabular-nums sm:text-5xl">{timeText}</p>
              {isStudyTimer && activeTimer?.subject && (
                <p className="mt-1 text-sm opacity-90">{activeTimer.subject} · {activeTimer.category}</p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {!isStudyTimer && (
              <Button size="lg" onClick={handleStart} className="bg-white text-primary hover:bg-white/90">
                <Play className="mr-2 h-5 w-5" /> Start
              </Button>
            )}
            {isRunning && (
              <Button size="lg" onClick={pauseTimer} variant="secondary">
                <Pause className="mr-2 h-5 w-5" /> Pause
              </Button>
            )}
            {isStudyTimer && !isRunning && (
              <Button size="lg" onClick={resumeTimer} className="bg-white text-primary hover:bg-white/90">
                <Play className="mr-2 h-5 w-5" /> Resume
              </Button>
            )}
            {isStudyTimer && (
              <Button size="lg" onClick={handleStop} variant="destructive">
                <StopCircle className="mr-2 h-5 w-5" /> Stop & log
              </Button>
            )}
          </div>
        </div>

        {!isStudyTimer && (
          <div className="relative mt-5 grid gap-2 sm:grid-cols-[1fr_180px_1fr]">
            <Input
              placeholder="What are you studying?"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="border-white/30 bg-white/10 text-primary-foreground placeholder:text-primary-foreground/70"
            />
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="border-white/30 bg-white/10 text-primary-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DEFAULT_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder="Notes (optional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="border-white/30 bg-white/10 text-primary-foreground placeholder:text-primary-foreground/70"
            />
          </div>
        )}
      </motion.div>

      {/* Stats */}
      <div className="mt-6 grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
        <StatCard icon={Clock} label="Today" value={fmt(stats.todayMin)} tone="primary" />
        <StatCard icon={CalendarIcon} label="This week" value={fmt(stats.weekMin)} tone="primary" />
        <StatCard icon={CalendarIcon} label="This month" value={fmt(stats.monthMin)} tone="muted" />
        <StatCard icon={TrendingUp} label="Avg / day" value={fmt(stats.avgDaily)} tone="muted" />
        <StatCard icon={Trophy} label="Longest" value={fmt(stats.longest)} tone="warning" />
        <StatCard icon={Clock} label="Total" value={fmt(stats.total)} tone="success" />
      </div>

      {/* Sessions */}
      <div className="mt-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Recent sessions
        </h2>
        {sessions.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border bg-card/50 py-12 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary">
              <Clock className="h-6 w-6" />
            </div>
            <p className="mt-3 text-sm font-semibold">No sessions logged yet</p>
            <p className="mx-auto mt-1 max-w-sm px-6 text-xs text-muted-foreground">
              Start a live session above or log one manually.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence initial={false}>
              {sessions.slice(0, 40).map((s) => (
                <motion.div
                  key={s.id}
                  layout
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="group flex items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm hover:border-primary/40"
                >
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">
                      {s.subject || s.category || "Study session"}
                      <span className="ml-2 text-xs font-normal text-muted-foreground">{fmt(s.minutes)}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(s.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                      {s.category ? ` · ${s.category}` : ""}
                      {s.source === "pomodoro" ? " · 🍅" : ""}
                    </p>
                    {s.notes && <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{s.notes}</p>}
                  </div>
                  <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      onClick={() => { setEditing(s); setLogOpen(true); }}
                      className="rounded-lg p-2 text-muted-foreground hover:bg-muted"
                      aria-label="Edit"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setConfirmDelete(s)}
                      className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      aria-label="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      <SessionFormDialog
        open={logOpen}
        onOpenChange={setLogOpen}
        editing={editing}
      />

      <AlertDialog open={!!confirmDelete} onOpenChange={(v) => !v && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this session?</AlertDialogTitle>
            <AlertDialogDescription>This action can't be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (confirmDelete) {
                  deleteSession(confirmDelete.id);
                  toast.success("Session deleted");
                }
                setConfirmDelete(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  tone: "primary" | "success" | "warning" | "muted";
}) {
  const cls =
    tone === "success"
      ? "bg-success/15 text-success"
      : tone === "warning"
        ? "bg-amber-500/15 text-amber-600 dark:text-amber-300"
        : tone === "muted"
          ? "bg-muted text-muted-foreground"
          : "bg-primary/10 text-primary";
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="card-hover rounded-2xl border border-border bg-card p-4 shadow-sm"
    >
      <div className={`grid h-9 w-9 place-items-center rounded-lg ${cls}`}>
        <Icon className="h-4 w-4" />
      </div>
      <p className="mt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-lg font-bold">{value}</p>
    </motion.div>
  );
}

function SessionFormDialog({
  open,
  onOpenChange,
  editing,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: StudySession | null;
}) {
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState<string>("DSA");
  const [amount, setAmount] = useState<string>("");
  const [unit, setUnit] = useState<"m" | "h">("m");
  const [date, setDate] = useState(todayISO());
  const [time, setTime] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setSubject(editing.subject ?? "");
      setCategory(editing.category ?? "DSA");
      if (editing.minutes % 60 === 0 && editing.minutes >= 60) {
        setAmount(String(editing.minutes / 60));
        setUnit("h");
      } else {
        setAmount(String(editing.minutes));
        setUnit("m");
      }
      setDate(editing.date);
      setTime(editing.startedAt ? new Date(editing.startedAt).toISOString().slice(11, 16) : "");
      setNotes(editing.notes ?? "");
    } else {
      setSubject("");
      setCategory("DSA");
      setAmount("");
      setUnit("m");
      setDate(todayISO());
      setTime("");
      setNotes("");
    }
  }, [open, editing]);

  const save = () => {
    const mins = Math.max(1, Math.round(Number(amount) * (unit === "h" ? 60 : 1)));
    if (!mins) {
      toast.error("Duration required");
      return;
    }
    const payload = {
      date,
      minutes: mins,
      subject: subject || undefined,
      category,
      notes: notes || undefined,
      startedAt: time ? `${date}T${time}:00` : undefined,
    };
    if (editing) {
      updateSession(editing.id, payload);
      toast.success("Session updated");
    } else {
      addSession({ ...payload, source: "manual" });
      toast.success("Session logged");
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit session" : "Log session"}</DialogTitle>
          <DialogDescription>Record time you already spent.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Subject</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Arrays deep-dive" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DEFAULT_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Duration *</Label>
              <div className="flex gap-2">
                <Input type="number" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} />
                <Select value={unit} onValueChange={(v) => setUnit(v as "m" | "h")}>
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="m">min</SelectItem>
                    <SelectItem value="h">hr</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Date</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div>
              <Label>Start time</Label>
              <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save}>{editing ? "Save" : "Log session"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
