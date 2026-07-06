import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  Flame,
  Trophy,
  Clock,
  CheckCircle2,
  Circle,
  Plus,
  Play,
  Pause,
  BookHeart,
  Calendar as CalendarIcon,
  Sparkles,
  TrendingUp,
  Target,
  Timer,
  Repeat,
  Lightbulb,
  Rocket,
  Info,
  Coins,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui-bits";


import {
  computeStreaks,
  computeStudyStats,
  currentChallengeDay,
  todayISO,
  toggleHabitDay,
  timerElapsedMs,
  useAppState,
  addTask,
} from "@/lib/store";
import { productivityScore } from "@/lib/productivity";
import { dailyMotivation } from "@/lib/motivation";
import { generateInsights } from "@/lib/insights";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { Zap, Brain, AlertCircle } from "lucide-react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useDisplayName, firstName } from "@/hooks/use-display-name";
import {
  todayStatsQueryOptions,
  focusSessionsCountQueryOptions,
  ensureTodayStatsRow,
} from "@/lib/dashboard-stats";
import { useDashboardRealtime } from "@/hooks/use-dashboard-realtime";

export const Route = createFileRoute("/")({
  component: Dashboard,
});

function Dashboard() {
  const settings = useAppState((s) => s.settings)!;
  const tasks = useAppState((s) => s.tasks);
  const sessions = useAppState((s) => s.sessions);
  const habits = useAppState((s) => s.habits);
  const goals = useAppState((s) => s.goals);
  const journal = useAppState((s) => s.journal);
  const activeTimer = useAppState((s) => s.activeTimer);
  const state = useAppState((s) => s);
  const displayName = useDisplayName("there");

  const day = currentChallengeDay(settings);
  const progressPct = Math.round((day / settings.duration) * 100);

  const today = todayISO();
  const todayTasks = tasks.filter((t) => t.date === today && !t.archived);
  const pending = todayTasks.filter((t) => !t.completed);
  const done = todayTasks.filter((t) => t.completed);

  const studyStats = useMemo(() => computeStudyStats(sessions), [sessions]);
  const totalHours = (studyStats.total / 60).toFixed(1);
  const todayHours = (studyStats.todayMin / 60).toFixed(1);
  const dailyGoalMin = settings.dailyStudyGoal * 60;
  const studyPct = Math.min(100, Math.round((studyStats.todayMin / Math.max(1, dailyGoalMin)) * 100));

  const { current, longest } = computeStreaks(tasks);
  const motiv = useMemo(() => dailyMotivation(), []);
  const score = useMemo(() => productivityScore(state, today), [state, today]);

  const [quickTitle, setQuickTitle] = useState("");
  const addQuick = () => {
    if (!quickTitle.trim()) return;
    addTask({
      title: quickTitle.trim(),
      date: today,
      category: "General",
      priority: "medium",
    });
    setQuickTitle("");
    toast.success("Task added");
  };

  const activeGoals = goals.filter((g) => !g.completedAt).slice(0, 3);
  const recentJournal = journal[0];

  // Upcoming deadlines (tasks + goals, next 14 days)
  const upcoming = useMemo(() => {
    const now = today;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + 14);
    const cutoffISO = cutoff.toISOString().slice(0, 10);
    const items: { title: string; date: string; kind: "task" | "goal"; to: string }[] = [];
    tasks
      .filter((t) => !t.archived && !t.completed && t.deadlineDate && t.deadlineDate >= now && t.deadlineDate <= cutoffISO)
      .forEach((t) => items.push({ title: t.title, date: t.deadlineDate!, kind: "task", to: "/tasks" }));
    goals
      .filter((g) => !g.completedAt && g.deadline && g.deadline >= now && g.deadline <= cutoffISO)
      .forEach((g) => items.push({ title: g.title, date: g.deadline!, kind: "goal", to: "/goals" }));
    return items.sort((a, b) => a.date.localeCompare(b.date)).slice(0, 5);
  }, [tasks, goals, today]);

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${firstName(displayName)}`}
        subtitle={`Day ${day} of ${settings.duration} — ${new Date().toLocaleDateString(undefined, {
          weekday: "long",
          month: "long",
          day: "numeric",
        })}`}
      />



      {/* Hero row */}
      <div className="grid gap-4 md:grid-cols-3">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-hover gradient-primary relative col-span-1 overflow-hidden rounded-3xl border border-primary/20 p-6 text-primary-foreground shadow-xl shadow-primary/20 md:col-span-2"
        >
          <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
          <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center">
            <CircularProgress value={progressPct} />
            <div className="flex-1">
              <p className="text-xs font-medium uppercase tracking-widest opacity-80">Challenge progress</p>
              <h2 className="mt-1 text-2xl font-bold sm:text-3xl">{settings.challengeName}</h2>
              <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-white/20">
                <motion.div
                  className="h-full rounded-full bg-white"
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPct}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                />
              </div>
              <p className="mt-2 text-sm opacity-90">
                {settings.duration - day} days to go. Keep building momentum.
              </p>
            </div>
          </div>
        </motion.div>

        <ProductivityCard score={score} />
      </div>

      {/* Running timer strip */}
      {activeTimer && <RunningTimerCard />}

      {/* Supabase-backed stats */}
      <SupabaseStatRow
        currentStreak={current}
        longestStreak={longest}
        studyToday={todayHours}
        totalStudy={totalHours}
        tasksDoneToday={done.length}
        tasksTotalToday={todayTasks.length}
      />


      {/* Quick actions */}
      <div className="mt-8">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Quick actions
        </h3>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <QuickAction icon={Plus} label="Add task" onClick={() => document.getElementById("quick-task")?.focus()} />
          <QuickAction icon={Timer} label="Pomodoro" to="/pomodoro" />
          <QuickAction icon={Clock} label="Study timer" to="/study" />
          <QuickAction icon={BookHeart} label="Journal" to="/journal" />
        </div>
      </div>

      {/* Today panel */}
      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Tasks */}
          <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Today's tasks</h3>
              <Link to="/tasks" className="text-xs font-medium text-primary hover:underline">See all</Link>
            </div>
            <div className="mt-4 flex gap-2">
              <Input
                id="quick-task"
                placeholder="Add a task for today…"
                value={quickTitle}
                onChange={(e) => setQuickTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addQuick()}
              />
              <Button onClick={addQuick}>Add</Button>
            </div>
            <div className="mt-5 space-y-2">
              {todayTasks.length === 0 && (
                <p className="rounded-xl bg-muted/50 px-4 py-6 text-center text-sm text-muted-foreground">
                  No tasks yet — add your first one above.
                </p>
              )}
              {pending.slice(0, 4).map((t) => (
                <TaskRow key={t.id} title={t.title} done={false} />
              ))}
              {done.slice(0, 2).map((t) => (
                <TaskRow key={t.id} title={t.title} done />
              ))}
            </div>
          </div>

          {/* Habits strip */}
          <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Today's habits</h3>
              <Link to="/habits" className="text-xs font-medium text-primary hover:underline">Manage</Link>
            </div>
            {habits.length === 0 ? (
              <p className="mt-4 rounded-xl bg-muted/50 px-4 py-6 text-center text-sm text-muted-foreground">
                <Link to="/habits" className="text-primary hover:underline">Add a habit</Link> to build momentum.
              </p>
            ) : (
              <div className="mt-4 flex flex-wrap gap-2">
                {habits.slice(0, 12).map((h) => {
                  const doneToday = !!h.history[today];
                  return (
                    <button
                      key={h.id}
                      onClick={() => toggleHabitDay(h.id, today)}
                      className={`group inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition-all ${
                        doneToday
                          ? "border-success bg-success/15 text-success"
                          : "border-border bg-card hover:border-primary/40 hover:bg-primary/5"
                      }`}
                    >
                      <span className="text-base">{h.emoji}</span>
                      {h.name}
                      {doneToday && <CheckCircle2 className="h-3.5 w-3.5" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Goals */}
          <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Monthly goals</h3>
              <Link to="/goals" className="text-xs font-medium text-primary hover:underline">See all</Link>
            </div>
            {activeGoals.length === 0 ? (
              <p className="mt-4 rounded-xl bg-muted/50 px-4 py-6 text-center text-sm text-muted-foreground">
                <Link to="/goals" className="text-primary hover:underline">Add a goal</Link> to aim for this month.
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {activeGoals.map((g) => {
                  const pct = Math.min(100, Math.round((g.progress / Math.max(1, g.target)) * 100));
                  return (
                    <div key={g.id}>
                      <div className="mb-1 flex items-baseline justify-between text-sm">
                        <span className="font-medium">{g.title}</span>
                        <span className="text-xs text-muted-foreground">{g.progress}/{g.target}</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          className="gradient-primary h-full rounded-full"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Side column */}
        <div className="space-y-6">
          {/* Study today */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="card-hover rounded-3xl border border-border bg-card p-6 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Study today</p>
              <Link to="/study" className="text-xs font-medium text-primary hover:underline">Open</Link>
            </div>
            <div className="mt-2 flex items-end justify-between gap-4">
              <div>
                <p className="text-3xl font-bold">{todayHours}<span className="ml-1 text-base font-medium text-muted-foreground">/ {settings.dailyStudyGoal}h</span></p>
                <p className="mt-0.5 text-xs text-muted-foreground">Daily goal</p>
              </div>
              <MiniRing value={studyPct} />
            </div>
          </motion.div>

          {/* AI Insights */}
          <AiInsightsCard />


          {/* Motivation */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="card-hover rounded-3xl border border-border bg-card p-6 shadow-sm"
          >
            <div className="flex items-center gap-2 text-primary">
              {motiv.type === "quote" && <Sparkles className="h-4 w-4" />}
              {motiv.type === "tip" && <Lightbulb className="h-4 w-4" />}
              {motiv.type === "fact" && <Info className="h-4 w-4" />}
              {motiv.type === "motivation" && <Rocket className="h-4 w-4" />}
              <span className="text-xs font-semibold uppercase tracking-wider capitalize">
                Daily {motiv.type}
              </span>
            </div>
            <p className="mt-3 text-base font-medium leading-snug">"{motiv.text}"</p>
          </motion.div>

          {/* Recent journal */}
          {recentJournal && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="card-hover rounded-3xl border border-border bg-card p-6 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Recent journal</p>
                <Link to="/journal" className="text-xs font-medium text-primary hover:underline">Open</Link>
              </div>
              <div className="mt-3 flex items-start gap-3">
                <div className="text-2xl">{moodEmoji(recentJournal.mood)}</div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold">
                    {new Date(recentJournal.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </p>
                  <p className="mt-0.5 line-clamp-3 text-xs text-muted-foreground">
                    {recentJournal.content?.trim() || recentJournal.learned || recentJournal.wentWell || "Reflection saved."}
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Upcoming deadlines */}
          {upcoming.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="card-hover rounded-3xl border border-border bg-card p-6 shadow-sm"
            >
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Upcoming deadlines</p>
              <div className="mt-3 space-y-2">
                {upcoming.map((u, i) => {
                  const days = Math.ceil((new Date(u.date + "T23:59").getTime() - Date.now()) / 86400000);
                  return (
                    <Link
                      key={i}
                      to={u.to}
                      className="flex items-center gap-3 rounded-xl bg-muted/40 px-3 py-2 text-sm transition-colors hover:bg-muted"
                    >
                      {u.kind === "task" ? <CalendarIcon className="h-4 w-4 text-primary" /> : <Target className="h-4 w-4 text-primary" />}
                      <span className="flex-1 truncate">{u.title}</span>
                      <span className={`text-xs font-semibold ${days <= 2 ? "text-destructive" : "text-muted-foreground"}`}>
                        {days === 0 ? "Today" : days === 1 ? "Tomorrow" : `${days}d`}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

function moodEmoji(m: string) {
  return { great: "😁", happy: "😄", good: "🙂", okay: "😐", down: "😔", tired: "😴", angry: "😡" }[m] ?? "🙂";
}

function RunningTimerCard() {
  const activeTimer = useAppState((s) => s.activeTimer)!;
  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick((v) => v + 1), 500);
    return () => clearInterval(id);
  }, []);
  const elapsedMs = timerElapsedMs(activeTimer);
  const isCountdown = activeTimer.targetSeconds > 0;
  const remainingSec = isCountdown ? Math.max(0, activeTimer.targetSeconds - Math.floor(elapsedMs / 1000)) : Math.floor(elapsedMs / 1000);
  const mm = String(Math.floor(remainingSec / 60)).padStart(2, "0");
  const ss = String(remainingSec % 60).padStart(2, "0");
  const label =
    activeTimer.kind === "study"
      ? "Study session"
      : activeTimer.kind === "pomodoro-focus"
        ? "Pomodoro — focus"
        : activeTimer.kind === "pomodoro-short"
          ? "Pomodoro — short break"
          : "Pomodoro — long break";
  const to = activeTimer.kind === "study" ? "/study" : "/pomodoro";
  return (
    <Link to={to} className="mt-4 block">
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between gap-4 rounded-2xl border border-primary/30 bg-primary/5 p-4"
      >
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary text-primary-foreground">
            {activeTimer.pausedAt ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">{label}</p>
            <p className="font-mono text-xl font-bold tabular-nums">{mm}:{ss}</p>
          </div>
        </div>
        <span className="text-xs text-primary hover:underline">Open →</span>
      </motion.div>
    </Link>
  );
}

function ProductivityCard({ score }: { score: ReturnType<typeof productivityScore> }) {
  const bandColor =
    score.band === "Excellent"
      ? "text-success"
      : score.band === "Good"
        ? "text-primary"
        : score.band === "Average"
          ? "text-amber-600 dark:text-amber-300"
          : "text-destructive";
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="card-hover rounded-3xl border border-border bg-card p-6 shadow-sm"
    >
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Productivity score</p>
      <div className="mt-2 flex items-end gap-4">
        <div className="relative h-24 w-24 shrink-0">
          <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
            <circle cx="50" cy="50" r="42" strokeWidth="9" fill="none" className="stroke-muted" />
            <motion.circle
              cx="50"
              cy="50"
              r="42"
              strokeWidth="9"
              fill="none"
              strokeLinecap="round"
              className="stroke-primary"
              initial={{ strokeDasharray: `0 ${2 * Math.PI * 42}` }}
              animate={{ strokeDasharray: `${(score.total / 100) * 2 * Math.PI * 42} ${2 * Math.PI * 42}` }}
              transition={{ duration: 0.8 }}
            />
          </svg>
          <div className="absolute inset-0 grid place-items-center">
            <span className="text-2xl font-bold">{score.total}</span>
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <p className={`text-lg font-bold ${bandColor}`}>{score.band}</p>
          {score.suggestions.length > 0 ? (
            <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
              {score.suggestions.map((s, i) => (
                <li key={i} className="line-clamp-1">• {s}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-xs text-muted-foreground">Full marks today. 🔥</p>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function CircularProgress({ value }: { value: number }) {
  const r = 46;
  const c = 2 * Math.PI * r;
  const dash = (value / 100) * c;
  return (
    <div className="relative h-32 w-32 shrink-0">
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        <circle cx="60" cy="60" r={r} strokeWidth="10" fill="none" className="stroke-white/20" />
        <motion.circle
          cx="60"
          cy="60"
          r={r}
          strokeWidth="10"
          fill="none"
          strokeLinecap="round"
          className="stroke-white"
          initial={{ strokeDasharray: `0 ${c}` }}
          animate={{ strokeDasharray: `${dash} ${c}` }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <div className="text-center">
          <p className="text-3xl font-bold leading-none">{value}%</p>
          <p className="text-[10px] uppercase tracking-widest opacity-80">complete</p>
        </div>
      </div>
    </div>
  );
}

function MiniRing({ value }: { value: number }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  const dash = (value / 100) * c;
  return (
    <div className="relative h-16 w-16 shrink-0">
      <svg viewBox="0 0 64 64" className="h-full w-full -rotate-90">
        <circle cx="32" cy="32" r={r} strokeWidth="7" fill="none" className="stroke-muted" />
        <motion.circle
          cx="32"
          cy="32"
          r={r}
          strokeWidth="7"
          fill="none"
          strokeLinecap="round"
          className="stroke-success"
          initial={{ strokeDasharray: `0 ${c}` }}
          animate={{ strokeDasharray: `${dash} ${c}` }}
          transition={{ duration: 0.6 }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-xs font-bold">
        {value}%
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  suffix,
  tone = "default",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  suffix?: string;
  tone?: "default" | "success" | "warning";
}) {
  const toneClass =
    tone === "success"
      ? "bg-success/15 text-success"
      : tone === "warning"
        ? "bg-warning/25 text-warning-foreground"
        : "bg-primary-soft text-primary";
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="card-hover rounded-2xl border border-border bg-card p-5 shadow-sm"
    >
      <div className={`grid h-10 w-10 place-items-center rounded-xl ${toneClass}`}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="mt-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 flex items-baseline gap-1">
        <span className="text-2xl font-bold">{value}</span>
        {suffix && <span className="text-sm text-muted-foreground">{suffix}</span>}
      </p>
    </motion.div>
  );
}

function QuickAction({
  icon: Icon,
  label,
  onClick,
  to,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick?: () => void;
  to?: string;
}) {
  const inner = (
    <motion.div
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.97 }}
      className="card-hover flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm"
    >
      <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary-soft text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <span className="text-sm font-semibold">{label}</span>
    </motion.div>
  );
  if (to) return <Link to={to}>{inner}</Link>;
  return (
    <button onClick={onClick} className="text-left">
      {inner}
    </button>
  );
}

function TaskRow({ title, done }: { title: string; done: boolean }) {
  return (
    <div className="flex w-full items-center gap-3 rounded-xl border border-transparent bg-muted/40 px-3 py-2.5">
      {done ? (
        <CheckCircle2 className="h-5 w-5 shrink-0 text-success" />
      ) : (
        <Circle className="h-5 w-5 shrink-0 text-muted-foreground" />
      )}
      <span className={`text-sm ${done ? "text-muted-foreground line-through" : "font-medium"}`}>
        {title}
      </span>
    </div>
  );
}

// touch imports so tree-shakers keep them
void Repeat;

function AiInsightsCard() {
  const state = useAppState((s) => s);
  const insights = useMemo(() => generateInsights(state).slice(0, 4), [state]);
  const toneClass = (k: string) =>
    k === "positive"
      ? "bg-success/10 text-success"
      : k === "warning"
        ? "bg-warning/25 text-warning-foreground"
        : k === "suggest"
          ? "bg-primary/10 text-primary"
          : k === "motivate"
            ? "bg-gradient-to-br from-primary/10 to-warning/10 text-primary"
            : "bg-muted text-muted-foreground";
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="card-hover rounded-3xl border border-border bg-card p-6 shadow-sm"
    >
      <div className="flex items-center gap-2">
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary-soft text-primary">
          <Sparkles className="h-4 w-4" />
        </div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          AI Productivity Assistant
        </p>
      </div>
      <div className="mt-3 space-y-2">
        {insights.map((ins, i) => (
          <div key={i} className={`rounded-xl px-3 py-2.5 text-xs ${toneClass(ins.kind)}`}>
            <p className="font-semibold">{ins.title}</p>
            <p className="mt-0.5 opacity-90">{ins.body}</p>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function SupabaseStatRow({
  currentStreak,
  longestStreak,
  studyToday,
  totalStudy,
  tasksDoneToday,
  tasksTotalToday,
}: {
  currentStreak: number;
  longestStreak: number;
  studyToday: string;
  totalStudy: string;
  tasksDoneToday: number;
  tasksTotalToday: number;
}) {
  const { user } = useCurrentUser();
  const userId = user?.id;

  useDashboardRealtime(userId);

  useEffect(() => {
    if (!userId) return;
    ensureTodayStatsRow(userId).catch((e) => console.error("ensureTodayStatsRow", e));
  }, [userId]);

  const todayQ = useQuery(todayStatsQueryOptions(userId));
  const focusCountQ = useQuery(focusSessionsCountQueryOptions(userId));

  if (!userId) return null;

  const today = todayQ.data;
  const focusCount = focusCountQ.data ?? 0;

  return (
    <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <StatCard icon={Flame} label="Current streak" value={`${currentStreak}`} suffix="days" tone="warning" />
      <StatCard icon={Trophy} label="Longest streak" value={`${longestStreak}`} suffix="days" />
      <StatCard icon={Clock} label="Study today" value={studyToday} suffix="hrs" tone="success" />
      <StatCard icon={TrendingUp} label="Total study" value={totalStudy} suffix="hrs" />
      <StatCard icon={Coins} label="XP" value={`${today?.xp ?? 0}`} />
      <StatCard icon={AlertCircle} label="Today's distractions" value={`${today?.today_distractions ?? 0}`} tone="warning" />
      <StatCard icon={Zap} label="Pomodoros today" value={`${today?.completed_pomodoros ?? 0}`} tone="success" />
      <StatCard
        icon={CheckCircle2}
        label="Tasks done today"
        value={`${tasksDoneToday}`}
        suffix={`/ ${tasksTotalToday}`}
        tone="success"
      />
      <StatCard icon={Brain} label="Focus sessions" value={`${focusCount}`} />
    </div>
  );
}

