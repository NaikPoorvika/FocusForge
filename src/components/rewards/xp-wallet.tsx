import { motion } from "framer-motion";
import { Coins, Sparkles } from "lucide-react";
import { levelFromXp } from "@/lib/achievements";

export function XpWallet({
  availableXp,
  lifetimeXp,
  spentXp,
  compact = false,
}: {
  availableXp: number;
  lifetimeXp: number;
  spentXp: number;
  compact?: boolean;
}) {
  const { level, progress, nextXp, prevXp } = levelFromXp(lifetimeXp);
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`gradient-primary relative overflow-hidden rounded-3xl border border-primary/20 p-6 text-primary-foreground shadow-xl shadow-primary/20 ${
        compact ? "" : ""
      }`}
    >
      <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest opacity-90">
            <Coins className="h-4 w-4" /> XP Wallet
          </div>
          <p className="mt-1 text-4xl font-bold leading-none">{availableXp.toLocaleString()}</p>
          <p className="mt-1 text-xs opacity-90">available to spend</p>
        </div>
        <div className="grid grid-cols-3 gap-3 text-xs">
          <Stat label="Lifetime" value={lifetimeXp.toLocaleString()} />
          <Stat label="Spent" value={spentXp.toLocaleString()} />
          <Stat label="Level" value={String(level)} icon />
        </div>
      </div>
      <div className="relative mt-5">
        <div className="mb-1 flex items-center justify-between text-[11px] opacity-90">
          <span>Level {level}</span>
          <span>
            {lifetimeXp - prevXp} / {nextXp - prevXp} to L{level + 1}
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-white/20">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.round(progress * 100)}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="h-full rounded-full bg-white"
          />
        </div>
      </div>
    </motion.div>
  );
}

function Stat({ label, value, icon }: { label: string; value: string; icon?: boolean }) {
  return (
    <div className="rounded-xl bg-white/15 px-3 py-2 text-center">
      <p className="flex items-center justify-center gap-1 text-[10px] uppercase tracking-wider opacity-90">
        {icon && <Sparkles className="h-3 w-3" />} {label}
      </p>
      <p className="mt-0.5 text-lg font-bold leading-none">{value}</p>
    </div>
  );
}
