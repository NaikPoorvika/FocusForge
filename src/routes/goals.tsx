import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Target,
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Check,
  CalendarDays,
  Flag,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { EmptyState, PageHeader } from "@/components/ui-bits";
import {
  addGoal,
  completeGoal,
  deleteGoal,
  reopenGoal,
  updateGoal,
  updateGoalProgress,
  useAppState,
  type Goal,
} from "@/lib/store";
import { priorityMeta } from "@/lib/task-constants";
import { toast } from "sonner";

export const Route = createFileRoute("/goals")({
  component: GoalsPage,
});

function goalPct(g: Goal) {
  return Math.min(100, Math.round((g.progress / Math.max(1, g.target || 100)) * 100));
}

function isCompleted(g: Goal) {
  return !!g.completed || !!g.completedAt;
}


function GoalsPage() {
  const goals = useAppState((s) => s.goals);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Goal | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Goal | null>(null);

  const ordered = useMemo(
    () => goals.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [goals],
  );

  return (
    <div className="pb-16">
      <PageHeader
        title="Monthly Goals"
        subtitle="Set targets. Chip away. Celebrate."
        actions={
          <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
            <Plus className="mr-1 h-4 w-4" /> New goal
          </Button>
        }
      />

      {goals.length === 0 ? (
        <EmptyState
          icon={Target}
          title="No goals yet"
          description="Add your first goal — big or small, it all counts."
          action={<Button onClick={() => setFormOpen(true)}>Add your first goal</Button>}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <AnimatePresence initial={false}>
            {ordered.map((g) => (
              <GoalCard
                key={g.id}
                goal={g}
                onEdit={() => { setEditing(g); setFormOpen(true); }}
                onDelete={() => setConfirmDelete(g)}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      <GoalFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editing={editing}
      />

      <AlertDialog open={!!confirmDelete} onOpenChange={(v) => !v && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this goal?</AlertDialogTitle>
            <AlertDialogDescription>
              "{confirmDelete?.title}" will be removed. Linked tasks will be unlinked.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (confirmDelete) {
                  deleteGoal(confirmDelete.id);
                  toast.success("Goal deleted");
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

function GoalCard({
  goal,
  onEdit,
  onDelete,
}: {
  goal: Goal;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const pct = goalPct(goal);
  const completed = isCompleted(goal);
  const dateISO = goal.targetDate ?? goal.deadline;
  const days = dateISO
    ? Math.ceil((new Date(dateISO + "T23:59:59").getTime() - Date.now()) / 86400000)
    : null;
  const overdue = days !== null && days < 0 && !completed;
  const status = completed ? "Completed" : overdue ? "Overdue" : "Active";
  const priority = goal.priority ? priorityMeta(goal.priority) : null;

  // Local slider value so the drag feels smooth; commit to store on change end.
  const [sliderValue, setSliderValue] = useState<number>(pct);
  useEffect(() => setSliderValue(pct), [pct]);

  const commitProgress = (value: number) => {
    const clamped = Math.max(0, Math.min(100, Math.round(value)));
    const target = goal.target || 100;
    const nextProgress = Math.round((clamped / 100) * target);
    const wasCompleted = completed;

    updateGoalProgress(goal.id, nextProgress);

    if (clamped >= 100 && !wasCompleted) {
      completeGoal(goal.id);
      toast.success("Goal completed 🎉");
    } else if (clamped < 100 && wasCompleted) {
      reopenGoal(goal.id);
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className={`card-hover group relative overflow-hidden rounded-2xl border p-5 shadow-sm ${
        completed ? "border-success/40 bg-success/5" : "border-border bg-card"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-semibold">{goal.title}</h3>
          {goal.description && (
            <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{goal.description}</p>
          )}
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
            {!completed ? (
              <DropdownMenuItem
                onClick={() => {
                  completeGoal(goal.id);
                  toast.success("Goal completed 🎉");
                }}
              >
                <Check className="mr-2 h-4 w-4" /> Mark complete
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onClick={() => reopenGoal(goal.id)}>
                <RotateCcw className="mr-2 h-4 w-4" /> Reopen
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={onDelete}>
              <Trash2 className="mr-2 h-4 w-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">

        {priority && (
          <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${priority.badge}`}>
            <Flag className="h-3 w-3" /> {priority.label}
          </span>
        )}
        <span
          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${
            status === "Completed"
              ? "border-success/25 bg-success/10 text-success"
              : status === "Overdue"
                ? "border-destructive/30 bg-destructive/10 text-destructive"
                : "border-primary/25 bg-primary/10 text-primary"
          }`}
        >
          {status}
        </span>
      </div>

      <div className="mt-4">
        <div className="mb-1.5 flex items-baseline justify-between text-xs">
          <span className="font-semibold text-muted-foreground">Progress</span>
          <span className="font-bold text-primary">{sliderValue}%</span>
        </div>
        <Slider
          value={[sliderValue]}
          onValueChange={(v) => setSliderValue(v[0] ?? 0)}
          onValueCommit={(v) => commitProgress(v[0] ?? 0)}
          min={0}
          max={100}
          step={1}
          aria-label={`Progress for ${goal.title}`}
        />
      </div>

      <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          {dateISO && !completed && (
            <>
              <CalendarDays className="h-3.5 w-3.5" />
              <span>
                {new Date(dateISO).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })}
                {days !== null && (
                  <span className={overdue ? "ml-1 text-destructive" : "ml-1"}>
                    ({overdue ? `${-days}d overdue` : `${days}d left`})
                  </span>
                )}
              </span>
            </>
          )}
          {completed && (
            <span className="text-success">
              Completed{goal.completedAt ? " " + new Date(goal.completedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : ""}
            </span>
          )}
        </div>
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
          +{goal.xpReward ?? 100} XP
        </span>
      </div>
    </motion.div>
  );
}

function GoalFormDialog({
  open,
  onOpenChange,
  editing,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: Goal | null;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Goal["priority"]>("medium");
  const [targetDate, setTargetDate] = useState("");
  const [xpReward, setXpReward] = useState(100);

  const defaultDeadline = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return d.toISOString().slice(0, 10);
  }, []);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setTitle(editing.title);
      setDescription(editing.description ?? "");
      setPriority(editing.priority ?? "medium");
      setTargetDate(editing.targetDate ?? editing.deadline ?? "");
      setXpReward(editing.xpReward ?? 100);
    } else {
      setTitle("");
      setDescription("");
      setPriority("medium");
      setTargetDate(defaultDeadline);
      setXpReward(100);
    }
  }, [open, editing, defaultDeadline]);

  const save = () => {
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    const payload = {
      title: title.trim(),
      description: description.trim() || undefined,
      priority,
      targetDate: targetDate || undefined,
      deadline: targetDate || undefined,
      xpReward: Math.max(0, xpReward || 0),
    };
    if (editing) {
      updateGoal(editing.id, payload);
      toast.success("Goal updated");
    } else {
      addGoal({ ...payload, target: 100, progress: 0 });
      toast.success("Goal created");
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit goal" : "New goal"}</DialogTitle>
          <DialogDescription>Something concrete and measurable.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="goal-title">Title *</Label>
            <Input
              id="goal-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Solve 300 DSA problems"
              autoFocus
            />
          </div>
          <div>
            <Label htmlFor="goal-desc">Description</Label>
            <Textarea
              id="goal-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Optional context or plan"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="goal-priority">Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as Goal["priority"])}>
                <SelectTrigger id="goal-priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="goal-target-date">Target date</Label>
              <Input
                id="goal-target-date"
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="goal-xp">XP reward</Label>
            <Input
              id="goal-xp"
              type="number"
              min={0}
              value={xpReward}
              onChange={(e) => setXpReward(Number(e.target.value) || 0)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save}>{editing ? "Save changes" : "Create goal"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
