import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useMemo, useRef } from "react";
import { Award, Download } from "lucide-react";
import { PageHeader } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import {
  computeStreaks,
  computeStudyStats,
  currentChallengeDay,
  useAppState,
} from "@/lib/store";
import { ACHIEVEMENTS } from "@/lib/achievements";
import { toast } from "sonner";

export const Route = createFileRoute("/certificate")({
  component: CertificatePage,
});

function CertificatePage() {
  const settings = useAppState((s) => s.settings)!;
  const tasks = useAppState((s) => s.tasks);
  const sessions = useAppState((s) => s.sessions);
  const achievements = useAppState((s) => s.achievements);

  const ref = useRef<HTMLDivElement>(null);

  const stats = useMemo(() => {
    const day = currentChallengeDay(settings);
    const pct = Math.round((day / settings.duration) * 100);
    const doneTasks = tasks.filter((t) => t.completed).length;
    const study = computeStudyStats(sessions);
    const { longest } = computeStreaks(tasks);
    const achCount = achievements.length;
    return {
      day,
      pct,
      doneTasks,
      studyHours: (study.total / 60).toFixed(1),
      longest,
      achCount,
    };
  }, [settings, tasks, sessions, achievements]);

  const isComplete = stats.day >= settings.duration;

  const download = () => {
    if (!ref.current) return;
    // Serialize the rendered DOM node as an SVG-wrapped foreignObject → PNG via canvas.
    // Fallback: print the page as PDF.
    window.print();
    toast.success("Use your browser's print → Save as PDF");
  };

  return (
    <div>
      <PageHeader
        title="Completion Certificate"
        subtitle={
          isComplete
            ? "You did it. Here's your certificate."
            : `Available on Day ${settings.duration}. You're on Day ${stats.day}.`
        }
        actions={
          <Button onClick={download}>
            <Download className="mr-2 h-4 w-4" /> Save / Print
          </Button>
        }
      />

      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative mx-auto max-w-3xl overflow-hidden rounded-[2rem] border-4 border-primary/20 bg-gradient-to-br from-card via-primary-soft/40 to-card p-8 shadow-xl print:border-black print:shadow-none sm:p-12"
      >
        <div className="pointer-events-none absolute -left-16 -top-16 h-56 w-56 rounded-full bg-primary/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -right-16 h-64 w-64 rounded-full bg-warning/30 blur-3xl" />

        <div className="relative text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
            <Award className="h-8 w-8" />
          </div>
          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.4em] text-muted-foreground">Certificate of Completion</p>
          <h2 className="mt-2 text-3xl font-black sm:text-4xl">{settings.challengeName}</h2>
          <p className="mt-6 text-sm text-muted-foreground">Awarded to</p>
          <p className="mt-1 font-serif text-4xl font-bold text-primary sm:text-5xl">
            {settings.studentName || "Student"}
          </p>
          <p className="mx-auto mt-4 max-w-md text-sm text-muted-foreground">
            For discipline, focus, and consistency across a {settings.duration}-day self-directed learning challenge.
          </p>

          <div className="mt-8 grid grid-cols-2 gap-4 text-left sm:grid-cols-4">
            <Stat label="Completion" value={`${stats.pct}%`} />
            <Stat label="Tasks done" value={String(stats.doneTasks)} />
            <Stat label="Study hours" value={`${stats.studyHours}h`} />
            <Stat label="Longest streak" value={`${stats.longest} d`} />
          </div>

          <div className="mt-8 flex items-center justify-between text-xs text-muted-foreground">
            <div className="text-left">
              <p className="font-semibold text-foreground">
                {new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}
              </p>
              <p>Date issued</p>
            </div>
            <div className="text-right">
              <p className="font-semibold text-foreground">{stats.achCount} / {ACHIEVEMENTS.length}</p>
              <p>Achievements earned</p>
            </div>
          </div>

          <div className="mt-8 border-t border-dashed border-border pt-4 text-[10px] uppercase tracking-widest text-muted-foreground">
            30-Day Student Success Tracker · Signed by discipline
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card/80 p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-bold">{value}</p>
    </div>
  );
}
