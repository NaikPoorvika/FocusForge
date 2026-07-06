import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  CheckCircle2,
  Target,
  Repeat,
  
  Clock,
} from "lucide-react";
import { PageHeader } from "@/components/ui-bits";
import { Badge } from "@/components/ui/badge";
import { useAppState } from "@/lib/store";

export const Route = createFileRoute("/calendar")({
  component: CalendarPage,
});

const MOOD_EMOJI: Record<string, string> = {
  great: "😁",
  happy: "😄",
  good: "🙂",
  okay: "😐",
  down: "😔",
  tired: "😴",
  angry: "😡",
};

function CalendarPage() {
  const tasks = useAppState((s) => s.tasks);
  const sessions = useAppState((s) => s.sessions);
  const journal = useAppState((s) => s.journal);
  const habits = useAppState((s) => s.habits);
  const goals = useAppState((s) => s.goals);

  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return { y: d.getFullYear(), m: d.getMonth() };
  });
  const [selected, setSelected] = useState<string>(new Date().toISOString().slice(0, 10));

  const firstDay = new Date(cursor.y, cursor.m, 1);
  const startWeekday = firstDay.getDay();
  const daysInMonth = new Date(cursor.y, cursor.m + 1, 0).getDate();
  const monthLabel = firstDay.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  const cells: (string | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const iso = `${cursor.y}-${String(cursor.m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    cells.push(iso);
  }

  const move = (delta: number) => {
    const d = new Date(cursor.y, cursor.m + delta, 1);
    setCursor({ y: d.getFullYear(), m: d.getMonth() });
  };

  const summaryFor = useMemo(
    () => (iso: string) => {
      const dayTasks = tasks.filter((t) => t.date === iso && !t.archived);
      const daySessions = sessions.filter((s) => s.date === iso);
      const dayJournal = journal.filter((j) => j.date === iso);
      const dayHabits = habits.filter((h) => !!h.history[iso]);
      const dayGoals = goals.filter(
        (g) =>
          (g.completedAt ?? "").slice(0, 10) === iso ||
          (g.targetDate ?? g.deadline) === iso,
      );
      return {
        tasks: dayTasks,
        sessions: daySessions,
        journal: dayJournal,
        habits: dayHabits,
        goals: dayGoals,
      };
    },
    [tasks, sessions, journal, habits, goals],
  );

  const daySummary = summaryFor(selected);
  const today = new Date().toISOString().slice(0, 10);
  const studyMinutes = daySummary.sessions.reduce((n, s) => n + s.minutes, 0);
  const completedTasks = daySummary.tasks.filter((t) => t.completed);

  return (
    <div>
      <PageHeader title="Calendar" subtitle="See your challenge at a glance." />

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="rounded-3xl border border-border bg-card p-4 shadow-sm sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold">{monthLabel}</h3>
            <div className="flex items-center gap-1">
              <button
                onClick={() => move(-1)}
                className="grid h-9 w-9 place-items-center rounded-lg border border-border hover:bg-muted"
                aria-label="Previous month"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => move(1)}
                className="grid h-9 w-9 place-items-center rounded-lg border border-border hover:bg-muted"
                aria-label="Next month"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
              <div key={i} className="py-1.5">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((iso, i) => {
              if (!iso) return <div key={i} />;
              const s = summaryFor(iso);
              const hasTasks = s.tasks.length > 0;
              const hasHabits = s.habits.length > 0;
              const hasGoals = s.goals.length > 0;
              const hasJournal = s.journal.length > 0;
              const allDone = hasTasks && s.tasks.every((t) => t.completed);
              const isToday = iso === today;
              const isSelected = iso === selected;
              return (
                <motion.button
                  key={iso}
                  whileHover={{ y: -1 }}
                  onClick={() => setSelected(iso)}
                  className={`relative aspect-square rounded-xl border text-sm font-medium transition-colors ${
                    isSelected
                      ? "border-primary bg-primary text-primary-foreground"
                      : isToday
                        ? "border-primary/60 bg-primary-soft text-primary"
                        : "border-transparent bg-muted/40 hover:bg-muted"
                  }`}
                  aria-label={new Date(iso).toDateString()}
                >
                  <span>{Number(iso.slice(-2))}</span>
                  {!isSelected && (
                    <span className="pointer-events-none absolute bottom-1 left-1/2 flex -translate-x-1/2 items-center gap-0.5">
                      {hasTasks && (
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            allDone ? "bg-success" : "bg-primary"
                          }`}
                        />
                      )}
                      {hasHabits && <span className="h-1.5 w-1.5 rounded-full bg-accent" />}
                      {hasGoals && <span className="h-1.5 w-1.5 rounded-full bg-warning" />}
                      {hasJournal && <span className="h-1.5 w-1.5 rounded-full bg-secondary" />}
                    </span>
                  )}
                </motion.button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="mt-4 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
            <LegendDot color="bg-primary" label="Tasks" />
            <LegendDot color="bg-success" label="All done" />
            <LegendDot color="bg-accent" label="Habits" />
            <LegendDot color="bg-warning" label="Goals" />
            <LegendDot color="bg-secondary" label="Journal" />
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-2 text-primary">
            <CalendarDays className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">
              {new Date(selected).toLocaleDateString(undefined, {
                weekday: "long",
                month: "short",
                day: "numeric",
              })}
            </span>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <StatBlock
              icon={<CheckCircle2 className="h-4 w-4" />}
              label="Tasks done"
              value={`${completedTasks.length}/${daySummary.tasks.length}`}
            />
            <StatBlock
              icon={<Repeat className="h-4 w-4" />}
              label="Habits"
              value={`${daySummary.habits.length}`}
            />
            <StatBlock
              icon={<Target className="h-4 w-4" />}
              label="Goals"
              value={`${daySummary.goals.length}`}
            />
            <StatBlock
              icon={<Clock className="h-4 w-4" />}
              label="Study"
              value={`${studyMinutes} min`}
            />
          </div>

          {/* Completed tasks */}
          <Section label="Completed tasks" to="/tasks">
            {completedTasks.length === 0 ? (
              <Empty text="No completed tasks." />
            ) : (
              <ul className="space-y-1.5">
                {completedTasks.map((t) => (
                  <li key={t.id} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                    <span className="line-through text-muted-foreground">{t.title}</span>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          {/* Habits */}
          <Section label="Completed habits" to="/habits">
            {daySummary.habits.length === 0 ? (
              <Empty text="No habits logged." />
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {daySummary.habits.map((h) => (
                  <Badge key={h.id} variant="secondary" className="gap-1 font-normal">
                    <span>{h.emoji}</span>
                    {h.name}
                  </Badge>
                ))}
              </div>
            )}
          </Section>

          {/* Goals */}
          <Section label="Goals" to="/goals">
            {daySummary.goals.length === 0 ? (
              <Empty text="No goals for this day." />
            ) : (
              <ul className="space-y-1.5">
                {daySummary.goals.map((g) => {
                  const completedOn = (g.completedAt ?? "").slice(0, 10) === selected;
                  return (
                    <li key={g.id} className="flex items-start gap-2 text-sm">
                      <Target className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate">{g.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {completedOn ? "Completed" : "Target date"} · {g.progress}%
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Section>

          {/* Journal */}
          <Section label="Journal" to="/journal">
            {daySummary.journal.length === 0 ? (
              <Empty text="No journal entry." />
            ) : (
              <ul className="space-y-2">
                {daySummary.journal.map((j) => {
                  const emoji = MOOD_EMOJI[j.mood] ?? "🙂";
                  const preview = (j.title?.trim() || j.content || "(entry)").slice(0, 120);
                  return (
                    <li key={j.id} className="flex items-start gap-2">
                      <span className="text-xl leading-none">{emoji}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {j.title?.trim() || "Untitled entry"}
                        </p>
                        <p className="line-clamp-2 text-xs text-muted-foreground">
                          {preview}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Section>

          {/* Study */}
          {daySummary.sessions.length > 0 && (
            <Section label="Study sessions" to="/study">
              <ul className="space-y-1.5">
                {daySummary.sessions.map((s) => (
                  <li
                    key={s.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="truncate">
                      {s.subject || s.category || "Session"}
                    </span>
                    <span className="text-muted-foreground">{s.minutes} min</span>
                  </li>
                ))}
              </ul>
            </Section>
          )}
        </div>
      </div>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className={`h-1.5 w-1.5 rounded-full ${color}`} />
      {label}
    </span>
  );
}

function StatBlock({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-muted/40 px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className="mt-0.5 text-lg font-semibold">{value}</p>
    </div>
  );
}

function Section({
  label,
  to,
  children,
}: {
  label: string;
  to: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-5 border-t border-border pt-4">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <Link to={to} className="text-xs font-medium text-primary hover:underline">
          Open
        </Link>
      </div>
      {children}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="text-sm text-muted-foreground">{text}</p>;
}
