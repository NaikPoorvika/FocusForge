import { motion } from "framer-motion";
import { CheckCircle2, Circle, ListChecks, Percent, Clock, Timer } from "lucide-react";
import { formatEstimated } from "@/lib/task-constants";
import type { Task } from "@/lib/store";

export function DailySummary({ tasks }: { tasks: Task[] }) {
  const active = tasks.filter((t) => !t.archived);
  const total = active.length;
  const completed = active.filter((t) => t.completed).length;
  const pending = total - completed;
  const pct = total === 0 ? 0 : Math.round((completed / total) * 100);
  const estTotal = active.reduce((n, t) => n + (t.estimatedMinutes ?? 0), 0);
  const estDone = active
    .filter((t) => t.completed)
    .reduce((n, t) => n + (t.estimatedMinutes ?? 0), 0);

  const cards = [
    { icon: ListChecks, label: "Total", value: `${total}`, tone: "primary" },
    { icon: CheckCircle2, label: "Completed", value: `${completed}`, tone: "success" },
    { icon: Circle, label: "Pending", value: `${pending}`, tone: "warning" },
    { icon: Percent, label: "Progress", value: `${pct}%`, tone: "primary" },
    { icon: Clock, label: "Est. study", value: formatEstimated(estTotal) || "0m", tone: "muted" },
    { icon: Timer, label: "Done study", value: formatEstimated(estDone) || "0m", tone: "success" },
  ];

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-baseline justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Today's progress
            </p>
            <p className="mt-1 text-2xl font-bold">
              {completed}/{total || 0} <span className="text-base font-medium text-muted-foreground">tasks done</span>
            </p>
          </div>
          <p className="text-3xl font-bold text-primary">{pct}%</p>
        </div>
        <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-muted">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-primary to-emerald-500"
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {cards.map((c, i) => {
          const tone =
            c.tone === "success"
              ? "bg-success/15 text-success"
              : c.tone === "warning"
                ? "bg-amber-500/15 text-amber-600 dark:text-amber-300"
                : c.tone === "muted"
                  ? "bg-muted text-muted-foreground"
                  : "bg-primary/10 text-primary";
          return (
            <motion.div
              key={c.label}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="rounded-2xl border border-border bg-card p-4 shadow-sm"
            >
              <div className={`grid h-9 w-9 place-items-center rounded-lg ${tone}`}>
                <c.icon className="h-4 w-4" />
              </div>
              <p className="mt-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                {c.label}
              </p>
              <p className="mt-0.5 text-lg font-bold">{c.value}</p>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
