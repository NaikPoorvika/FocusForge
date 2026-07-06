import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
  Line,
  LineChart,
} from "recharts";
import {
  Clock,
  ListTodo,
  Percent,
  Flame,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  Timer,
  Zap,
  Repeat,
  Target as TargetIcon,
  Sparkles,
  TrendingUp,
  CalendarRange,
} from "lucide-react";
import { PageHeader } from "@/components/ui-bits";
import {
  computeStreaks,
  todayISO,
  useAppState,
  XP_BY_PRIORITY,
} from "@/lib/store";
import { HABIT_XP } from "@/lib/habits-sync";
import { productivityScore } from "@/lib/productivity";

export const Route = createFileRoute("/analytics")({
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const state = useAppState((s) => s);
  const tasks = state.tasks;
  const habits = state.habits;
  const goals = state.goals;
  const sessions = state.sessions;
  const distractions = state.distractions;
  const focusSessions = state.focusSessions;
  const pomodoros = state.pomodoros;

  const today = todayISO();
  const distractionsToday = distractions.filter((d) => d.date === today).length;
  const successful = focusSessions.filter((f) => f.outcome === "completed");
  const failed = focusSessions.filter((f) => f.outcome === "failed");
  const longestSec = successful.reduce((m, f) => Math.max(m, f.actualSeconds), 0);
  const longestLabel = longestSec
    ? longestSec >= 3600
      ? `${Math.floor(longestSec / 3600)}h ${Math.floor((longestSec % 3600) / 60)}m`
      : `${Math.floor(longestSec / 60)}m ${longestSec % 60}s`
    : "—";

  const days = useMemo(() => {
    const out: {
      date: string;
      label: string;
      minutes: number;
      completed: number;
      total: number;
      pomos: number;
      xp: number;
      score: number;
      habitPct: number;
    }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const iso = d.toISOString().slice(0, 10);
      const dayTasks = tasks.filter((t) => t.date === iso);
      const doneTasks = dayTasks.filter((t) => t.completed);
      const dayMinutes = sessions.filter((s) => s.date === iso).reduce((n, s) => n + s.minutes, 0);
      const dayPomos = pomodoros.filter((p) => p.date === iso && p.mode === "focus").length;
      const habitsDone = habits.filter((h) => h.history?.[iso]).length;
      const habitPct = habits.length ? habitsDone / habits.length : 0;

      const taskXp = doneTasks.reduce(
        (n, t) => n + (XP_BY_PRIORITY[t.priority] ?? 0),
        0,
      );
      const habitXp = habitsDone * HABIT_XP;
      const goalXp = goals.reduce((n, g) => {
        if (!g.completedAt) return n;
        if (g.completedAt.slice(0, 10) !== iso) return n;
        return n + (g.xpReward ?? 100);
      }, 0);
      const pomoXp = dayPomos * 10;
      const dayXp = taskXp + habitXp + goalXp + pomoXp;

      const score = productivityScore(state, iso).total;

      out.push({
        date: iso,
        label: d.toLocaleDateString(undefined, { weekday: "short" }).slice(0, 2),
        minutes: dayMinutes,
        completed: doneTasks.length,
        total: dayTasks.length,
        pomos: dayPomos,
        xp: dayXp,
        score,
        habitPct: Math.round(habitPct * 100),
      });
    }
    return out;
  }, [tasks, habits, goals, sessions, pomodoros, state]);

  const dailyMinutes = days[days.length - 1]?.minutes ?? 0;
  const weeklyMinutes = days.slice(-7).reduce((n, d) => n + d.minutes, 0);
  const monthlyMinutes = days.reduce((n, d) => n + d.minutes, 0); // 14d proxy
  const totalMinutes = sessions.reduce((n, s) => n + s.minutes, 0);
  const completedTasks = tasks.filter((t) => t.completed).length;
  const completionRate = tasks.length ? Math.round((completedTasks / tasks.length) * 100) : 0;
  const totalPomodoros = pomodoros.filter((p) => p.mode === "focus").length;
  const { current, longest } = computeStreaks(tasks);

  // Habit completion %: over last 14 days across all habits
  const habitPct = useMemo(() => {
    if (!habits.length) return 0;
    let done = 0;
    let total = 0;
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const iso = d.toISOString().slice(0, 10);
      for (const h of habits) {
        total += 1;
        if (h.history?.[iso]) done += 1;
      }
    }
    return total ? Math.round((done / total) * 100) : 0;
  }, [habits]);

  const goalPct = goals.length
    ? Math.round((goals.filter((g) => g.completed || g.completedAt).length / goals.length) * 100)
    : 0;

  return (
    <div>
      <PageHeader title="Analytics" subtitle="Insights from your challenge so far." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={Clock} label="Today's study" value={`${(dailyMinutes / 60).toFixed(1)}h`} />
        <Stat icon={CalendarRange} label="This week" value={`${(weeklyMinutes / 60).toFixed(1)}h`} />
        <Stat icon={CalendarRange} label="Last 14 days" value={`${(monthlyMinutes / 60).toFixed(1)}h`} />
        <Stat icon={Clock} label="All-time study" value={`${(totalMinutes / 60).toFixed(1)}h`} />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={Zap} label="Total pomodoros" value={`${totalPomodoros}`} />
        <Stat icon={ListTodo} label="Tasks done" value={`${completedTasks}`} />
        <Stat icon={Percent} label="Task completion" value={`${completionRate}%`} />
        <Stat icon={Flame} label="Streak (cur / best)" value={`${current} / ${longest}`} />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={Repeat} label="Habit completion" value={`${habitPct}%`} />
        <Stat icon={TargetIcon} label="Goal completion" value={`${goalPct}%`} />
        <Stat icon={Sparkles} label="Lifetime XP" value={(state.xp ?? 0).toLocaleString()} />
        <Stat icon={TrendingUp} label="Productivity today" value={`${productivityScore(state).total}`} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <ChartCard title="Study minutes — last 14 days">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={days}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
              <YAxis tickLine={false} axisLine={false} fontSize={12} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="minutes" fill="var(--color-primary)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Pomodoros — last 14 days">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={days}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
              <YAxis tickLine={false} axisLine={false} fontSize={12} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="pomos" fill="var(--color-accent)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Tasks completed">
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={days}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
              <YAxis tickLine={false} axisLine={false} fontSize={12} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Line
                type="monotone"
                dataKey="completed"
                stroke="var(--color-success)"
                strokeWidth={3}
                dot={{ fill: "var(--color-success)", r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="XP earned — last 14 days">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={days}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
              <YAxis tickLine={false} axisLine={false} fontSize={12} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="xp" fill="var(--color-warning)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Productivity score trend">
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={days}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
              <YAxis tickLine={false} axisLine={false} fontSize={12} domain={[0, 100]} />
              <Tooltip contentStyle={tooltipStyle} />
              <Line
                type="monotone"
                dataKey="score"
                stroke="var(--color-primary)"
                strokeWidth={3}
                dot={{ fill: "var(--color-primary)", r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Habit completion %">
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={days}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
              <YAxis tickLine={false} axisLine={false} fontSize={12} domain={[0, 100]} />
              <Tooltip contentStyle={tooltipStyle} />
              <Line
                type="monotone"
                dataKey="habitPct"
                stroke="var(--color-accent)"
                strokeWidth={3}
                dot={{ fill: "var(--color-accent)", r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="mt-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Focus discipline
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat icon={ShieldAlert} label="Distractions today" value={`${distractionsToday}`} />
          <Stat icon={ShieldCheck} label="Successful sessions" value={`${successful.length}`} />
          <Stat icon={ShieldX} label="Failed sessions" value={`${failed.length}`} />
          <Stat icon={Timer} label="Longest uninterrupted" value={longestLabel} />
        </div>
      </div>
    </div>
  );
}

const tooltipStyle = {
  background: "var(--color-card)",
  border: "1px solid var(--color-border)",
  borderRadius: 12,
} as const;

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="card-hover rounded-2xl border border-border bg-card p-5 shadow-sm"
    >
      <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary-soft text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <p className="mt-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </motion.div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
      <h3 className="mb-4 text-sm font-semibold">{title}</h3>
      {children}
    </div>
  );
}
