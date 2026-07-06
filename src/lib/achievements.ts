// Achievement catalog + evaluator. Pure — no side effects.
import type { AppState } from "./store";
import {
  Award,
  Flame,
  Trophy,
  Repeat,
  Timer,
  Clock,
  BookHeart,
  Target,
  Sunrise,
  Moon,
  Sparkles,
  Rocket,
  Medal,
  Star,
  type LucideIcon,
} from "lucide-react";
import { computeHabitStreaks, computeStreaks, computeStudyStats } from "./store";

export type AchievementTier = "bronze" | "silver" | "gold" | "platinum";

export interface Achievement {
  id: string;
  title: string;
  description: string;
  tier: AchievementTier;
  icon: LucideIcon;
  xpReward: number;
  /** Returns [unlocked, progress 0..1] */
  evaluate: (state: AppState) => { unlocked: boolean; progress: number; label?: string };
}

const tierBase: Record<AchievementTier, number> = {
  bronze: 25,
  silver: 50,
  gold: 100,
  platinum: 200,
};

function pct(current: number, goal: number) {
  return Math.max(0, Math.min(1, current / Math.max(1, goal)));
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: "first-task",
    title: "First Step",
    description: "Complete your very first task.",
    tier: "bronze",
    icon: Sparkles,
    xpReward: tierBase.bronze,
    evaluate: (s) => {
      const done = s.tasks.filter((t) => t.completed).length;
      return { unlocked: done >= 1, progress: pct(done, 1), label: `${done}/1` };
    },
  },
  {
    id: "tasks-10",
    title: "Getting Things Done",
    description: "Complete 10 tasks.",
    tier: "bronze",
    icon: Award,
    xpReward: tierBase.bronze,
    evaluate: (s) => {
      const done = s.tasks.filter((t) => t.completed).length;
      return { unlocked: done >= 10, progress: pct(done, 10), label: `${done}/10` };
    },
  },
  {
    id: "tasks-50",
    title: "Task Machine",
    description: "Complete 50 tasks.",
    tier: "silver",
    icon: Medal,
    xpReward: tierBase.silver,
    evaluate: (s) => {
      const done = s.tasks.filter((t) => t.completed).length;
      return { unlocked: done >= 50, progress: pct(done, 50), label: `${done}/50` };
    },
  },
  {
    id: "tasks-250",
    title: "Unstoppable",
    description: "Complete 250 tasks.",
    tier: "gold",
    icon: Trophy,
    xpReward: tierBase.gold,
    evaluate: (s) => {
      const done = s.tasks.filter((t) => t.completed).length;
      return { unlocked: done >= 250, progress: pct(done, 250), label: `${done}/250` };
    },
  },
  {
    id: "streak-3",
    title: "On a Roll",
    description: "Hit a 3-day task streak.",
    tier: "bronze",
    icon: Flame,
    xpReward: tierBase.bronze,
    evaluate: (s) => {
      const { longest } = computeStreaks(s.tasks);
      return { unlocked: longest >= 3, progress: pct(longest, 3), label: `${longest}/3` };
    },
  },
  {
    id: "streak-7",
    title: "Week Warrior",
    description: "Hit a 7-day task streak.",
    tier: "silver",
    icon: Flame,
    xpReward: tierBase.silver,
    evaluate: (s) => {
      const { longest } = computeStreaks(s.tasks);
      return { unlocked: longest >= 7, progress: pct(longest, 7), label: `${longest}/7` };
    },
  },
  {
    id: "streak-30",
    title: "Iron Streak",
    description: "Hit a 30-day task streak.",
    tier: "platinum",
    icon: Flame,
    xpReward: tierBase.platinum,
    evaluate: (s) => {
      const { longest } = computeStreaks(s.tasks);
      return { unlocked: longest >= 30, progress: pct(longest, 30), label: `${longest}/30` };
    },
  },
  {
    id: "habit-hero",
    title: "Habit Hero",
    description: "Reach a 7-day streak on any habit.",
    tier: "silver",
    icon: Repeat,
    xpReward: tierBase.silver,
    evaluate: (s) => {
      const best = s.habits.reduce((m, h) => Math.max(m, computeHabitStreaks(h).longest), 0);
      return { unlocked: best >= 7, progress: pct(best, 7), label: `${best}/7` };
    },
  },
  {
    id: "habit-legend",
    title: "Habit Legend",
    description: "Reach a 30-day streak on any habit.",
    tier: "gold",
    icon: Repeat,
    xpReward: tierBase.gold,
    evaluate: (s) => {
      const best = s.habits.reduce((m, h) => Math.max(m, computeHabitStreaks(h).longest), 0);
      return { unlocked: best >= 30, progress: pct(best, 30), label: `${best}/30` };
    },
  },
  {
    id: "focus-5",
    title: "Focused",
    description: "Complete 5 pomodoro focus sessions.",
    tier: "bronze",
    icon: Timer,
    xpReward: tierBase.bronze,
    evaluate: (s) => {
      const n = s.pomodoros.filter((p) => p.mode === "focus").length;
      return { unlocked: n >= 5, progress: pct(n, 5), label: `${n}/5` };
    },
  },
  {
    id: "focus-25",
    title: "Deep Focus",
    description: "Complete 25 pomodoro focus sessions.",
    tier: "silver",
    icon: Timer,
    xpReward: tierBase.silver,
    evaluate: (s) => {
      const n = s.pomodoros.filter((p) => p.mode === "focus").length;
      return { unlocked: n >= 25, progress: pct(n, 25), label: `${n}/25` };
    },
  },
  {
    id: "focus-100",
    title: "Zen Master",
    description: "Complete 100 pomodoro focus sessions.",
    tier: "platinum",
    icon: Timer,
    xpReward: tierBase.platinum,
    evaluate: (s) => {
      const n = s.pomodoros.filter((p) => p.mode === "focus").length;
      return { unlocked: n >= 100, progress: pct(n, 100), label: `${n}/100` };
    },
  },
  {
    id: "study-10h",
    title: "Scholar",
    description: "Log 10 hours of study.",
    tier: "bronze",
    icon: Clock,
    xpReward: tierBase.bronze,
    evaluate: (s) => {
      const h = computeStudyStats(s.sessions).total / 60;
      return { unlocked: h >= 10, progress: pct(h, 10), label: `${h.toFixed(1)}/10h` };
    },
  },
  {
    id: "study-50h",
    title: "Devoted",
    description: "Log 50 hours of study.",
    tier: "silver",
    icon: Clock,
    xpReward: tierBase.silver,
    evaluate: (s) => {
      const h = computeStudyStats(s.sessions).total / 60;
      return { unlocked: h >= 50, progress: pct(h, 50), label: `${h.toFixed(1)}/50h` };
    },
  },
  {
    id: "study-200h",
    title: "Marathoner",
    description: "Log 200 hours of study.",
    tier: "gold",
    icon: Clock,
    xpReward: tierBase.gold,
    evaluate: (s) => {
      const h = computeStudyStats(s.sessions).total / 60;
      return { unlocked: h >= 200, progress: pct(h, 200), label: `${h.toFixed(1)}/200h` };
    },
  },
  {
    id: "journal-7",
    title: "Journalist",
    description: "Write 7 journal entries.",
    tier: "bronze",
    icon: BookHeart,
    xpReward: tierBase.bronze,
    evaluate: (s) => {
      const n = s.journal.length;
      return { unlocked: n >= 7, progress: pct(n, 7), label: `${n}/7` };
    },
  },
  {
    id: "journal-30",
    title: "Reflective Mind",
    description: "Write 30 journal entries.",
    tier: "gold",
    icon: BookHeart,
    xpReward: tierBase.gold,
    evaluate: (s) => {
      const n = s.journal.length;
      return { unlocked: n >= 30, progress: pct(n, 30), label: `${n}/30` };
    },
  },
  {
    id: "goal-first",
    title: "Goal Getter",
    description: "Complete your first monthly goal.",
    tier: "silver",
    icon: Target,
    xpReward: tierBase.silver,
    evaluate: (s) => {
      const n = s.goals.filter((g) => g.completedAt).length;
      return { unlocked: n >= 1, progress: pct(n, 1), label: `${n}/1` };
    },
  },
  {
    id: "goal-5",
    title: "Overachiever",
    description: "Complete 5 monthly goals.",
    tier: "gold",
    icon: Target,
    xpReward: tierBase.gold,
    evaluate: (s) => {
      const n = s.goals.filter((g) => g.completedAt).length;
      return { unlocked: n >= 5, progress: pct(n, 5), label: `${n}/5` };
    },
  },
  {
    id: "early-bird",
    title: "Early Bird",
    description: "Complete a task before 8am.",
    tier: "bronze",
    icon: Sunrise,
    xpReward: tierBase.bronze,
    evaluate: (s) => {
      const hit = s.tasks.some((t) => {
        if (!t.completedAt) return false;
        return new Date(t.completedAt).getHours() < 8;
      });
      return { unlocked: hit, progress: hit ? 1 : 0 };
    },
  },
  {
    id: "night-owl",
    title: "Night Owl",
    description: "Complete a task after 10pm.",
    tier: "bronze",
    icon: Moon,
    xpReward: tierBase.bronze,
    evaluate: (s) => {
      const hit = s.tasks.some((t) => {
        if (!t.completedAt) return false;
        return new Date(t.completedAt).getHours() >= 22;
      });
      return { unlocked: hit, progress: hit ? 1 : 0 };
    },
  },
  {
    id: "xp-500",
    title: "XP Collector",
    description: "Earn 500 lifetime XP.",
    tier: "silver",
    icon: Star,
    xpReward: tierBase.silver,
    evaluate: (s) => ({ unlocked: (s.xp ?? 0) >= 500, progress: pct(s.xp ?? 0, 500), label: `${s.xp ?? 0}/500` }),
  },
  {
    id: "xp-2000",
    title: "XP Legend",
    description: "Earn 2000 lifetime XP.",
    tier: "platinum",
    icon: Rocket,
    xpReward: tierBase.platinum,
    evaluate: (s) => ({ unlocked: (s.xp ?? 0) >= 2000, progress: pct(s.xp ?? 0, 2000), label: `${s.xp ?? 0}/2000` }),
  },
];

export const TIER_STYLES: Record<AchievementTier, { chip: string; ring: string; glow: string; label: string }> = {
  bronze: {
    chip: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
    ring: "ring-amber-500/40",
    glow: "shadow-amber-500/20",
    label: "Bronze",
  },
  silver: {
    chip: "bg-slate-400/20 text-slate-700 dark:text-slate-200",
    ring: "ring-slate-400/50",
    glow: "shadow-slate-400/20",
    label: "Silver",
  },
  gold: {
    chip: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-300",
    ring: "ring-yellow-500/50",
    glow: "shadow-yellow-500/25",
    label: "Gold",
  },
  platinum: {
    chip: "bg-primary/15 text-primary",
    ring: "ring-primary/50",
    glow: "shadow-primary/30",
    label: "Platinum",
  },
};

export function levelFromXp(xp: number) {
  const level = Math.floor(Math.sqrt(Math.max(0, xp) / 50));
  const nextXp = (level + 1) ** 2 * 50;
  const prevXp = level ** 2 * 50;
  const progress = Math.max(0, Math.min(1, (xp - prevXp) / Math.max(1, nextXp - prevXp)));
  return { level, nextXp, prevXp, progress };
}
