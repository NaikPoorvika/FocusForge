// Rule-based "AI" productivity insights. Pure functions over app state.
import type { AppState } from "./store";
import { computeHabitStreaks, computeStreaks, computeStudyStats, todayISO } from "./store";

export interface Insight {
  kind: "positive" | "warning" | "info" | "suggest" | "motivate";
  title: string;
  body: string;
}

function lastNDates(n: number): string[] {
  const out: string[] = [];
  const d = new Date();
  for (let i = 0; i < n; i++) {
    out.push(d.toISOString().slice(0, 10));
    d.setDate(d.getDate() - 1);
  }
  return out;
}

export function generateInsights(state: AppState): Insight[] {
  const insights: Insight[] = [];
  const today = todayISO();
  const last7 = lastNDates(7);

  // 1. Weak subjects (least-studied categories in last 7 days)
  const subjTotals = new Map<string, number>();
  for (const s of state.sessions) {
    if (last7.includes(s.date)) {
      const key = s.subject || s.category || "General";
      subjTotals.set(key, (subjTotals.get(key) ?? 0) + s.minutes);
    }
  }
  const subjs = [...subjTotals.entries()].sort((a, b) => a[1] - b[1]);
  if (subjs.length >= 2) {
    const [weak] = subjs;
    insights.push({
      kind: "warning",
      title: `Weak subject: ${weak[0]}`,
      body: `Only ${Math.round(weak[1])} min in the last 7 days. Schedule a focus block tomorrow.`,
    });
  }

  // 2. Missed habits
  const missed = state.habits
    .map((h) => {
      const done = last7.filter((d) => h.history[d]).length;
      return { h, done };
    })
    .filter((x) => x.done <= 2 && x.h.frequency === "daily");
  if (missed.length > 0) {
    insights.push({
      kind: "warning",
      title: "Habits slipping",
      body: `${missed.map((m) => m.h.name).slice(0, 3).join(", ")} — done fewer than 3 days this week. Restart small.`,
    });
  }

  // 3. Streak status
  const { current, longest } = computeStreaks(state.tasks);
  if (current > 0) {
    insights.push({
      kind: "positive",
      title: `${current}-day streak 🔥`,
      body: `Longest is ${longest}. Finish today's tasks to extend it.`,
    });
  } else if (state.tasks.some((t) => !t.completed && t.date === today)) {
    insights.push({
      kind: "motivate",
      title: "Restart your streak today",
      body: "Complete every task on today's list to light the streak back up.",
    });
  }

  // 4. Study summary
  const stats = computeStudyStats(state.sessions);
  const weekH = (stats.weekMin / 60).toFixed(1);
  insights.push({
    kind: "info",
    title: "Weekly study",
    body: `${weekH}h logged this week. Daily average ${(stats.avgDaily / 60).toFixed(1)}h.`,
  });

  // 5. Suggested plan for tomorrow
  const pending = state.tasks.filter((t) => !t.completed && !t.archived && t.date <= today).length;
  const top = subjs[subjs.length - 1]?.[0];
  insights.push({
    kind: "suggest",
    title: "Plan for tomorrow",
    body: [
      pending > 0 ? `Clear ${pending} carry-over task${pending === 1 ? "" : "s"}.` : "Start with 1 quick win to build momentum.",
      top ? `Add a 45-min block for ${top}.` : "Add a 45-min study block.",
      "Review yesterday's journal before starting.",
    ].join(" "),
  });

  // 6. Personalized motivation
  const best = state.habits.reduce((m, h) => Math.max(m, computeHabitStreaks(h).longest), 0);
  if (best >= 7) {
    insights.push({
      kind: "motivate",
      title: `Habit legend in the making`,
      body: `Your best habit streak is ${best} days. Discipline is compounding — don't break the chain.`,
    });
  }

  return insights;
}
