import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Trophy, Lock } from "lucide-react";
import { PageHeader } from "@/components/ui-bits";
import { ACHIEVEMENTS, TIER_STYLES, levelFromXp } from "@/lib/achievements";
import { useAppState } from "@/lib/store";

export const Route = createFileRoute("/achievements")({
  component: AchievementsPage,
});

function AchievementsPage() {
  const state = useAppState((s) => s);
  const unlocked = new Set(state.achievements.map((a) => a.id));
  const xp = state.xp ?? 0;
  const lvl = levelFromXp(xp);
  const totalXpFromAch = ACHIEVEMENTS.filter((a) => unlocked.has(a.id)).reduce((n, a) => n + a.xpReward, 0);

  return (
    <div>
      <PageHeader title="Achievements" subtitle="Earn badges by pushing your daily consistency." />

      <div className="mb-6 grid gap-3 sm:grid-cols-4">
        <Stat label="Level" value={`Lv ${lvl.level}`} accent />
        <Stat label="Lifetime XP" value={xp.toLocaleString()} />
        <Stat label="Unlocked" value={`${unlocked.size} / ${ACHIEVEMENTS.length}`} />
        <Stat label="XP from badges" value={totalXpFromAch.toLocaleString()} />
      </div>

      <div className="mb-6 rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>Progress to Lv {lvl.level + 1}</span>
          <span>
            {xp - lvl.prevXp} / {lvl.nextXp - lvl.prevXp} XP
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${lvl.progress * 100}%` }}
            transition={{ duration: 0.8 }}
            className="gradient-primary h-full rounded-full"
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {ACHIEVEMENTS.map((a) => {
          const isOn = unlocked.has(a.id);
          const evalRes = a.evaluate(state);
          const tier = TIER_STYLES[a.tier];
          const Icon = a.icon;
          return (
            <motion.div
              key={a.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className={`relative overflow-hidden rounded-2xl border p-4 shadow-sm transition-all ${
                isOn ? `border-transparent bg-card ring-2 ${tier.ring} ${tier.glow} shadow-lg` : "border-border bg-card/60"
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${
                    isOn ? tier.chip : "bg-muted text-muted-foreground"
                  }`}
                >
                  {isOn ? <Icon className="h-6 w-6" /> : <Lock className="h-5 w-5" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-bold">{a.title}</p>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${tier.chip}`}>
                      {tier.label}
                    </span>
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{a.description}</p>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>+{a.xpReward} XP</span>
                    {evalRes.label && <span>{evalRes.label}</span>}
                  </div>
                  <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full rounded-full ${isOn ? "bg-success" : "gradient-primary"}`}
                      style={{ width: `${Math.round(evalRes.progress * 100)}%` }}
                    />
                  </div>
                </div>
              </div>
              {isOn && (
                <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-primary/20 blur-2xl" />
              )}
            </motion.div>
          );
        })}
      </div>

      <div className="mt-8 flex items-center gap-2 rounded-2xl border border-border bg-card/60 p-4 text-sm text-muted-foreground">
        <Trophy className="h-4 w-4 text-primary" />
        Achievements unlock automatically as you complete tasks, keep habits, focus, and study.
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${accent ? "border-primary/40 bg-primary/5" : "border-border bg-card"}`}>
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${accent ? "text-primary" : ""}`}>{value}</p>
    </div>
  );
}
