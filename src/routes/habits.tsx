import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Repeat,
  Plus,
  Flame,
  Trophy,
  CalendarDays,
  MoreHorizontal,
  Check,
  X as XIcon,
  Pencil,
  Trash2,
} from "lucide-react";
import { PageHeader } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
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
  addHabit,
  computeHabitStreaks,
  deleteHabit,
  skipHabitDay,
  todayISO,
  toggleHabitDay,
  updateHabit,
  useAppState,
  type Habit,
} from "@/lib/store";
import { toast } from "sonner";

export const Route = createFileRoute("/habits")({
  component: HabitsPage,
});

const EMOJIS = [
  "📚", "🏃", "💧", "🧘", "🥗", "😴", "✍️", "🎯", "🧠", "☀️",
  "💪", "🎨", "🎵", "💻", "📝", "🌱", "🔥", "⚡", "🚀", "⭐",
];

const COLORS = [
  { name: "primary", label: "Blue", chip: "bg-sky-500", ring: "ring-sky-500" },
  { name: "emerald", label: "Emerald", chip: "bg-emerald-500", ring: "ring-emerald-500" },
  { name: "amber", label: "Amber", chip: "bg-amber-500", ring: "ring-amber-500" },
  { name: "rose", label: "Rose", chip: "bg-rose-500", ring: "ring-rose-500" },
  { name: "violet", label: "Violet", chip: "bg-violet-500", ring: "ring-violet-500" },
  { name: "teal", label: "Teal", chip: "bg-teal-500", ring: "ring-teal-500" },
  { name: "orange", label: "Orange", chip: "bg-orange-500", ring: "ring-orange-500" },
  { name: "pink", label: "Pink", chip: "bg-pink-500", ring: "ring-pink-500" },
];

function colorClasses(name: string) {
  const c = COLORS.find((x) => x.name === name) ?? COLORS[0];
  return c;
}

const DEFAULTS: Omit<Habit, "id" | "createdAt" | "history" | "skips">[] = [
  { name: "Exercise", emoji: "🏃", color: "emerald", frequency: "daily", category: "Fitness" },
  { name: "Reading", emoji: "📚", color: "primary", frequency: "daily", category: "Growth" },
  { name: "Meditation", emoji: "🧘", color: "violet", frequency: "daily", category: "Mind" },
  { name: "Drink Water", emoji: "💧", color: "teal", frequency: "daily", category: "Health" },
  { name: "Sleep Before Target", emoji: "😴", color: "orange", frequency: "daily", category: "Health" },
  { name: "Coding Practice", emoji: "💻", color: "primary", frequency: "daily", category: "Study" },
  { name: "Revision", emoji: "📝", color: "amber", frequency: "daily", category: "Study" },
  { name: "Mock Test", emoji: "🎯", color: "rose", frequency: "weekly", weeklyTarget: 2, category: "Study" },
  { name: "Journal Writing", emoji: "✍️", color: "pink", frequency: "daily", category: "Mind" },
];

function HabitsPage() {
  const habits = useAppState((s) => s.habits);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Habit | null>(null);
  const [calendarFor, setCalendarFor] = useState<Habit | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Habit | null>(null);

  return (
    <div className="pb-16">
      <PageHeader
        title="Habits"
        subtitle="Small consistent actions become identity."
        actions={
          <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
            <Plus className="mr-1 h-4 w-4" /> Add habit
          </Button>
        }
      />

      {habits.length === 0 && (
        <div className="rounded-3xl border border-dashed border-border bg-card/50 p-6">
          <div className="flex items-start gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary">
              <Repeat className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold">Start with a few defaults</h3>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Add proven habits with one click, or build your own.
              </p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {DEFAULTS.map((d) => (
              <button
                key={d.name}
                onClick={() => {
                  addHabit(d);
                  toast.success(`${d.name} added`);
                }}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-sm font-medium transition-colors hover:border-primary/50 hover:bg-primary/5"
              >
                <span>{d.emoji}</span>
                {d.name}
              </button>
            ))}
            <button
              onClick={() => {
                DEFAULTS.forEach(addHabit);
                toast.success("Default habits added");
              }}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground"
            >
              Add all defaults
            </button>
          </div>
        </div>
      )}

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <AnimatePresence initial={false}>
          {habits.map((h) => (
            <HabitCard
              key={h.id}
              habit={h}
              onEdit={() => { setEditing(h); setFormOpen(true); }}
              onOpenCalendar={() => setCalendarFor(h)}
              onDelete={() => setConfirmDelete(h)}
            />
          ))}
        </AnimatePresence>
      </div>

      <HabitFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editing={editing}
      />

      <HabitCalendarDialog
        habit={calendarFor}
        onClose={() => setCalendarFor(null)}
      />

      <AlertDialog open={!!confirmDelete} onOpenChange={(v) => !v && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this habit?</AlertDialogTitle>
            <AlertDialogDescription>
              "{confirmDelete?.name}" and all its history will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (confirmDelete) {
                  deleteHabit(confirmDelete.id);
                  toast.success("Habit deleted");
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

function HabitCard({
  habit,
  onEdit,
  onOpenCalendar,
  onDelete,
}: {
  habit: Habit;
  onEdit: () => void;
  onOpenCalendar: () => void;
  onDelete: () => void;
}) {
  const today = todayISO();
  const { current, longest, lastCompleted } = computeHabitStreaks(habit);
  const doneToday = !!habit.history[today];
  const skippedToday = !!habit.skips[today];
  const color = colorClasses(habit.color);

  const days: string[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className="card-hover group relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`grid h-12 w-12 place-items-center rounded-2xl text-2xl text-white ${color.chip}`}>
            {habit.emoji}
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-base font-semibold">{habit.name}</h3>
            <p className="text-xs text-muted-foreground">
              {habit.category ?? "Habit"} •{" "}
              {habit.frequency === "weekly"
                ? `Weekly (${habit.weeklyTarget ?? 1}x)`
                : habit.frequency === "custom"
                  ? `Custom (${(habit.customDays ?? []).length}d)`
                  : "Daily"}
            </p>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="rounded-md p-1 text-muted-foreground hover:bg-muted" aria-label="More">
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onEdit}>
              <Pencil className="mr-2 h-4 w-4" /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onOpenCalendar}>
              <CalendarDays className="mr-2 h-4 w-4" /> View calendar
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={onDelete}>
              <Trash2 className="mr-2 h-4 w-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <StatMini icon={Flame} label="Streak" value={`${current}d`} tone="warning" />
        <StatMini icon={Trophy} label="Longest" value={`${longest}d`} tone="primary" />
        <StatMini
          icon={CalendarDays}
          label="Last"
          value={lastCompleted ? new Date(lastCompleted).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "—"}
          tone="muted"
        />
      </div>

      <div className="mt-4 flex gap-1 overflow-x-auto">
        {days.map((d) => {
          const done = !!habit.history[d];
          const skip = !!habit.skips[d];
          const isToday = d === today;
          return (
            <button
              key={d}
              onClick={() => toggleHabitDay(habit.id, d)}
              className={`h-8 min-w-[26px] flex-1 rounded-md text-[10px] font-bold transition-all ${
                done
                  ? `${color.chip} text-white`
                  : skip
                    ? "bg-muted/40 text-muted-foreground line-through"
                    : isToday
                      ? "border-2 border-dashed border-primary/40 bg-primary/5 text-primary"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
              title={d}
            >
              {new Date(d).getDate()}
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex gap-2">
        <Button
          size="sm"
          onClick={() => toggleHabitDay(habit.id, today)}
          className={doneToday ? "bg-success text-success-foreground hover:bg-success/90" : ""}
          variant={doneToday ? "default" : "default"}
        >
          <Check className="mr-1 h-4 w-4" />
          {doneToday ? "Completed" : "Complete"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => skipHabitDay(habit.id, today)}
          className={skippedToday ? "border-warning text-warning-foreground" : ""}
        >
          <XIcon className="mr-1 h-4 w-4" />
          {skippedToday ? "Skipped" : "Skip"}
        </Button>
      </div>
    </motion.div>
  );
}

function StatMini({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  tone: "primary" | "warning" | "muted";
}) {
  const cls =
    tone === "warning"
      ? "bg-amber-500/15 text-amber-600 dark:text-amber-300"
      : tone === "muted"
        ? "bg-muted text-muted-foreground"
        : "bg-primary/10 text-primary";
  return (
    <div className="rounded-xl border border-border/60 bg-background/50 p-2">
      <div className={`mx-auto grid h-7 w-7 place-items-center rounded-lg ${cls}`}>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <p className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-xs font-bold">{value}</p>
    </div>
  );
}

function HabitFormDialog({
  open,
  onOpenChange,
  editing,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: Habit | null;
}) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [emoji, setEmoji] = useState("📚");
  const [color, setColor] = useState("primary");
  const [frequency, setFrequency] = useState<"daily" | "weekly" | "custom">("daily");
  const [weeklyTarget, setWeeklyTarget] = useState(3);
  const [customDays, setCustomDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [reminderTime, setReminderTime] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setName(editing.name);
      setCategory(editing.category ?? "");
      setEmoji(editing.emoji);
      setColor(editing.color);
      setFrequency(editing.frequency);
      setWeeklyTarget(editing.weeklyTarget ?? 3);
      setCustomDays(editing.customDays ?? [1, 2, 3, 4, 5]);
      setReminderTime(editing.reminderTime ?? "");
      setNotes(editing.notes ?? "");
    } else {
      setName("");
      setCategory("");
      setEmoji("📚");
      setColor("primary");
      setFrequency("daily");
      setWeeklyTarget(3);
      setCustomDays([1, 2, 3, 4, 5]);
      setReminderTime("");
      setNotes("");
    }
  }, [open, editing]);

  const save = () => {
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    const payload = {
      name: name.trim(),
      category: category.trim() || undefined,
      emoji,
      color,
      frequency,
      weeklyTarget: frequency === "weekly" ? weeklyTarget : undefined,
      customDays: frequency === "custom" ? customDays : undefined,
      reminderTime: reminderTime || undefined,
      notes: notes.trim() || undefined,
    };
    if (editing) {
      updateHabit(editing.id, payload);
      toast.success("Habit updated");
    } else {
      addHabit(payload);
      toast.success("Habit added");
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit habit" : "New habit"}</DialogTitle>
          <DialogDescription>Design a habit you'll actually stick to.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Read 20 pages" autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Category</Label>
              <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Growth" />
            </div>
            <div>
              <Label>Reminder</Label>
              <Input type="time" value={reminderTime} onChange={(e) => setReminderTime(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Icon</Label>
            <div className="mt-1 grid grid-cols-10 gap-1.5">
              {EMOJIS.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setEmoji(e)}
                  className={`grid h-9 w-9 place-items-center rounded-lg text-lg transition-all ${
                    emoji === e ? "bg-primary/15 ring-2 ring-primary" : "bg-muted hover:bg-muted/70"
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label>Color</Label>
            <div className="mt-1 flex flex-wrap gap-2">
              {COLORS.map((c) => (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => setColor(c.name)}
                  aria-label={c.label}
                  className={`h-8 w-8 rounded-full ${c.chip} transition-all ${
                    color === c.name ? `ring-2 ring-offset-2 ring-offset-background ${c.ring}` : ""
                  }`}
                />
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Frequency</Label>
              <Select value={frequency} onValueChange={(v) => setFrequency(v as "daily" | "weekly" | "custom")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="custom">Custom days</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {frequency === "weekly" && (
              <div>
                <Label>Times per week</Label>
                <Input
                  type="number"
                  min={1}
                  max={7}
                  value={weeklyTarget}
                  onChange={(e) => setWeeklyTarget(Number(e.target.value) || 1)}
                />
              </div>
            )}
          </div>
          {frequency === "custom" && (
            <div>
              <Label>Days of week</Label>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {["S", "M", "T", "W", "T", "F", "S"].map((label, i) => {
                  const active = customDays.includes(i);
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() =>
                        setCustomDays((prev) =>
                          prev.includes(i)
                            ? prev.filter((x) => x !== i)
                            : [...prev, i].sort(),
                        )
                      }
                      className={`h-9 w-9 rounded-lg text-sm font-semibold transition-colors ${
                        active
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-muted/70"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          <div>
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save}>{editing ? "Save changes" : "Add habit"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function HabitCalendarDialog({ habit, onClose }: { habit: Habit | null; onClose: () => void }) {
  const [monthOffset, setMonthOffset] = useState(0);
  const grid = useMemo(() => {
    if (!habit) return null;
    const base = new Date();
    base.setDate(1);
    base.setMonth(base.getMonth() + monthOffset);
    const y = base.getFullYear();
    const m = base.getMonth();
    const firstDow = new Date(y, m, 1).getDay();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const cells: (string | null)[] = [];
    for (let i = 0; i < firstDow; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push(`${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
    }
    return {
      label: base.toLocaleDateString(undefined, { month: "long", year: "numeric" }),
      cells,
    };
  }, [habit, monthOffset]);

  return (
    <Dialog open={!!habit} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-2xl">{habit?.emoji}</span>
            {habit?.name}
          </DialogTitle>
          <DialogDescription>Green = completed · muted = skipped · empty = missed</DialogDescription>
        </DialogHeader>
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => setMonthOffset((v) => v - 1)}>← Prev</Button>
          <p className="text-sm font-semibold">{grid?.label}</p>
          <Button variant="ghost" size="sm" onClick={() => setMonthOffset((v) => v + 1)}>Next →</Button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-[10px] uppercase text-muted-foreground">
          {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
            <div key={i}>{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {grid?.cells.map((iso, i) => {
            if (!iso) return <div key={i} className="h-8" />;
            const done = habit && habit.history[iso];
            const skip = habit && habit.skips[iso];
            const isToday = iso === todayISO();
            return (
              <div
                key={i}
                className={`grid h-8 place-items-center rounded-md text-xs font-medium ${
                  done
                    ? "bg-success text-success-foreground"
                    : skip
                      ? "bg-muted/60 text-muted-foreground line-through"
                      : isToday
                        ? "border border-primary/40 text-primary"
                        : "bg-muted/30 text-muted-foreground"
                }`}
              >
                {Number(iso.slice(-2))}
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
