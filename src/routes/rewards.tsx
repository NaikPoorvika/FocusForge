import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Gift,
  Plus,
  Coins,
  Sparkles,
  Check,
  Trash2,
  History as HistoryIcon,
  Trophy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PageHeader, EmptyState } from "@/components/ui-bits";
import {
  addReward,
  archiveReward,
  claimRedemption,
  deleteRedemption,
  deleteReward,
  
  redeemReward,
  setState,
  updateReward,
  useAppState,
  type Reward,
} from "@/lib/store";
import { ACHIEVEMENTS } from "@/lib/achievements";
import { RewardCard } from "@/components/rewards/reward-card";
import { RewardFormDialog, type RewardFormValues } from "@/components/rewards/reward-form-dialog";
import { AchievementBadge } from "@/components/rewards/achievement-badge";
import { XpWallet } from "@/components/rewards/xp-wallet";
import { bumpDailyXpSpent } from "@/lib/xp-sync";
import { useCurrentUser } from "@/hooks/use-current-user";
import { toast } from "sonner";
import { Confetti } from "@/components/tasks/confetti";

export const Route = createFileRoute("/rewards")({
  component: RewardsPage,
});

const DEFAULT_REWARDS: Omit<Reward, "id" | "createdAt" | "archived">[] = [
  { title: "Coffee break", description: "A relaxed cafe break.", cost: 100, icon: "☕", color: "bg-amber-500/15 text-amber-700 dark:text-amber-300", category: "Break" },
  { title: "Movie night", description: "Pick a movie and unwind.", cost: 300, icon: "🎬", color: "bg-primary-soft text-primary", category: "Entertainment" },
  { title: "New book", description: "Add a book to your library.", cost: 500, icon: "📚", color: "bg-sky-500/15 text-sky-700 dark:text-sky-300", category: "Purchase" },
  { title: "30-min gaming", description: "Guilt-free play session.", cost: 200, icon: "🎮", color: "bg-pink-500/15 text-pink-600 dark:text-pink-300", category: "Entertainment" },
  { title: "Skip a chore", description: "Delegate or postpone once.", cost: 250, icon: "🧘", color: "bg-success/15 text-success", category: "Rest" },
  { title: "Treat yourself", description: "Buy something small.", cost: 750, icon: "🛍️", color: "bg-warning/25 text-warning-foreground", category: "Purchase" },
];

function RewardsPage() {
  const rewards = useAppState((s) => s.rewards);
  const redemptions = useAppState((s) => s.redemptions);
  const achievements = useAppState((s) => s.achievements);
  const xp = useAppState((s) => s.xp);
  const xpSpent = useAppState((s) => s.xpSpent);
  const state = useAppState((s) => s);
  const available = Math.max(0, (xp ?? 0) - (xpSpent ?? 0));

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Reward | null>(null);
  const [confetti, setConfetti] = useState(0);

  const activeRewards = rewards.filter((r) => !r.archived);
  const archivedRewards = rewards.filter((r) => r.archived);
  const unlockedMap = useMemo(() => new Map(achievements.map((a) => [a.id, a])), [achievements]);
  const unlockedCount = achievements.length;

  const stats = useMemo(() => {
    const byReward = new Map<string, number>();
    for (const r of redemptions) byReward.set(r.rewardId, (byReward.get(r.rewardId) ?? 0) + 1);
    let mostRedeemed: { title: string; count: number } | null = null;
    for (const [id, count] of byReward.entries()) {
      const title = rewards.find((r) => r.id === id)?.title ?? redemptions.find((x) => x.rewardId === id)?.title ?? "—";
      if (!mostRedeemed || count > mostRedeemed.count) mostRedeemed = { title, count };
    }
    return {
      total: redemptions.length,
      spent: redemptions.reduce((n, r) => n + r.cost, 0),
      claimed: redemptions.filter((r) => r.claimedAt).length,
      mostRedeemed,
    };
  }, [redemptions, rewards]);

  const seedDefaults = () => {
    DEFAULT_REWARDS.forEach(addReward);
    toast.success("Default rewards added");
  };

  const { user } = useCurrentUser();
  const userId = user?.id;

  const handleRedeem = (r: Reward) => {
    const res = redeemReward(r.id);
    if (res.ok) {
      // Optimistically mirror the spend into the local store so the XP Wallet
      // reflects the deduction immediately; the realtime `daily_stats`
      // subscription in useXpTotalsSync will reconcile shortly after.
      setState((s) => ({ ...s, xpSpent: (s.xpSpent ?? 0) + res.cost }));
      if (userId) void bumpDailyXpSpent(userId, res.cost);
      setConfetti((c) => c + 1);
      toast.success(`Redeemed "${r.title}"! −${r.cost} XP`);
    } else {
      toast.error(res.reason || "Could not redeem");
    }
  };

  const submitForm = (values: RewardFormValues) => {
    if (editing) {
      updateReward(editing.id, values);
      toast.success("Reward updated");
    } else {
      addReward(values);
      toast.success("Reward added");
    }
    setEditing(null);
  };

  return (
    <div>
      <PageHeader
        title="Rewards"
        subtitle="Spend the XP you've earned — and unlock achievements along the way."
        actions={
          <Button onClick={() => { setEditing(null); setDialogOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" /> New reward
          </Button>
        }
      />

      <XpWallet availableXp={available} lifetimeXp={xp ?? 0} spentXp={xpSpent ?? 0} />

      <div className="mt-6">
        <Tabs defaultValue="shop">
          <TabsList>
            <TabsTrigger value="shop">
              <Gift className="mr-2 h-4 w-4" /> Shop
            </TabsTrigger>
            <TabsTrigger value="achievements">
              <Trophy className="mr-2 h-4 w-4" /> Achievements
              <span className="ml-2 rounded-full bg-primary-soft px-1.5 py-0.5 text-[10px] font-bold text-primary">
                {unlockedCount}/{ACHIEVEMENTS.length}
              </span>
            </TabsTrigger>
            <TabsTrigger value="history">
              <HistoryIcon className="mr-2 h-4 w-4" /> History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="shop" className="mt-6">
            {activeRewards.length === 0 ? (
              <EmptyState
                icon={Gift}
                title="No rewards yet"
                description="Add custom rewards or start with a curated set."
                action={
                  <div className="flex flex-wrap justify-center gap-2">
                    <Button onClick={() => { setEditing(null); setDialogOpen(true); }}>
                      <Plus className="mr-2 h-4 w-4" /> Add reward
                    </Button>
                    <Button variant="outline" onClick={seedDefaults}>
                      <Sparkles className="mr-2 h-4 w-4" /> Add defaults
                    </Button>
                  </div>
                }
              />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <AnimatePresence>
                  {activeRewards.map((r) => (
                    <RewardCard
                      key={r.id}
                      reward={r}
                      availableXp={available}
                      onRedeem={() => handleRedeem(r)}
                      onEdit={() => { setEditing(r); setDialogOpen(true); }}
                      onArchive={() => archiveReward(r.id)}
                      onDelete={() => { if (confirm(`Delete "${r.title}"?`)) deleteReward(r.id); }}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}

            {archivedRewards.length > 0 && (
              <div className="mt-10">
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Archived
                </h3>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {archivedRewards.map((r) => (
                    <RewardCard
                      key={r.id}
                      reward={r}
                      availableXp={available}
                      onRedeem={() => handleRedeem(r)}
                      onEdit={() => { setEditing(r); setDialogOpen(true); }}
                      onArchive={() => archiveReward(r.id)}
                      onDelete={() => { if (confirm(`Delete "${r.title}"?`)) deleteReward(r.id); }}
                    />
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="achievements" className="mt-6">
            <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <MiniStat label="Unlocked" value={`${unlockedCount}/${ACHIEVEMENTS.length}`} icon={Trophy} />
              <MiniStat
                label="Completion"
                value={`${Math.round((unlockedCount / ACHIEVEMENTS.length) * 100)}%`}
                icon={Sparkles}
              />
              <MiniStat label="Lifetime XP" value={(xp ?? 0).toLocaleString()} icon={Coins} />
              <MiniStat label="Available" value={available.toLocaleString()} icon={Coins} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {ACHIEVEMENTS.map((a) => (
                <AchievementBadge
                  key={a.id}
                  achievement={a}
                  state={state}
                  unlock={unlockedMap.get(a.id)}
                />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="history" className="mt-6">
            <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <MiniStat label="Redemptions" value={String(stats.total)} icon={Gift} />
              <MiniStat label="XP spent" value={stats.spent.toLocaleString()} icon={Coins} />
              <MiniStat label="Claimed" value={String(stats.claimed)} icon={Check} />
              <MiniStat
                label="Most redeemed"
                value={stats.mostRedeemed ? `${stats.mostRedeemed.title} ×${stats.mostRedeemed.count}` : "—"}
                icon={Trophy}
              />
            </div>
            {redemptions.length === 0 ? (
              <EmptyState
                icon={HistoryIcon}
                title="No redemptions yet"
                description="Redeem a reward from the Shop to see it here."
              />
            ) : (
              <div className="space-y-2">
                {redemptions.map((r) => (
                  <motion.div
                    key={r.id}
                    layout
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm"
                  >
                    <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary-soft text-primary text-xl">
                      {r.icon ?? "🎁"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{r.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(r.redeemedAt).toLocaleString(undefined, {
                          month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
                        })}
                        {" · "}
                        <span className="text-primary font-medium">−{r.cost} XP</span>
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant={r.claimedAt ? "outline" : "default"}
                      onClick={() => claimRedemption(r.id)}
                    >
                      <Check className="mr-1.5 h-3.5 w-3.5" />
                      {r.claimedAt ? "Claimed" : "Mark claimed"}
                    </Button>
                    <button
                      onClick={() => deleteRedemption(r.id)}
                      className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-destructive"
                      aria-label="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <RewardFormDialog
        open={dialogOpen}
        onOpenChange={(v) => { setDialogOpen(v); if (!v) setEditing(null); }}
        initial={editing}
        onSubmit={submitForm}
      />

      <Confetti show={confetti > 0} onDone={() => setConfetti(0)} />
    </div>
  );
}

function MiniStat({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" />
        <p className="text-[10px] font-semibold uppercase tracking-wider">{label}</p>
      </div>
      <p className="mt-1 truncate text-lg font-bold">{value}</p>
    </div>
  );
}
