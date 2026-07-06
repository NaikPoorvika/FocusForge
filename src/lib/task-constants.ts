export const DEFAULT_CATEGORIES = [
  "DSA",
  "Python",
  "Java",
  "C++",
  "SQL",
  "AI/ML",
  "Web Development",
  "Aptitude",
  "Communication",
  "Interview Preparation",
  "Projects",
  "Revision",
  "Placement Preparation",
] as const;

// Deterministic pleasant palette for category chips
const PALETTE = [
  "bg-sky-500/15 text-sky-600 dark:text-sky-300 border-sky-500/20",
  "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-500/20",
  "bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-500/20",
  "bg-rose-500/15 text-rose-600 dark:text-rose-300 border-rose-500/20",
  "bg-violet-500/15 text-violet-600 dark:text-violet-300 border-violet-500/20",
  "bg-fuchsia-500/15 text-fuchsia-600 dark:text-fuchsia-300 border-fuchsia-500/20",
  "bg-teal-500/15 text-teal-600 dark:text-teal-300 border-teal-500/20",
  "bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 border-indigo-500/20",
  "bg-orange-500/15 text-orange-600 dark:text-orange-300 border-orange-500/20",
  "bg-lime-500/15 text-lime-600 dark:text-lime-300 border-lime-500/20",
  "bg-cyan-500/15 text-cyan-600 dark:text-cyan-300 border-cyan-500/20",
  "bg-pink-500/15 text-pink-600 dark:text-pink-300 border-pink-500/20",
  "bg-blue-500/15 text-blue-600 dark:text-blue-300 border-blue-500/20",
];

function hashStr(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function categoryStyle(name: string): string {
  return PALETTE[hashStr(name) % PALETTE.length];
}

export const PRIORITIES = [
  {
    value: "high" as const,
    label: "High",
    badge: "bg-rose-500/15 text-rose-600 dark:text-rose-300 border-rose-500/25",
    dot: "bg-rose-500",
  },
  {
    value: "medium" as const,
    label: "Medium",
    badge: "bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-500/25",
    dot: "bg-amber-500",
  },
  {
    value: "low" as const,
    label: "Low",
    badge: "bg-slate-500/15 text-slate-600 dark:text-slate-300 border-slate-500/25",
    dot: "bg-slate-400",
  },
];

export function priorityMeta(p: "low" | "medium" | "high") {
  return PRIORITIES.find((x) => x.value === p)!;
}

export function formatEstimated(mins?: number): string {
  if (!mins) return "";
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}
