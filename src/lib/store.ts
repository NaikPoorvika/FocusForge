// Local storage backed data store with pub/sub for React.
import { useSyncExternalStore } from "react";

export interface UserSettings {
  studentName: string;
  challengeName: string;
  duration: number;
  dailyStudyGoal: number; // hours
  wakeTime: string;
  sleepTime: string;
  reminderTime: string;
  startDate: string;
  onboarded: boolean;
}

export type RecurrenceKind = "none" | "daily" | "weekdays" | "weekly" | "custom";

export interface Recurrence {
  kind: RecurrenceKind;
  weekdays?: number[];
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  notes?: string;
  date: string;
  category: string;
  priority: "low" | "medium" | "high";
  estimatedMinutes?: number;
  dueTime?: string;
  deadlineDate?: string;
  tags: string[];
  completed: boolean;
  completedAt?: string;
  archived: boolean;
  order: number;
  recurrence?: Recurrence;
  recurrenceParentId?: string;
  goalId?: string;
  createdAt: string;
}

export type MoodKey = "great" | "happy" | "good" | "okay" | "down" | "tired" | "angry";

export interface Goal {
  id: string;
  title: string;
  description?: string;
  target: number;
  progress: number;
  deadline?: string;
  dueDate?: string; // legacy
  targetDate?: string; // ISO date (Supabase-backed)
  category?: string;
  priority?: "low" | "medium" | "high";
  completed?: boolean;
  completedAt?: string;
  xpReward?: number;
  createdAt: string;
}

export interface Habit {
  id: string;
  name: string;
  emoji: string;
  icon?: string; // alias
  color: string; // token palette key
  category?: string;
  frequency: "daily" | "weekly" | "custom";
  weeklyTarget?: number;
  customDays?: number[]; // 0=Sun..6=Sat
  reminderTime?: string;
  notes?: string;
  createdAt: string;
  history: Record<string, boolean>;
  skips: Record<string, boolean>;
}

export interface JournalEntry {
  id: string;
  date: string;
  title?: string;
  tags?: string[];
  mood: MoodKey;
  content: string;
  learned?: string;
  problems?: string;
  wentWell?: string;
  improve?: string;
  tomorrowPlan?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface StudySession {
  id: string;
  date: string;
  minutes: number;
  subject?: string;
  category?: string;
  notes?: string;
  startedAt?: string;
  source: "manual" | "timer" | "pomodoro";
  createdAt: string;
}

export interface PomodoroLog {
  id: string;
  date: string;
  minutes: number;
  mode: "focus" | "short" | "long";
  completedAt: string;
  xp: number;
}

export interface PomodoroSettings {
  focus: number;
  short: number;
  long: number;
  autoStart: boolean;
  longEvery: number;
}

export interface ActiveTimer {
  kind: "study" | "pomodoro-focus" | "pomodoro-short" | "pomodoro-long";
  targetSeconds: number; // 0 = open-ended stopwatch
  startedAt: number; // Date.now() when started/resumed
  pausedAt?: number; // Date.now() when paused
  accumulatedMs: number; // total elapsed when paused
  subject?: string;
  category?: string;
  notes?: string;
  sessionCount?: number; // pomodoro focus completed count in this run
}

export interface Reward {
  id: string;
  title: string;
  description?: string;
  cost: number;
  icon: string;
  color: string;
  category?: string;
  createdAt: string;
  archived: boolean;
}

export interface Redemption {
  id: string;
  rewardId: string;
  title: string;
  icon?: string;
  cost: number;
  redeemedAt: string;
  claimedAt?: string;
  note?: string;
}

export interface AchievementUnlock {
  id: string;
  unlockedAt: string;
  seen: boolean;
}

export interface RewardsPreferences {
  showAchievementToasts: boolean;
}

export interface DistractionLog {
  id: string;
  date: string;
  at: string;
  awayMs: number;
}

export interface FocusSessionLog {
  id: string;
  date: string;
  startedAt: string;
  endedAt: string;
  targetSeconds: number;
  actualSeconds: number;
  outcome: "completed" | "failed";
}

export interface AppState {
  settings: UserSettings | null;
  tasks: Task[];
  goals: Goal[];
  habits: Habit[];
  journal: JournalEntry[];
  sessions: StudySession[];
  pomodoros: PomodoroLog[];
  pomodoroSettings: PomodoroSettings;
  activeTimer: ActiveTimer | null;
  theme: "light" | "dark";
  xp: number;
  xpSpent: number;
  customCategories: string[];
  rewards: Reward[];
  redemptions: Redemption[];
  achievements: AchievementUnlock[];
  rewardsPrefs: RewardsPreferences;
  distractions: DistractionLog[];
  focusSessions: FocusSessionLog[];
}

const STORAGE_KEY = "sst-app-state-v1";
const AUTH_USER_KEY = "sst-auth-user-id";

const defaultState: AppState = {
  settings: null,
  tasks: [],
  goals: [],
  habits: [],
  journal: [],
  sessions: [],
  pomodoros: [],
  pomodoroSettings: { focus: 25, short: 5, long: 15, autoStart: false, longEvery: 4 },
  activeTimer: null,
  theme: "light",
  xp: 0,
  xpSpent: 0,
  customCategories: [],
  rewards: [],
  redemptions: [],
  achievements: [],
  rewardsPrefs: { showAchievementToasts: true },
  distractions: [],
  focusSessions: [],
};

function hydrateTask(t: Partial<Task> & { id: string; title: string; date: string }): Task {
  return {
    id: t.id,
    title: t.title,
    description: t.description,
    notes: t.notes,
    date: t.date,
    category: t.category ?? "General",
    priority: (t.priority as Task["priority"]) ?? "medium",
    estimatedMinutes: t.estimatedMinutes,
    dueTime: t.dueTime,
    deadlineDate: t.deadlineDate,
    tags: Array.isArray(t.tags) ? t.tags : [],
    completed: !!t.completed,
    completedAt: t.completedAt,
    archived: !!t.archived,
    order: typeof t.order === "number" ? t.order : 0,
    recurrence: t.recurrence,
    recurrenceParentId: t.recurrenceParentId,
    goalId: t.goalId,
    createdAt: t.createdAt ?? new Date().toISOString(),
  };
}

function hydrateHabit(h: Partial<Habit> & { id: string; name: string; createdAt?: string }): Habit {
  return {
    id: h.id,
    name: h.name,
    emoji: h.emoji ?? h.icon ?? "🎯",
    icon: h.icon,
    color: h.color ?? "primary",
    category: h.category,
    frequency: h.frequency ?? "daily",
    weeklyTarget: h.weeklyTarget,
    customDays: h.customDays,
    reminderTime: h.reminderTime,
    notes: h.notes,
    createdAt: h.createdAt ?? new Date().toISOString(),
    history: h.history ?? {},
    skips: h.skips ?? {},
  };
}

function hydrateSession(s: Partial<StudySession> & { id: string; date: string; minutes: number }): StudySession {
  return {
    id: s.id,
    date: s.date,
    minutes: s.minutes,
    subject: s.subject,
    category: s.category,
    notes: s.notes,
    startedAt: s.startedAt,
    source: s.source ?? "manual",
    createdAt: s.createdAt ?? new Date().toISOString(),
  };
}

function hydrateGoal(g: Partial<Goal> & { id: string; title: string; target: number; progress: number; createdAt?: string }): Goal {
  return {
    id: g.id,
    title: g.title,
    description: g.description,
    target: g.target,
    progress: g.progress,
    deadline: g.deadline ?? g.dueDate,
    targetDate: g.targetDate ?? g.deadline ?? g.dueDate,
    category: g.category,
    priority: g.priority,
    completed: g.completed ?? (typeof g.completedAt === "string" ? true : false),
    completedAt: g.completedAt,
    xpReward: g.xpReward,
    createdAt: g.createdAt ?? new Date().toISOString(),
  };
}

function load(): AppState {
  if (typeof window === "undefined") return defaultState;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState;
    const parsed = JSON.parse(raw);
    const merged: AppState = { ...defaultState, ...parsed };
    merged.tasks = (merged.tasks ?? []).map(hydrateTask);
    merged.habits = (merged.habits ?? []).map(hydrateHabit);
    merged.sessions = (merged.sessions ?? []).map(hydrateSession);
    merged.goals = (merged.goals ?? []).map(hydrateGoal);
    merged.pomodoros = merged.pomodoros ?? [];
    merged.xpSpent = typeof merged.xpSpent === "number" ? merged.xpSpent : 0;
    merged.rewards = (merged.rewards ?? []).map((r: Partial<Reward>) => ({
      id: r.id!,
      title: r.title ?? "Reward",
      description: r.description,
      cost: r.cost ?? 100,
      icon: r.icon ?? "🎁",
      color: r.color ?? "bg-primary-soft text-primary",
      category: r.category,
      createdAt: r.createdAt ?? new Date().toISOString(),
      archived: !!r.archived,
    }));
    merged.redemptions = merged.redemptions ?? [];
    merged.achievements = merged.achievements ?? [];
    merged.rewardsPrefs = { ...defaultState.rewardsPrefs, ...(merged.rewardsPrefs ?? {}) };
    merged.pomodoroSettings = { ...defaultState.pomodoroSettings, ...(merged.pomodoroSettings ?? {}) };
    merged.distractions = merged.distractions ?? [];
    merged.focusSessions = merged.focusSessions ?? [];
    return merged;
  } catch {
    return defaultState;
  }
}

let state: AppState = defaultState;
const listeners = new Set<() => void>();
let hydrated = false;

function ensureHydrated() {
  if (hydrated || typeof window === "undefined") return;
  state = load();
  hydrated = true;
}

function persist() {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function emit() {
  listeners.forEach((l) => l());
}

export function getState(): AppState {
  ensureHydrated();
  return state;
}

export function setState(updater: (s: AppState) => AppState) {
  ensureHydrated();
  state = updater(state);
  persist();
  emit();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export const subscribeStore = subscribe;

// ---- Multi-user isolation ----
// The local store is shared across browser tabs and persisted to localStorage.
// When a different user signs in (or a user signs out), we MUST wipe every
// user-scoped slice so one account never sees another account's data.
export function getStoredAuthUserId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(AUTH_USER_KEY);
  } catch {
    return null;
  }
}

export function setStoredAuthUserId(uid: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (uid) window.localStorage.setItem(AUTH_USER_KEY, uid);
    else window.localStorage.removeItem(AUTH_USER_KEY);
  } catch {
    /* ignore */
  }
}

/** Wipe every user-scoped slice. Preserves device-level UI prefs only. */
export function resetUserScopedState() {
  ensureHydrated();
  const preservedTheme = state.theme;
  const preservedPomodoroSettings = state.pomodoroSettings;
  const preservedRewardsPrefs = state.rewardsPrefs;
  state = {
    ...defaultState,
    theme: preservedTheme,
    pomodoroSettings: preservedPomodoroSettings,
    rewardsPrefs: preservedRewardsPrefs,
  };
  persist();
  emit();
}


export function useAppState<T>(selector: (s: AppState) => T): T {
  return useSyncExternalStore(
    subscribe,
    () => selector(getState()),
    () => selector(defaultState),
  );
}

// ============ Helpers ============
export function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function daysBetween(a: string, b: string) {
  const d1 = new Date(a).getTime();
  const d2 = new Date(b).getTime();
  return Math.floor((d2 - d1) / (1000 * 60 * 60 * 24));
}

export function currentChallengeDay(settings: UserSettings | null): number {
  if (!settings) return 1;
  const start = new Date(settings.startDate);
  const now = new Date();
  const diff = Math.floor(
    (Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) -
      Date.UTC(start.getFullYear(), start.getMonth(), start.getDate())) /
      (1000 * 60 * 60 * 24),
  );
  return Math.min(Math.max(diff + 1, 1), settings.duration);
}

export function computeStreaks(tasks: Task[]): { current: number; longest: number } {
  const byDay = new Map<string, { total: number; done: number }>();
  for (const t of tasks) {
    if (t.archived) continue;
    const b = byDay.get(t.date) ?? { total: 0, done: 0 };
    b.total += 1;
    if (t.completed) b.done += 1;
    byDay.set(t.date, b);
  }
  const days = Array.from(byDay.keys()).sort();
  let longest = 0;
  let run = 0;
  let prev: string | null = null;
  for (const d of days) {
    const info = byDay.get(d)!;
    const success = info.total > 0 && info.done === info.total;
    if (!success) {
      run = 0;
      prev = d;
      continue;
    }
    if (prev && daysBetween(prev, d) === 1) {
      run += 1;
    } else {
      run = 1;
    }
    longest = Math.max(longest, run);
    prev = d;
  }
  const today = todayISO();
  let current = 0;
  let cursor = today;
  while (byDay.has(cursor)) {
    const info = byDay.get(cursor)!;
    if (info.total > 0 && info.done === info.total) {
      current += 1;
      const d = new Date(cursor);
      d.setDate(d.getDate() - 1);
      cursor = d.toISOString().slice(0, 10);
    } else break;
  }
  return { current, longest };
}

export function computeHabitStreaks(h: Habit): { current: number; longest: number; lastCompleted?: string } {
  const days = Object.keys(h.history).filter((d) => h.history[d]).sort();
  const lastCompleted = days[days.length - 1];
  let longest = 0;
  let run = 0;
  let prev: string | null = null;
  for (const d of days) {
    if (prev && daysBetween(prev, d) === 1) run += 1;
    else run = 1;
    longest = Math.max(longest, run);
    prev = d;
  }
  // current: consecutive days ending today (or yesterday if today skipped/none)
  let current = 0;
  const cursor = new Date();
  while (true) {
    const iso = cursor.toISOString().slice(0, 10);
    if (h.history[iso]) {
      current += 1;
      cursor.setDate(cursor.getDate() - 1);
    } else if (h.skips[iso]) {
      // skip preserves streak but doesn't add
      cursor.setDate(cursor.getDate() - 1);
    } else break;
  }
  return { current, longest, lastCompleted };
}

export function computeStudyStats(sessions: StudySession[]) {
  const today = todayISO();
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - 6);
  const weekStartISO = weekStart.toISOString().slice(0, 10);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);

  const todayMin = sessions.filter((s) => s.date === today).reduce((n, s) => n + s.minutes, 0);
  const weekMin = sessions.filter((s) => s.date >= weekStartISO).reduce((n, s) => n + s.minutes, 0);
  const monthMin = sessions.filter((s) => s.date >= monthStart).reduce((n, s) => n + s.minutes, 0);
  const total = sessions.reduce((n, s) => n + s.minutes, 0);
  const longest = sessions.reduce((m, s) => Math.max(m, s.minutes), 0);
  const daysActive = new Set(sessions.map((s) => s.date)).size;
  const avgDaily = daysActive ? Math.round(total / daysActive) : 0;
  return { todayMin, weekMin, monthMin, total, longest, avgDaily };
}

// ============ Task mutations ============

export const XP_BY_PRIORITY: Record<Task["priority"], number> = { low: 10, medium: 15, high: 25 };

function recalcLinkedGoal(s: AppState, goalId?: string): AppState {
  if (!goalId) return s;
  const linked = s.tasks.filter((t) => t.goalId === goalId && !t.archived);
  if (linked.length === 0) return s;
  const done = linked.filter((t) => t.completed).length;
  const goals = s.goals.map((g) => {
    if (g.id !== goalId) return g;
    const progress = Math.min(g.target, Math.max(g.progress, done));
    const completedAt = progress >= g.target ? g.completedAt ?? new Date().toISOString() : undefined;
    return { ...g, progress, completedAt };
  });
  return { ...s, goals };
}

export function toggleTaskComplete(id: string): { justCompleted: boolean; allDone: boolean; date: string; xp: number } {
  // NOTE: XP is intentionally NOT mutated on the local store here. Task XP is
  // persisted to Supabase (`daily_stats.xp`) by tasks-sync and mirrored back
  // into `state.xp` by useXpTotalsSync. See src/lib/xp-sync.ts.
  let result = { justCompleted: false, allDone: false, date: "", xp: 0 };
  setState((s) => {
    const task = s.tasks.find((t) => t.id === id);
    if (!task) return s;
    const nowDone = !task.completed;
    const tasks = s.tasks.map((t) =>
      t.id === id
        ? { ...t, completed: nowDone, completedAt: nowDone ? new Date().toISOString() : undefined }
        : t,
    );
    const dayTasks = tasks.filter((t) => t.date === task.date && !t.archived);
    const allDone = dayTasks.length > 0 && dayTasks.every((t) => t.completed);
    result = {
      justCompleted: nowDone,
      allDone: nowDone && allDone,
      date: task.date,
      xp: nowDone ? XP_BY_PRIORITY[task.priority] : 0,
    };
    let next = { ...s, tasks };
    next = recalcLinkedGoal(next, task.goalId);
    return next;
  });
  return result;
}

export function addTask(input: Omit<Task, "id" | "createdAt" | "completed" | "archived" | "order" | "tags"> & { tags?: string[] }): Task {
  const task: Task = {
    ...input,
    tags: input.tags ?? [],
    id: uid(),
    completed: false,
    archived: false,
    order: Date.now(),
    createdAt: new Date().toISOString(),
  };
  setState((s) => ({ ...s, tasks: [...s.tasks, task] }));
  return task;
}

export function updateTask(id: string, patch: Partial<Task>) {
  setState((s) => {
    const before = s.tasks.find((t) => t.id === id);
    const tasks = s.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t));
    let next = { ...s, tasks };
    if (before?.goalId) next = recalcLinkedGoal(next, before.goalId);
    if (patch.goalId && patch.goalId !== before?.goalId) next = recalcLinkedGoal(next, patch.goalId);
    return next;
  });
}

export function deleteTask(id: string) {
  setState((s) => ({ ...s, tasks: s.tasks.filter((t) => t.id !== id) }));
}

export function duplicateTask(id: string) {
  setState((s) => {
    const t = s.tasks.find((x) => x.id === id);
    if (!t) return s;
    const copy: Task = {
      ...t,
      id: uid(),
      title: `${t.title} (copy)`,
      completed: false,
      completedAt: undefined,
      archived: false,
      order: Date.now(),
      createdAt: new Date().toISOString(),
      recurrence: undefined,
      recurrenceParentId: undefined,
    };
    return { ...s, tasks: [...s.tasks, copy] };
  });
}

export function reorderTasks(date: string, orderedIds: string[]) {
  setState((s) => {
    const idxMap = new Map(orderedIds.map((id, i) => [id, i]));
    const tasks = s.tasks.map((t) =>
      t.date === date && idxMap.has(t.id) ? { ...t, order: idxMap.get(t.id)! } : t,
    );
    return { ...s, tasks };
  });
}

export function addCustomCategory(name: string) {
  setState((s) => {
    if (!name.trim() || s.customCategories.includes(name)) return s;
    return { ...s, customCategories: [...s.customCategories, name.trim()] };
  });
}

export function generateRecurringForDate(date: string) {
  setState((s) => {
    const dow = new Date(date + "T00:00:00").getDay();
    const templates = s.tasks.filter(
      (t) => t.recurrence && t.recurrence.kind !== "none" && !t.recurrenceParentId,
    );
    const newInstances: Task[] = [];
    for (const tpl of templates) {
      const rec = tpl.recurrence!;
      if (tpl.date === date) continue;
      if (date < tpl.date) continue;
      let matches = false;
      if (rec.kind === "daily") matches = true;
      else if (rec.kind === "weekdays") matches = dow >= 1 && dow <= 5;
      else if (rec.kind === "weekly") matches = dow === new Date(tpl.date + "T00:00:00").getDay();
      else if (rec.kind === "custom") matches = !!rec.weekdays?.includes(dow);
      if (!matches) continue;
      const already = s.tasks.some(
        (t) => t.recurrenceParentId === tpl.id && t.date === date,
      );
      if (already) continue;
      newInstances.push({
        ...tpl,
        id: uid(),
        date,
        completed: false,
        completedAt: undefined,
        archived: false,
        order: Date.now() + newInstances.length,
        createdAt: new Date().toISOString(),
        recurrence: undefined,
        recurrenceParentId: tpl.id,
      });
    }
    if (newInstances.length === 0) return s;
    return { ...s, tasks: [...s.tasks, ...newInstances] };
  });
}

// ============ Habits ============
export function addHabit(input: Omit<Habit, "id" | "createdAt" | "history" | "skips">) {
  setState((s) => ({
    ...s,
    habits: [
      ...s.habits,
      { ...input, id: uid(), createdAt: new Date().toISOString(), history: {}, skips: {} },
    ],
  }));
}

export function updateHabit(id: string, patch: Partial<Habit>) {
  setState((s) => ({
    ...s,
    habits: s.habits.map((h) => (h.id === id ? { ...h, ...patch } : h)),
  }));
}

export function deleteHabit(id: string) {
  setState((s) => ({ ...s, habits: s.habits.filter((h) => h.id !== id) }));
}

export function toggleHabitDay(id: string, date: string) {
  setState((s) => ({
    ...s,
    habits: s.habits.map((h) => {
      if (h.id !== id) return h;
      const next = { ...h.history };
      if (next[date]) delete next[date];
      else next[date] = true;
      const skips = { ...h.skips };
      delete skips[date];
      return { ...h, history: next, skips };
    }),
  }));
}

export function skipHabitDay(id: string, date: string) {
  setState((s) => ({
    ...s,
    habits: s.habits.map((h) => {
      if (h.id !== id) return h;
      const history = { ...h.history };
      delete history[date];
      const skips = { ...h.skips };
      if (skips[date]) delete skips[date];
      else skips[date] = true;
      return { ...h, history, skips };
    }),
  }));
}

// ============ Study sessions ============
export function addSession(input: Omit<StudySession, "id" | "createdAt">) {
  setState((s) => ({
    ...s,
    sessions: [
      { ...input, id: uid(), createdAt: new Date().toISOString() },
      ...s.sessions,
    ],
  }));
}

export function updateSession(id: string, patch: Partial<StudySession>) {
  setState((s) => ({
    ...s,
    sessions: s.sessions.map((x) => (x.id === id ? { ...x, ...patch } : x)),
  }));
}

export function deleteSession(id: string) {
  setState((s) => ({ ...s, sessions: s.sessions.filter((x) => x.id !== id) }));
}

// ============ Goals ============
export function addGoal(input: Omit<Goal, "id" | "createdAt" | "progress"> & { progress?: number }) {
  setState((s) => ({
    ...s,
    goals: [
      ...s.goals,
      { ...input, progress: input.progress ?? 0, id: uid(), createdAt: new Date().toISOString() },
    ],
  }));
}

export function updateGoal(id: string, patch: Partial<Goal>) {
  setState((s) => ({
    ...s,
    goals: s.goals.map((g) => {
      if (g.id !== id) return g;
      const merged = { ...g, ...patch };
      if (merged.progress >= merged.target && !merged.completedAt) {
        merged.completedAt = new Date().toISOString();
      }
      if (merged.progress < merged.target) merged.completedAt = undefined;
      return merged;
    }),
  }));
}

export function deleteGoal(id: string) {
  setState((s) => ({
    ...s,
    goals: s.goals.filter((g) => g.id !== id),
    tasks: s.tasks.map((t) => (t.goalId === id ? { ...t, goalId: undefined } : t)),
  }));
}

export function updateGoalProgress(id: string, progress: number) {
  setState((s) => ({
    ...s,
    goals: s.goals.map((g) => {
      if (g.id !== id) return g;
      const clamped = Math.max(0, Math.min(g.target || 100, Math.round(progress)));
      const merged: Goal = { ...g, progress: clamped };
      if (clamped >= (g.target || 100)) {
        merged.completed = true;
        merged.completedAt = merged.completedAt ?? new Date().toISOString();
      } else {
        merged.completed = false;
        merged.completedAt = undefined;
      }
      return merged;
    }),
  }));
}

export function completeGoal(id: string) {
  setState((s) => ({
    ...s,
    goals: s.goals.map((g) =>
      g.id === id
        ? {
            ...g,
            progress: g.target || 100,
            completed: true,
            completedAt: g.completedAt ?? new Date().toISOString(),
          }
        : g,
    ),
  }));
}

export function reopenGoal(id: string) {
  setState((s) => ({
    ...s,
    goals: s.goals.map((g) =>
      g.id === id
        ? { ...g, completed: false, completedAt: undefined }
        : g,
    ),
  }));
}

// ============ Journal ============
export function upsertJournalToday(patch: Partial<JournalEntry>) {
  setState((s) => {
    const date = todayISO();
    const existing = s.journal.find((j) => j.date === date);
    if (existing) {
      return {
        ...s,
        journal: s.journal.map((j) =>
          j.id === existing.id ? { ...j, ...patch, updatedAt: new Date().toISOString() } : j,
        ),
      };
    }
    const entry: JournalEntry = {
      id: uid(),
      date,
      mood: (patch.mood as MoodKey) ?? "good",
      content: patch.content ?? "",
      learned: patch.learned,
      problems: patch.problems,
      wentWell: patch.wentWell,
      improve: patch.improve,
      tomorrowPlan: patch.tomorrowPlan,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return { ...s, journal: [entry, ...s.journal] };
  });
}

export function deleteJournalEntry(id: string) {
  setState((s) => ({ ...s, journal: s.journal.filter((j) => j.id !== id) }));
}

export function addJournalEntry(
  input: Partial<Omit<JournalEntry, "id" | "createdAt">> & { date?: string; mood?: MoodKey; content?: string },
): JournalEntry {
  const entry: JournalEntry = {
    id: uid(),
    date: input.date ?? todayISO(),
    title: input.title ?? "",
    tags: input.tags ?? [],
    mood: (input.mood as MoodKey) ?? "good",
    content: input.content ?? "",
    learned: input.learned,
    problems: input.problems,
    wentWell: input.wentWell,
    improve: input.improve,
    tomorrowPlan: input.tomorrowPlan,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  setState((s) => ({ ...s, journal: [entry, ...s.journal] }));
  return entry;
}

export function updateJournalEntry(id: string, patch: Partial<JournalEntry>) {
  setState((s) => ({
    ...s,
    journal: s.journal.map((j) =>
      j.id === id ? { ...j, ...patch, updatedAt: new Date().toISOString() } : j,
    ),
  }));
}

// ============ Pomodoro ============
/**
 * Log a completed pomodoro. Returns the XP amount so the caller can persist
 * it to Supabase via bumpDailyXp (see src/lib/xp-sync.ts). This function
 * does NOT touch `state.xp` — that is a mirror maintained by useXpTotalsSync.
 */
export function logPomodoro(mode: PomodoroLog["mode"], minutes: number): { xp: number } {
  const xp = mode === "focus" ? 15 : 5;
  setState((s) => ({
    ...s,
    pomodoros: [
      { id: uid(), date: todayISO(), minutes, mode, completedAt: new Date().toISOString(), xp },
      ...s.pomodoros,
    ],
  }));
  if (mode === "focus") {
    // mirror to study sessions
    addSession({
      date: todayISO(),
      minutes,
      subject: "Focus",
      category: "Pomodoro",
      source: "pomodoro",
    });
  }
  return { xp };
}

export function updatePomodoroSettings(patch: Partial<PomodoroSettings>) {
  setState((s) => ({ ...s, pomodoroSettings: { ...s.pomodoroSettings, ...patch } }));
}

// ============ Timer ============
export function startTimer(t: Omit<ActiveTimer, "startedAt" | "accumulatedMs">) {
  setState((s) => ({
    ...s,
    activeTimer: {
      ...t,
      startedAt: Date.now(),
      accumulatedMs: 0,
    },
  }));
}

export function pauseTimer() {
  setState((s) => {
    if (!s.activeTimer || s.activeTimer.pausedAt) return s;
    const elapsed = Date.now() - s.activeTimer.startedAt;
    return {
      ...s,
      activeTimer: {
        ...s.activeTimer,
        pausedAt: Date.now(),
        accumulatedMs: s.activeTimer.accumulatedMs + elapsed,
      },
    };
  });
}

export function resumeTimer() {
  setState((s) => {
    if (!s.activeTimer || !s.activeTimer.pausedAt) return s;
    return {
      ...s,
      activeTimer: { ...s.activeTimer, startedAt: Date.now(), pausedAt: undefined },
    };
  });
}

export function stopTimer(): ActiveTimer | null {
  let stopped: ActiveTimer | null = null;
  setState((s) => {
    stopped = s.activeTimer;
    return { ...s, activeTimer: null };
  });
  return stopped;
}

export function timerElapsedMs(t: ActiveTimer): number {
  if (t.pausedAt) return t.accumulatedMs;
  return t.accumulatedMs + (Date.now() - t.startedAt);
}

// ============ Rewards & achievements ============
export function getAvailableXp(s?: AppState): number {
  const st = s ?? getState();
  return Math.max(0, (st.xp ?? 0) - (st.xpSpent ?? 0));
}

export function addReward(input: Omit<Reward, "id" | "createdAt" | "archived">): Reward {
  const reward: Reward = {
    ...input,
    id: uid(),
    createdAt: new Date().toISOString(),
    archived: false,
  };
  setState((s) => ({ ...s, rewards: [...s.rewards, reward] }));
  return reward;
}

export function updateReward(id: string, patch: Partial<Reward>) {
  setState((s) => ({
    ...s,
    rewards: s.rewards.map((r) => (r.id === id ? { ...r, ...patch } : r)),
  }));
}

export function archiveReward(id: string) {
  setState((s) => ({
    ...s,
    rewards: s.rewards.map((r) => (r.id === id ? { ...r, archived: !r.archived } : r)),
  }));
}

export function deleteReward(id: string) {
  setState((s) => ({ ...s, rewards: s.rewards.filter((r) => r.id !== id) }));
}

export function redeemReward(id: string): { ok: boolean; availableXp: number; cost: number; reason?: string } {
  // Deducts XP by inserting a redemption row locally; the caller is
  // responsible for persisting the cost to Supabase via bumpDailyXpSpent.
  // `state.xpSpent` is a mirror maintained by useXpTotalsSync — never mutated
  // here directly.
  let result = { ok: false, availableXp: 0, cost: 0, reason: "" };
  setState((s) => {
    const reward = s.rewards.find((r) => r.id === id);
    if (!reward) {
      result = { ok: false, availableXp: getAvailableXp(s), cost: 0, reason: "Reward not found" };
      return s;
    }
    const available = getAvailableXp(s);
    if (available < reward.cost) {
      result = { ok: false, availableXp: available, cost: reward.cost, reason: "Not enough XP" };
      return s;
    }
    const redemption: Redemption = {
      id: uid(),
      rewardId: reward.id,
      title: reward.title,
      icon: reward.icon,
      cost: reward.cost,
      redeemedAt: new Date().toISOString(),
    };
    result = { ok: true, availableXp: available - reward.cost, cost: reward.cost, reason: "" };
    return {
      ...s,
      redemptions: [redemption, ...s.redemptions],
    };
  });
  return result;
}

export function claimRedemption(id: string) {
  setState((s) => ({
    ...s,
    redemptions: s.redemptions.map((r) =>
      r.id === id ? { ...r, claimedAt: r.claimedAt ? undefined : new Date().toISOString() } : r,
    ),
  }));
}

export function deleteRedemption(id: string) {
  setState((s) => ({ ...s, redemptions: s.redemptions.filter((r) => r.id !== id) }));
}

/**
 * Clears local redemption history. Spent-XP reset is persisted separately by
 * the caller through resetSpentXpForUser in xp-sync.
 */
export function resetRedemptionHistory() {
  setState((s) => ({ ...s, redemptions: [] }));
}

export function resetAchievements() {
  setState((s) => ({ ...s, achievements: [] }));
}

export function setRewardsPref<K extends keyof RewardsPreferences>(k: K, v: RewardsPreferences[K]) {
  setState((s) => ({ ...s, rewardsPrefs: { ...s.rewardsPrefs, [k]: v } }));
}

/**
 * Unlock any achievements whose criteria have been newly met.
 * Returns the ids newly unlocked AND the total XP bonus so the caller can
 * persist it via bumpDailyXp. `state.xp` is NOT mutated here.
 */
export function applyAchievementUnlocks(
  evaluators: { id: string; xpReward: number; evaluate: (s: AppState) => { unlocked: boolean } }[],
): { ids: string[]; xpBonus: number } {
  const newlyUnlocked: string[] = [];
  let bonus = 0;
  setState((s) => {
    const already = new Set(s.achievements.map((a) => a.id));
    const nowIso = new Date().toISOString();
    const additions: AchievementUnlock[] = [];
    for (const a of evaluators) {
      if (already.has(a.id)) continue;
      if (a.evaluate(s).unlocked) {
        additions.push({ id: a.id, unlockedAt: nowIso, seen: false });
        newlyUnlocked.push(a.id);
        bonus += a.xpReward;
      }
    }
    if (additions.length === 0) return s;
    return {
      ...s,
      achievements: [...s.achievements, ...additions],
    };
  });
  return { ids: newlyUnlocked, xpBonus: bonus };
}

export function markAchievementsSeen(ids?: string[]) {
  setState((s) => ({
    ...s,
    achievements: s.achievements.map((a) =>
      !ids || ids.includes(a.id) ? { ...a, seen: true } : a,
    ),
  }));
}

// ============ Focus guard ============
export function logDistraction(awayMs: number) {
  setState((s) => ({
    ...s,
    distractions: [
      { id: uid(), date: todayISO(), at: new Date().toISOString(), awayMs },
      ...s.distractions,
    ],
  }));
}

export function logFocusSession(entry: Omit<FocusSessionLog, "id" | "date">) {
  setState((s) => ({
    ...s,
    focusSessions: [
      { id: uid(), date: todayISO(), ...entry },
      ...s.focusSessions,
    ],
  }));
}

export function failActiveFocusSession(awayMs: number): ActiveTimer | null {
  const t = getState().activeTimer;
  if (!t || t.kind !== "pomodoro-focus") return null;
  const actualSeconds = Math.floor(timerElapsedMs(t) / 1000);
  const startedAtIso = new Date(Date.now() - actualSeconds * 1000).toISOString();
  logFocusSession({
    startedAt: startedAtIso,
    endedAt: new Date().toISOString(),
    targetSeconds: t.targetSeconds,
    actualSeconds,
    outcome: "failed",
  });
  logDistraction(awayMs);
  return stopTimer();
}
