import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Plus, ExternalLink, Trash2, FileText, Youtube, Github, Link as LinkIcon, StickyNote, Briefcase, Search } from "lucide-react";
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
import { addResource, deleteResource, useExtras, type Resource } from "@/lib/extras-store";
import { toast } from "sonner";

export const Route = createFileRoute("/resources")({
  component: ResourcesPage,
});

const TYPES: { value: Resource["type"]; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: "link", label: "Link", icon: LinkIcon },
  { value: "pdf", label: "PDF", icon: FileText },
  { value: "note", label: "Note", icon: StickyNote },
  { value: "github", label: "GitHub", icon: Github },
  { value: "youtube", label: "YouTube", icon: Youtube },
  { value: "interview", label: "Interview", icon: Briefcase },
];

function typeMeta(t: Resource["type"]) {
  return TYPES.find((x) => x.value === t) ?? TYPES[0];
}

function ResourcesPage() {
  const resources = useExtras((s) => s.resources);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | Resource["type"]>("all");

  const [form, setForm] = useState<{ title: string; url: string; type: Resource["type"]; tags: string; notes: string }>({
    title: "",
    url: "",
    type: "link",
    tags: "",
    notes: "",
  });

  const filtered = useMemo(() => {
    let base = resources;
    if (filter !== "all") base = base.filter((r) => r.type === filter);
    if (q.trim()) {
      const s = q.toLowerCase();
      base = base.filter(
        (r) =>
          r.title.toLowerCase().includes(s) ||
          r.notes?.toLowerCase().includes(s) ||
          r.tags.some((t) => t.toLowerCase().includes(s)),
      );
    }
    return base;
  }, [resources, filter, q]);

  const submit = () => {
    if (!form.title.trim()) {
      toast.error("Title is required");
      return;
    }
    addResource({
      title: form.title.trim(),
      url: form.url.trim() || undefined,
      type: form.type,
      tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
      notes: form.notes.trim() || undefined,
    });
    setForm({ title: "", url: "", type: "link", tags: "", notes: "" });
    setOpen(false);
    toast.success("Resource saved");
  };

  return (
    <div>
      <PageHeader
        title="Resources"
        subtitle="A single home for every link, PDF, video, and note that helps you learn."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" /> Add resource
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Save a resource</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Title</Label>
                  <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>URL (optional)</Label>
                  <Input placeholder="https://…" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Type</Label>
                    <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as Resource["type"] })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Tags (comma-sep)</Label>
                    <Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="dsa, react" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Notes</Label>
                  <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={submit}>Save</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search resources…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
        </div>
        <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
          <SelectTrigger className="sm:w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border bg-card/50 py-14 text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-primary/10 text-primary">
            <LinkIcon className="h-7 w-7" />
          </div>
          <p className="mt-4 text-base font-semibold">No resources yet</p>
          <p className="mx-auto mt-1 max-w-sm px-6 text-sm text-muted-foreground">
            Save your favorite links, PDFs, YouTube videos, GitHub repos, and interview material in one place.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((r) => {
            const meta = typeMeta(r.type);
            const Icon = meta.icon;
            return (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="card-hover flex items-start gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm"
              >
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="truncate text-sm font-semibold">{r.title}</p>
                    <button
                      onClick={() => {
                        deleteResource(r.id);
                        toast.success("Deleted");
                      }}
                      className="rounded-md p-1 text-muted-foreground hover:bg-muted"
                      aria-label="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground capitalize">{r.type}</p>
                  {r.notes && <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{r.notes}</p>}
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    {r.tags.map((t) => (
                      <span key={t} className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                        #{t}
                      </span>
                    ))}
                  </div>
                  {r.url && (
                    <a
                      href={r.url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                    >
                      Open <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
