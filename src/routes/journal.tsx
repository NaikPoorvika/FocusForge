import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { BookHeart, Search, Pencil, Trash2, Plus, Tag as TagIcon, CalendarDays } from "lucide-react";
import { PageHeader } from "@/components/ui-bits";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
  addJournalEntry,
  deleteJournalEntry,
  todayISO,
  updateJournalEntry,
  useAppState,
  type JournalEntry,
  type MoodKey,
} from "@/lib/store";
import { toast } from "sonner";

export const Route = createFileRoute("/journal")({
  component: JournalPage,
});

const MOODS: { key: MoodKey; emoji: string; label: string }[] = [
  { key: "great", emoji: "😁", label: "Great" },
  { key: "happy", emoji: "😄", label: "Happy" },
  { key: "good", emoji: "🙂", label: "Good" },
  { key: "okay", emoji: "😐", label: "Okay" },
  { key: "down", emoji: "😔", label: "Down" },
  { key: "tired", emoji: "😴", label: "Tired" },
  { key: "angry", emoji: "😡", label: "Frustrated" },
];

type RangeKey = "all" | "today" | "week" | "month";

function startOfWeekISO(): string {
  const d = new Date();
  const day = d.getDay(); // 0=Sun..6=Sat
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

function startOfMonthISO(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

function JournalPage() {
  const journal = useAppState((s) => s.journal);

  const [search, setSearch] = useState("");
  const [range, setRange] = useState<RangeKey>("all");

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<JournalEntry | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<JournalEntry | null>(null);

  const openNew = () => {
    setEditing(null);
    setEditorOpen(true);
  };
  const openEdit = (entry: JournalEntry) => {
    setEditing(entry);
    setEditorOpen(true);
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const today = todayISO();
    const wStart = startOfWeekISO();
    const mStart = startOfMonthISO();
    return journal
      .filter((j) => {
        if (range === "today") return j.date === today;
        if (range === "week") return j.date >= wStart;
        if (range === "month") return j.date >= mStart;
        return true;
      })
      .filter((j) => {
        if (!q) return true;
        const hay = [
          j.title,
          j.content,
          j.learned,
          j.problems,
          j.wentWell,
          j.improve,
          j.tomorrowPlan,
          (j.tags ?? []).join(" "),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      })
      .sort((a, b) => (a.date === b.date ? b.createdAt.localeCompare(a.createdAt) : b.date.localeCompare(a.date)));
  }, [journal, search, range]);

  return (
    <div className="pb-16">
      <PageHeader
        title="Journal"
        subtitle="Reflect. Learn. Show up tomorrow."
        actions={
          <Button onClick={openNew} className="gap-1">
            <Plus className="h-4 w-4" /> New entry
          </Button>
        }
      />

      {/* Toolbar */}
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search title, content, tags…"
              className="w-64 pl-8"
            />
          </div>
          <Select value={range} onValueChange={(v) => setRange(v as RangeKey)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All time</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This week</SelectItem>
              <SelectItem value="month">This month</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <p className="text-xs text-muted-foreground">
          {filtered.length} {filtered.length === 1 ? "entry" : "entries"}
        </p>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="mt-8 rounded-3xl border border-dashed border-border bg-card/50 py-14 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary">
            <BookHeart className="h-6 w-6" />
          </div>
          <p className="mt-3 text-sm font-semibold">
            {journal.length === 0 ? "No entries yet" : "No entries match those filters"}
          </p>
          <p className="mx-auto mt-1 max-w-sm px-6 text-xs text-muted-foreground">
            Capture what you learned, how you felt, and what's next.
          </p>
          {journal.length === 0 && (
            <Button onClick={openNew} className="mt-4 gap-1">
              <Plus className="h-4 w-4" /> Write your first entry
            </Button>
          )}
        </div>
      ) : (
        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((j) => (
            <EntryCard
              key={j.id}
              entry={j}
              onEdit={() => openEdit(j)}
              onDelete={() => setConfirmDelete(j)}
            />
          ))}
        </div>
      )}

      <EntryDialog
        open={editorOpen}
        entry={editing}
        onOpenChange={(v) => {
          setEditorOpen(v);
          if (!v) setEditing(null);
        }}
      />

      <AlertDialog open={!!confirmDelete} onOpenChange={(v) => !v && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this entry?</AlertDialogTitle>
            <AlertDialogDescription>
              This can't be undone. The entry will be removed from your journal.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmDelete) {
                  deleteJournalEntry(confirmDelete.id);
                  toast.success("Entry deleted");
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

function EntryCard({
  entry,
  onEdit,
  onDelete,
}: {
  entry: JournalEntry;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const mood = MOODS.find((m) => m.key === entry.mood);
  const preview =
    entry.content?.trim() ||
    entry.learned ||
    entry.wentWell ||
    entry.tomorrowPlan ||
    "(no notes)";
  const title = entry.title?.trim() || "Untitled entry";
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="card-hover flex flex-col rounded-2xl border border-border bg-card p-4 shadow-sm"
    >
      <div className="flex items-start gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-muted text-2xl">
          {mood?.emoji ?? "🙂"}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-sm font-semibold">{title}</p>
            <div className="flex shrink-0 items-center gap-1">
              <button
                onClick={onEdit}
                className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Edit entry"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={onDelete}
                className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                aria-label="Delete entry"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
            <CalendarDays className="h-3 w-3" />
            {new Date(entry.date).toLocaleDateString(undefined, {
              weekday: "short",
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
            <span className="mx-1 opacity-40">·</span>
            <span>{mood?.label}</span>
          </div>
        </div>
      </div>

      <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-foreground/90">
        {preview}
      </p>

      {(entry.tags ?? []).length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {(entry.tags ?? []).map((t) => (
            <Badge key={t} variant="secondary" className="gap-1 font-normal">
              <TagIcon className="h-3 w-3" />
              {t}
            </Badge>
          ))}
        </div>
      )}
    </motion.div>
  );
}

function EntryDialog({
  open,
  entry,
  onOpenChange,
}: {
  open: boolean;
  entry: JournalEntry | null;
  onOpenChange: (v: boolean) => void;
}) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(todayISO());
  const [mood, setMood] = useState<MoodKey>("good");
  const [tagsInput, setTagsInput] = useState("");
  const [content, setContent] = useState("");

  // Sync form state when the dialog opens
  useEffect(() => {
    if (!open) return;
    setTitle(entry?.title ?? "");
    setDate(entry?.date ?? todayISO());
    setMood((entry?.mood as MoodKey) ?? "good");
    setTagsInput((entry?.tags ?? []).join(", "));
    setContent(entry?.content ?? "");
  }, [open, entry]);

  const parseTags = () =>
    tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

  const save = () => {
    const tags = parseTags();
    const payload = {
      title: title.trim(),
      date,
      mood,
      tags,
      content,
    };
    if (entry) {
      updateJournalEntry(entry.id, payload);
      toast.success("Entry updated");
    } else {
      addJournalEntry(payload);
      toast.success("Entry saved");
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{entry ? "Edit entry" : "New journal entry"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Field label="Title">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="A short title (optional)"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Date">
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </Field>
            <Field label="Mood">
              <Select value={mood} onValueChange={(v) => setMood(v as MoodKey)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MOODS.map((m) => (
                    <SelectItem key={m.key} value={m.key}>
                      <span className="mr-2">{m.emoji}</span>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <Field label="Tags" hint="Comma separated">
            <Input
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="focus, coding, wins"
            />
          </Field>

          <Field label="Content">
            <Textarea
              className="min-h-[180px] resize-none"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="What happened today? What did you learn?"
            />
          </Field>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={save}>{entry ? "Save changes" : "Save entry"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </label>
        {hint && <span className="text-[10px] text-muted-foreground">{hint}</span>}
      </div>
      {children}
    </div>
  );
}
