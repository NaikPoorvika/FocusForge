import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Plus, Code2, CheckCircle2, Circle, Trash2, ExternalLink } from "lucide-react";
import { PageHeader } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  addCodingProblem,
  deleteCodingProblem,
  updateCodingProblem,
  useExtras,
  type CodingProblem,
} from "@/lib/extras-store";
import { toast } from "sonner";

export const Route = createFileRoute("/coding")({
  component: CodingPage,
});

const PLATFORMS: CodingProblem["platform"][] = [
  "LeetCode",
  "HackerRank",
  "CodeChef",
  "Codeforces",
  "GeeksforGeeks",
  "AtCoder",
  "Other",
];

const DIFF_COLORS: Record<CodingProblem["difficulty"], string> = {
  Easy: "bg-success/15 text-success",
  Medium: "bg-warning/25 text-warning-foreground",
  Hard: "bg-destructive/15 text-destructive",
};

function CodingPage() {
  const problems = useExtras((s) => s.coding);
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<"all" | "solved" | "unsolved">("all");
  const [platformFilter, setPlatformFilter] = useState<"all" | CodingProblem["platform"]>("all");

  const [form, setForm] = useState<{
    name: string;
    url: string;
    platform: CodingProblem["platform"];
    difficulty: CodingProblem["difficulty"];
    topic: string;
    timeMinutes: string;
    notes: string;
    solved: boolean;
  }>({
    name: "",
    url: "",
    platform: "LeetCode",
    difficulty: "Easy",
    topic: "",
    timeMinutes: "",
    notes: "",
    solved: false,
  });

  const filtered = useMemo(() => {
    let base = problems;
    if (filter === "solved") base = base.filter((p) => p.solved);
    else if (filter === "unsolved") base = base.filter((p) => !p.solved);
    if (platformFilter !== "all") base = base.filter((p) => p.platform === platformFilter);
    return base;
  }, [problems, filter, platformFilter]);

  const stats = useMemo(() => {
    const solved = problems.filter((p) => p.solved).length;
    const byDiff = { Easy: 0, Medium: 0, Hard: 0 } as Record<CodingProblem["difficulty"], number>;
    problems.filter((p) => p.solved).forEach((p) => (byDiff[p.difficulty] += 1));
    return { solved, total: problems.length, byDiff };
  }, [problems]);

  const submit = () => {
    if (!form.name.trim()) return toast.error("Problem name required");
    addCodingProblem({
      name: form.name.trim(),
      url: form.url.trim() || undefined,
      platform: form.platform,
      difficulty: form.difficulty,
      topic: form.topic.trim() || "General",
      timeMinutes: form.timeMinutes ? Number(form.timeMinutes) : undefined,
      notes: form.notes.trim() || undefined,
      solved: form.solved,
    });
    setForm({ name: "", url: "", platform: "LeetCode", difficulty: "Easy", topic: "", timeMinutes: "", notes: "", solved: false });
    setOpen(false);
    toast.success("Problem tracked");
  };

  return (
    <div>
      <PageHeader
        title="Coding Challenges"
        subtitle="Track every problem you solve across platforms."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" /> Track problem</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader><DialogTitle>Add coding problem</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Problem name</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Two Sum" />
                </div>
                <div className="space-y-1.5">
                  <Label>URL (optional)</Label>
                  <Input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://…" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Platform</Label>
                    <Select value={form.platform} onValueChange={(v) => setForm({ ...form, platform: v as CodingProblem["platform"] })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {PLATFORMS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Difficulty</Label>
                    <Select value={form.difficulty} onValueChange={(v) => setForm({ ...form, difficulty: v as CodingProblem["difficulty"] })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Easy">Easy</SelectItem>
                        <SelectItem value="Medium">Medium</SelectItem>
                        <SelectItem value="Hard">Hard</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Topic</Label>
                    <Input value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} placeholder="Arrays" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Time (min)</Label>
                    <Input type="number" value={form.timeMinutes} onChange={(e) => setForm({ ...form, timeMinutes: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Notes</Label>
                  <Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.solved} onChange={(e) => setForm({ ...form, solved: e.target.checked })} />
                  Mark as solved
                </label>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={submit}>Save</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="grid gap-3 sm:grid-cols-4">
        {[
          { label: "Total tracked", value: stats.total },
          { label: "Solved", value: stats.solved },
          { label: "Easy solved", value: stats.byDiff.Easy },
          { label: "Medium+Hard solved", value: stats.byDiff.Medium + stats.byDiff.Hard },
        ].map((s, i) => (
          <div key={i} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{s.label}</p>
            <p className="mt-1 text-2xl font-bold">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="my-5 flex flex-wrap gap-2">
        <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="solved">Solved</SelectItem>
            <SelectItem value="unsolved">Unsolved</SelectItem>
          </SelectContent>
        </Select>
        <Select value={platformFilter} onValueChange={(v) => setPlatformFilter(v as typeof platformFilter)}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All platforms</SelectItem>
            {PLATFORMS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border bg-card/50 py-14 text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-primary/10 text-primary">
            <Code2 className="h-7 w-7" />
          </div>
          <p className="mt-4 text-base font-semibold">No problems yet</p>
          <p className="mx-auto mt-1 max-w-sm px-6 text-sm text-muted-foreground">
            Log every problem you attempt across LeetCode, Codeforces, and more.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((p) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm"
            >
              <button
                onClick={() => {
                  updateCodingProblem(p.id, { solved: !p.solved });
                  if (!p.solved) toast.success("🎯 Solved!");
                }}
                className="mt-0.5"
                aria-label="Toggle solved"
              >
                {p.solved ? (
                  <CheckCircle2 className="h-6 w-6 text-success" />
                ) : (
                  <Circle className="h-6 w-6 text-muted-foreground" />
                )}
              </button>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className={`text-sm font-semibold ${p.solved ? "line-through text-muted-foreground" : ""}`}>{p.name}</p>
                  <button
                    onClick={() => { deleteCodingProblem(p.id); toast.success("Deleted"); }}
                    className="rounded-md p-1 text-muted-foreground hover:bg-muted"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${DIFF_COLORS[p.difficulty]}`}>
                    {p.difficulty}
                  </span>
                  <span className="rounded-full border border-border px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                    {p.platform}
                  </span>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                    {p.topic}
                  </span>
                  {p.timeMinutes ? (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                      {p.timeMinutes}m
                    </span>
                  ) : null}
                </div>
                {p.notes && <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{p.notes}</p>}
                {p.url && (
                  <a href={p.url} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                    Open <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
