import { motion } from "framer-motion";
import { Lock } from "lucide-react";
import type { Achievement } from "@/lib/achievements";
import { TIER_STYLES } from "@/lib/achievements";
import type { AppState, AchievementUnlock } from "@/lib/store";

export function AchievementBadge({
  achievement,
  state,
  unlock,
}: {
  achievement: Achievement;
  state: AppState;
  unlock?: AchievementUnlock;
}) {
  const { unlocked, progress, label } = achievement.evaluate(state);
  const Icon = achievement.icon;
  const tier = TIER_STYLES[achievement.tier];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative overflow-hidden rounded-2xl border p-5 shadow-sm ${
        unlocked
          ? `border-border bg-card ${tier.glow} shadow-md`
          : "border-dashed border-border bg-card/50"
      }`}
    >
      {unlocked && (
        <motion.div
          aria-hidden
          initial={{ x: "-120%" }}
          animate={{ x: "160%" }}
          transition={{ duration: 2, repeat: Infinity, repeatDelay: 4, ease: "easeInOut" }}
          className="pointer-events-none absolute -inset-y-6 -left-10 w-16 rotate-12 bg-gradient-to-r from-transparent via-white/25 to-transparent"
        />
      )}
      <div className="flex items-start justify-between gap-3">
        <div
          className={`grid h-12 w-12 place-items-center rounded-xl ring-2 ${tier.ring} ${
            unlocked ? tier.chip : "bg-muted text-muted-foreground"
          }`}
        >
          {unlocked ? <Icon className="h-6 w-6" /> : <Lock className="h-5 w-5" />}
        </div>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${tier.chip}`}>
          {tier.label}
        </span>
      </div>
      <h4 className={`mt-3 text-sm font-semibold ${unlocked ? "" : "text-muted-foreground"}`}>
        {achievement.title}
      </h4>
      <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{achievement.description}</p>
      {unlocked ? (
        <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
          <span className="font-semibold text-success">Unlocked</span>
          {unlock?.unlockedAt && (
            <span>{new Date(unlock.unlockedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
          )}
        </div>
      ) : (
        <div className="mt-3">
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.round(progress * 100)}%` }}
              className="h-full rounded-full bg-primary/70"
            />
          </div>
          {label && <p className="mt-1 text-[10px] text-muted-foreground">{label}</p>}
        </div>
      )}
      <p className="mt-2 text-[10px] font-medium text-primary">+{achievement.xpReward} XP on unlock</p>
    </motion.div>
  );
}
