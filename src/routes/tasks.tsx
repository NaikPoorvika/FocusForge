import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ListTodo, PartyPopper } from "lucide-react";
import { PageHeader } from "@/components/ui-bits";
import {
  computeStreaks,
  generateRecurringForDate,
  reorderTasks,
  todayISO,
  useAppState,
  type Task,
} from "@/lib/store";
import { bumpDailyXp } from "@/lib/xp-sync";
import { useCurrentUser } from "@/hooks/use-current-user";
import { DailySummary } from "@/components/tasks/daily-summary";
import { DateSwitcher } from "@/components/tasks/date-switcher";
import { QuickAddFab } from "@/components/tasks/quick-add-fab";
import { TaskCard } from "@/components/tasks/task-card";
import {
  TaskFilters,
  type FilterState,
} from "@/components/tasks/task-filters";
import { TaskFormDialog } from "@/components/tasks/task-form-dialog";
import { Confetti } from "@/components/tasks/confetti";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/tasks")({
  component: TasksPage,
});

const UI_KEY = "sst-tasks-ui-v1";

function loadUI(): FilterState {
  const fallback: FilterState = {
    search: "",
    category: "all",
    priority: "all",
    status: "all",
    sort: "manual",
  };
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(UI_KEY);
    if (!raw) return fallback;
    return { ...fallback, ...JSON.parse(raw) };
  } catch {
    return fallback;
  }
}

const PRIORITY_ORDER: Record<Task["priority"], number> = { high: 0, medium: 1, low: 2 };

function TasksPage() {
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [filters, setFilters] = useState<FilterState>(() => loadUI());
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [confetti, setConfetti] = useState(false);
  const [celebrateOpen, setCelebrateOpen] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);

  const allTasks = useAppState((s) => s.tasks);
  const { user } = useCurrentUser();
  const userId = user?.id;

  // Persist filter UI state
  useEffect(() => {
    try {
      window.localStorage.setItem(UI_KEY, JSON.stringify(filters));
    } catch {
      /* ignore */
    }
  }, [filters]);

  // Generate recurring tasks whenever the visible date changes
  useEffect(() => {
    generateRecurringForDate(selectedDate);
  }, [selectedDate]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "n") {
        const target = e.target as HTMLElement | null;
        if (target && ["INPUT", "TEXTAREA"].includes(target.tagName)) return;
        e.preventDefault();
        setEditing(null);
        setFormOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const dayTasks = useMemo(
    () => allTasks.filter((t) => t.date === selectedDate),
    [allTasks, selectedDate],
  );

  const filtered = useMemo(() => {
    const today = todayISO();
    const weekEnd = new Date(today + "T00:00:00");
    weekEnd.setDate(weekEnd.getDate() + 7);
    const weekEndISO = weekEnd.toISOString().slice(0, 10);

    const isArchivedView = filters.status === "archived";
    // For archived view, span all dates; otherwise stay in the selected day
    let base = isArchivedView
      ? allTasks.filter((t) => t.archived)
      : dayTasks.filter((t) => !t.archived);

    if (!isArchivedView) {
      if (filters.status === "pending") base = base.filter((t) => !t.completed);
      else if (filters.status === "completed") base = base.filter((t) => t.completed);
      else if (filters.status === "today")
        base = allTasks.filter((t) => !t.archived && t.date === today);
      else if (filters.status === "week")
        base = allTasks.filter(
          (t) => !t.archived && t.date >= today && t.date <= weekEndISO,
        );
    }

    if (filters.category !== "all") base = base.filter((t) => t.category === filters.category);
    if (filters.priority !== "all") base = base.filter((t) => t.priority === filters.priority);
    if (filters.search.trim()) {
      const q = filters.search.trim().toLowerCase();
      base = base.filter((t) =>
        [t.title, t.description, t.notes, t.category, ...(t.tags ?? [])]
          .filter(Boolean)
          .some((v) => (v as string).toLowerCase().includes(q)),
      );
    }

    const sorted = [...base];
    switch (filters.sort) {
      case "dueTime":
        sorted.sort((a, b) => (a.dueTime ?? "99:99").localeCompare(b.dueTime ?? "99:99"));
        break;
      case "priority":
        sorted.sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
        break;
      case "category":
        sorted.sort((a, b) => a.category.localeCompare(b.category));
        break;
      case "recent":
        sorted.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
        break;
      case "alpha":
        sorted.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case "manual":
      default:
        sorted.sort((a, b) => a.order - b.order);
    }
    return sorted;
  }, [allTasks, dayTasks, filters]);

  const openNew = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (t: Task) => {
    setEditing(t);
    setFormOpen(true);
  };

  const [bonusAwarded, setBonusAwarded] = useState<Set<string>>(new Set());
  const onCompleted = (r: { justCompleted: boolean; allDone: boolean; date: string; xp: number }) => {
    if (r.justCompleted) {
      setConfetti(true);
      if (r.allDone && !bonusAwarded.has(r.date)) {
        if (userId) void bumpDailyXp(userId, 50);
        setBonusAwarded((prev) => new Set(prev).add(r.date));
        setCelebrateOpen(true);
      }
    }
  };

  // Drag & drop (only when sort === "manual" and not archived view)
  const dndEnabled = filters.sort === "manual" && filters.status !== "archived";

  const onDragStart = (id: string) => (e: React.DragEvent) => {
    setDragId(id);
    e.dataTransfer.effectAllowed = "move";
  };
  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };
  const onDrop = (targetId: string) => (e: React.DragEvent) => {
    e.preventDefault();
    if (!dragId || dragId === targetId) return;
    const ids = filtered.map((t) => t.id);
    const from = ids.indexOf(dragId);
    const to = ids.indexOf(targetId);
    if (from === -1 || to === -1) return;
    ids.splice(to, 0, ids.splice(from, 1)[0]);
    reorderTasks(selectedDate, ids);
    setDragId(null);
  };
  const onDragEnd = () => setDragId(null);

  const emptyMessage =
    filters.status === "archived"
      ? "Nothing archived yet."
      : selectedDate === todayISO()
        ? "No tasks for today. Add your first task and start your productivity journey."
        : "No tasks for this day yet.";

  return (
    <div className="pb-20">
      <PageHeader title="Daily Tasks" subtitle="Plan the day, one focused block at a time." />

      <div className="mb-5">
        <DateSwitcher value={selectedDate} onChange={setSelectedDate} />
      </div>

      <DailySummary tasks={dayTasks} />

      <div className="mt-6">
        <TaskFilters value={filters} onChange={setFilters} />
      </div>

      <div className="mt-5 space-y-2">
        <AnimatePresence initial={false}>
          {filtered.map((t) => (
            <TaskCard
              key={t.id}
              task={t}
              onEdit={openEdit}
              onCompleted={onCompleted}
              isDragging={dragId === t.id}
              dragHandlers={
                dndEnabled
                  ? {
                      draggable: true,
                      onDragStart: onDragStart(t.id),
                      onDragOver,
                      onDrop: onDrop(t.id),
                      onDragEnd,
                    }
                  : undefined
              }
            />
          ))}
        </AnimatePresence>

        {filtered.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8 rounded-3xl border border-dashed border-border bg-card/50 py-14 text-center"
          >
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-primary/10 text-primary">
              <ListTodo className="h-7 w-7" />
            </div>
            <p className="mt-4 text-base font-semibold">Ready to plan?</p>
            <p className="mx-auto mt-1 max-w-sm px-6 text-sm text-muted-foreground">
              {emptyMessage}
            </p>
            {filters.status !== "archived" && (
              <Button className="mt-5" onClick={openNew}>
                Add your first task
              </Button>
            )}
          </motion.div>
        )}
      </div>

      <QuickAddFab onClick={openNew} />

      <TaskFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editing={editing}
        defaultDate={selectedDate}
      />

      <Confetti show={confetti} onDone={() => setConfetti(false)} />

      <Dialog open={celebrateOpen} onOpenChange={setCelebrateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-success/15 text-success">
              <PartyPopper className="h-8 w-8" />
            </div>
            <DialogTitle className="text-center text-2xl">🎉 Day complete!</DialogTitle>
            <DialogDescription className="text-center">
              You crushed every task on your list. Bonus XP awarded — keep the momentum.
            </DialogDescription>
          </DialogHeader>
          {(() => {
            const total = dayTasks.filter((t) => !t.archived).length;
            const done = dayTasks.filter((t) => !t.archived && t.completed).length;
            const pct = total ? Math.round((done / total) * 100) : 100;
            const xpFromTasks = dayTasks
              .filter((t) => !t.archived && t.completed)
              .reduce(
                (n, t) => n + (t.priority === "high" ? 25 : t.priority === "medium" ? 15 : 10),
                0,
              );
            const { current } = computeStreaks(allTasks);
            return (
              <div className="grid grid-cols-3 gap-2 pt-1">
                <StatBox label="Completion" value={`${pct}%`} tone="primary" />
                <StatBox label="XP earned" value={`+${xpFromTasks + 50}`} tone="success" />
                <StatBox label="Streak" value={`${current}d`} tone="warning" />
              </div>
            );
          })()}
          <DialogFooter className="sm:justify-center">
            <Button asChild>
              <Link to="/" onClick={() => setCelebrateOpen(false)}>Continue to Dashboard</Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatBox({ label, value, tone }: { label: string; value: string; tone: "primary" | "success" | "warning" }) {
  const toneClass =
    tone === "success"
      ? "bg-success/10 text-success"
      : tone === "warning"
        ? "bg-warning/20 text-warning-foreground"
        : "bg-primary/10 text-primary";
  return (
    <div className={`rounded-2xl px-3 py-3 text-center ${toneClass}`}>
      <p className="text-lg font-bold">{value}</p>
      <p className="text-[10px] font-semibold uppercase tracking-wider opacity-80">{label}</p>
    </div>
  );
}
