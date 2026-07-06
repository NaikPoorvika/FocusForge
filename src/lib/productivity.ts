import type { AppState } from "./store";
import { todayISO } from "./store";

export interface ScoreBreakdown {
  tasks: number; // 0-30
  habits: number; // 0-20
  study: number; // 0-25
  pomodoro: number; // 0-15
  journal: number; // 0-10
  goals: number; // 0-10 bonus
}

export interface ProductivityScore {
  total: number;
  band: "Excellent" | "Good" | "Average" | "Needs Improvement";
  breakdown: ScoreBreakdown;
  suggestions: string[];
}

export function productivityScore(state: AppState, date = todayISO()): ProductivityScore {
  // Tasks
  const dayTasks = state.tasks.filter((t) => t.date === date && !t.archived);
  const doneTasks = dayTasks.filter((t) => t.completed).length;
  const tasksPct = dayTasks.length ? doneTasks / dayTasks.length : 0;
  const tasks = Math.round(30 * tasksPct);

  // Habits
  const habitsCompleted = state.habits.filter((h) => h.history[date]).length;
  const habitsTotal = state.habits.length;
  const habitsPct = habitsTotal ? habitsCompleted / habitsTotal : 0;
  const habits = Math.round(20 * habitsPct);

  // Study
  const minutesToday = state.sessions
    .filter((s) => s.date === date)
    .reduce((n, s) => n + s.minutes, 0);
  const goalMin = Math.max(1, (state.settings?.dailyStudyGoal ?? 4) * 60);
  const studyPct = Math.min(1, minutesToday / goalMin);
  const study = Math.round(25 * studyPct);

  // Pomodoro
  const pomos = state.pomodoros.filter((p) => p.date === date && p.mode === "focus").length;
  const pomoPct = Math.min(1, pomos / 4);
  const pomodoro = Math.round(15 * pomoPct);

  // Journal
  const entry = state.journal.find((j) => j.date === date);
  const hasContent = !!entry && [
    entry.content,
    entry.learned,
    entry.problems,
    entry.wentWell,
    entry.improve,
    entry.tomorrowPlan,
  ].some((v) => v && v.trim().length > 3);
  const journal = hasContent ? 10 : 0;

  // Goals (bonus): completed today up to 2 goals = 10
  const goalsCompletedToday = state.goals.filter(
    (g) => (g.completed || !!g.completedAt) && (g.completedAt ?? "").slice(0, 10) === date,
  ).length;
  const goalsPct = Math.min(1, goalsCompletedToday / 2);
  const goals = Math.round(10 * goalsPct);

  const rawTotal = tasks + habits + study + pomodoro + journal + goals;
  const total = Math.min(100, rawTotal);
  const band: ProductivityScore["band"] =
    total >= 85 ? "Excellent" : total >= 65 ? "Good" : total >= 40 ? "Average" : "Needs Improvement";

  const factors = [
    { key: "tasks", value: tasks, max: 30, tip: "Complete more of today's tasks." },
    { key: "habits", value: habits, max: 20, tip: "Check off today's habits." },
    { key: "study", value: study, max: 25, tip: "Log some study minutes to hit your daily goal." },
    { key: "pomodoro", value: pomodoro, max: 15, tip: "Run a focused pomodoro session." },
    { key: "journal", value: journal, max: 10, tip: "Write a short journal reflection." },
    { key: "goals", value: goals, max: 10, tip: "Complete a goal to boost today's score." },
  ];
  const suggestions = factors
    .filter((f) => f.value < f.max)
    .sort((a, b) => a.value / a.max - b.value / b.max)
    .slice(0, 2)
    .map((f) => f.tip);

  return {
    total,
    band,
    breakdown: { tasks, habits, study, pomodoro, journal, goals },
    suggestions,
  };
}
