import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Reward } from "@/lib/store";

const ICONS = ["🎁", "☕", "🎬", "📚", "🎮", "🍕", "🍫", "🛍️", "🎧", "💤", "🌴", "🧘", "🍩", "🎂"];
const COLORS = [
  { key: "bg-primary-soft text-primary", label: "Primary" },
  { key: "bg-success/15 text-success", label: "Success" },
  { key: "bg-warning/25 text-warning-foreground", label: "Warning" },
  { key: "bg-amber-500/15 text-amber-700 dark:text-amber-300", label: "Amber" },
  { key: "bg-pink-500/15 text-pink-600 dark:text-pink-300", label: "Pink" },
  { key: "bg-sky-500/15 text-sky-700 dark:text-sky-300", label: "Sky" },
];
const CATEGORIES = ["Treat", "Break", "Entertainment", "Purchase", "Experience", "Rest"];

export type RewardFormValues = Omit<Reward, "id" | "createdAt" | "archived">;

export function RewardFormDialog({
  open,
  onOpenChange,
  initial,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: Reward | null;
  onSubmit: (values: RewardFormValues) => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [cost, setCost] = useState(100);
  const [icon, setIcon] = useState("🎁");
  const [color, setColor] = useState(COLORS[0].key);
  const [category, setCategory] = useState<string>("Treat");

  useEffect(() => {
    if (!open) return;
    setTitle(initial?.title ?? "");
    setDescription(initial?.description ?? "");
    setCost(initial?.cost ?? 100);
    setIcon(initial?.icon ?? "🎁");
    setColor(initial?.color ?? COLORS[0].key);
    setCategory(initial?.category ?? "Treat");
  }, [open, initial]);

  const submit = () => {
    if (!title.trim()) return;
    onSubmit({
      title: title.trim(),
      description: description.trim() || undefined,
      cost: Math.max(1, Math.round(cost)),
      icon,
      color,
      category,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit reward" : "New reward"}</DialogTitle>
          <DialogDescription>
            Set a reward you'll unlock by spending XP.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Movie night" />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional details"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Cost (XP)</Label>
              <Input
                type="number"
                min={1}
                value={cost}
                onChange={(e) => setCost(Number(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Icon</Label>
            <div className="flex flex-wrap gap-1.5">
              {ICONS.map((i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setIcon(i)}
                  className={`grid h-9 w-9 place-items-center rounded-lg border text-lg transition-colors ${
                    icon === i ? "border-primary bg-primary-soft" : "border-border hover:bg-muted"
                  }`}
                >
                  {i}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex flex-wrap gap-2">
              {COLORS.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setColor(c.key)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium ${c.key} ${
                    color === c.key ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit}>{initial ? "Save" : "Create"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
