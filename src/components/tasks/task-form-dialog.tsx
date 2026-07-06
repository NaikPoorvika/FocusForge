import { useEffect, useState } from "react";
import { X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DEFAULT_CATEGORIES,
} from "@/lib/task-constants";
import {
  addTask,
  addCustomCategory,
  updateTask,
  useAppState,
  type Recurrence,
  type Task,
} from "@/lib/store";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing?: Task | null;
  defaultDate: string;
}

const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

export function TaskFormDialog({ open, onOpenChange, editing, defaultDate }: Props) {
  const customCategories = useAppState((s) => s.customCategories);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string>("DSA");
  const [customCategoryName, setCustomCategoryName] = useState("");
  const [showCustom, setShowCustom] = useState(false);
  const [priority, setPriority] = useState<Task["priority"]>("medium");
  const [estAmount, setEstAmount] = useState<string>("");
  const [estUnit, setEstUnit] = useState<"m" | "h">("m");
  const [dueTime, setDueTime] = useState("");
  const [date, setDate] = useState(defaultDate);
  const [deadlineDate, setDeadlineDate] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [recKind, setRecKind] = useState<Recurrence["kind"]>("none");
  const [recDays, setRecDays] = useState<number[]>([]);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setTitle(editing.title);
      setDescription(editing.description ?? "");
      setCategory(editing.category);
      setShowCustom(false);
      setPriority(editing.priority);
      if (editing.estimatedMinutes && editing.estimatedMinutes % 60 === 0) {
        setEstAmount(String(editing.estimatedMinutes / 60));
        setEstUnit("h");
      } else {
        setEstAmount(editing.estimatedMinutes ? String(editing.estimatedMinutes) : "");
        setEstUnit("m");
      }
      setDueTime(editing.dueTime ?? "");
      setDate(editing.date);
      setDeadlineDate(editing.deadlineDate ?? "");
      setTags(editing.tags ?? []);
      setNotes(editing.notes ?? "");
      setRecKind(editing.recurrence?.kind ?? "none");
      setRecDays(editing.recurrence?.weekdays ?? []);
    } else {
      setTitle("");
      setDescription("");
      setCategory("DSA");
      setShowCustom(false);
      setCustomCategoryName("");
      setPriority("medium");
      setEstAmount("");
      setEstUnit("m");
      setDueTime("");
      setDate(defaultDate);
      setDeadlineDate("");
      setTags([]);
      setTagInput("");
      setNotes("");
      setRecKind("none");
      setRecDays([]);
    }
  }, [open, editing, defaultDate]);

  const addTag = () => {
    const v = tagInput.trim();
    if (!v) return;
    if (!tags.includes(v)) setTags([...tags, v]);
    setTagInput("");
  };

  const removeTag = (t: string) => setTags(tags.filter((x) => x !== t));

  const toggleDay = (d: number) =>
    setRecDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));

  const save = () => {
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    let finalCategory = category;
    if (showCustom && customCategoryName.trim()) {
      finalCategory = customCategoryName.trim();
      addCustomCategory(finalCategory);
    }
    const estimatedMinutes = estAmount
      ? Math.max(0, Math.round(Number(estAmount) * (estUnit === "h" ? 60 : 1)))
      : undefined;

    const recurrence: Recurrence | undefined =
      recKind === "none"
        ? undefined
        : { kind: recKind, weekdays: recKind === "custom" ? recDays : undefined };

    if (editing) {
      updateTask(editing.id, {
        title: title.trim(),
        description: description.trim() || undefined,
        category: finalCategory,
        priority,
        estimatedMinutes,
        dueTime: dueTime || undefined,
        date,
        deadlineDate: deadlineDate || undefined,
        tags,
        notes: notes.trim() || undefined,
        recurrence,
      });
      toast.success("Task updated");
    } else {
      addTask({
        title: title.trim(),
        description: description.trim() || undefined,
        category: finalCategory,
        priority,
        estimatedMinutes,
        dueTime: dueTime || undefined,
        date,
        deadlineDate: deadlineDate || undefined,
        tags,
        notes: notes.trim() || undefined,
        recurrence,
      });
      toast.success("Task added");
    }
    onOpenChange(false);
  };

  const allCategories = [...DEFAULT_CATEGORIES, ...customCategories];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit task" : "New task"}</DialogTitle>
          <DialogDescription>
            Plan a focused block for your challenge day.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="t-title">Title *</Label>
            <Input
              id="t-title"
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) save();
              }}
              placeholder="e.g. Solve 5 arrays problems"
            />
          </div>

          <div>
            <Label htmlFor="t-desc">Description</Label>
            <Textarea
              id="t-desc"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional details"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Category</Label>
              {showCustom ? (
                <div className="flex gap-2">
                  <Input
                    value={customCategoryName}
                    onChange={(e) => setCustomCategoryName(e.target.value)}
                    placeholder="Custom name"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowCustom(false)}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <Select
                  value={category}
                  onValueChange={(v) => {
                    if (v === "__custom__") setShowCustom(true);
                    else setCategory(v);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {allCategories.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                    <SelectItem value="__custom__">+ Custom category…</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
            <div>
              <Label>Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as Task["priority"])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Estimated time</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min={0}
                  value={estAmount}
                  onChange={(e) => setEstAmount(e.target.value)}
                  placeholder="0"
                />
                <Select value={estUnit} onValueChange={(v) => setEstUnit(v as "m" | "h")}>
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="m">min</SelectItem>
                    <SelectItem value="h">hr</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="t-due">Due time</Label>
              <Input
                id="t-due"
                type="time"
                value={dueTime}
                onChange={(e) => setDueTime(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="t-date">Date</Label>
              <Input
                id="t-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="t-deadline">Deadline</Label>
              <Input
                id="t-deadline"
                type="date"
                value={deadlineDate}
                onChange={(e) => setDeadlineDate(e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label>Tags</Label>
            <div className="flex flex-wrap items-center gap-2 rounded-md border border-input bg-background px-2 py-1.5">
              {tags.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary"
                >
                  {t}
                  <button type="button" onClick={() => removeTag(t)}>
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              <input
                className="flex-1 min-w-[100px] bg-transparent text-sm outline-none"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTag();
                  } else if (e.key === "Backspace" && !tagInput && tags.length) {
                    removeTag(tags[tags.length - 1]);
                  }
                }}
                placeholder="Add tag…"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="t-notes">Notes</Label>
            <Textarea
              id="t-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes"
            />
          </div>

          <div>
            <Label>Recurrence</Label>
            <Select value={recKind} onValueChange={(v) => setRecKind(v as Recurrence["kind"])}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Does not repeat</SelectItem>
                <SelectItem value="daily">Every day</SelectItem>
                <SelectItem value="weekdays">Weekdays</SelectItem>
                <SelectItem value="weekly">Every week</SelectItem>
                <SelectItem value="custom">Custom…</SelectItem>
              </SelectContent>
            </Select>
            {recKind === "custom" && (
              <div className="mt-2 flex gap-1">
                {WEEKDAY_LABELS.map((l, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => toggleDay(i)}
                    className={`h-9 w-9 rounded-full text-xs font-semibold transition-colors ${
                      recDays.includes(i)
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/70"
                    }`}
                  >
                    {l}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={save}>{editing ? "Save changes" : "Add task"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
