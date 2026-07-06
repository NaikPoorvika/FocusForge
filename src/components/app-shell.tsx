import { Link, useRouterState } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useEffect, useRef } from "react";
import {
  LayoutDashboard,
  ListTodo,
  Calendar,
  BarChart3,
  Target,
  Repeat,
  BookHeart,
  Settings,
  Moon,
  Sun,
  GraduationCap,
  Timer,
  Clock,
  Gift,
  Trophy,
  Library,
  Code2,
  Award,
} from "lucide-react";
import { LeafSprig as LeafSprigDecor } from "@/components/decor/leaf-sprig";
import { applyAchievementUnlocks, markAchievementsSeen, useAppState } from "@/lib/store";
import { bumpDailyXp } from "@/lib/xp-sync";
import { useCurrentUser } from "@/hooks/use-current-user";
import { ACHIEVEMENTS } from "@/lib/achievements";
import { toggleTheme } from "@/components/theme-manager";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useDisplayName, firstName } from "@/hooks/use-display-name";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/tasks", label: "Daily Tasks", icon: ListTodo },
  { to: "/pomodoro", label: "Pomodoro", icon: Timer },
  { to: "/study", label: "Study Tracker", icon: Clock },
  { to: "/calendar", label: "Calendar", icon: Calendar },
  { to: "/habits", label: "Habits", icon: Repeat },
  { to: "/goals", label: "Goals", icon: Target },
  { to: "/coding", label: "Coding", icon: Code2 },
  { to: "/resources", label: "Resources", icon: Library },
  { to: "/rewards", label: "Rewards", icon: Gift },
  { to: "/achievements", label: "Achievements", icon: Trophy },
  { to: "/journal", label: "Journal", icon: BookHeart },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/certificate", label: "Certificate", icon: Award },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

const mobileNav = nav.filter((n) =>
  ["/", "/tasks", "/pomodoro", "/achievements", "/journal"].includes(n.to),
);

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const theme = useAppState((s) => s.theme);

  const state = useAppState((s) => s);
  const displayName = useDisplayName("Student");
  const showToasts = useAppState((s) => s.rewardsPrefs.showAchievementToasts);
  const stateRef = useRef(state);
  stateRef.current = state;
  const { user } = useCurrentUser();
  const userId = user?.id;

  // Check for newly-unlocked achievements after any state mutation.
  useEffect(() => {
    const { ids: newly, xpBonus } = applyAchievementUnlocks(ACHIEVEMENTS);
    if (newly.length) {
      if (userId && xpBonus > 0) {
        void bumpDailyXp(userId, xpBonus);
      }
      if (showToasts) {
        for (const id of newly) {
          const a = ACHIEVEMENTS.find((x) => x.id === id);
          if (!a) continue;
          toast.success(`🏆 Achievement unlocked: ${a.title}`, {
            description: `+${a.xpReward} XP • ${a.description}`,
          });
        }
      }
      markAchievementsSeen(newly);
    }
    // Re-run when meaningful counters change.
  }, [
    state.tasks,
    state.habits,
    state.pomodoros,
    state.sessions,
    state.journal,
    state.goals,
    state.xp,
    showToasts,
    userId,
  ]);



  return (
    <div className="min-h-screen w-full bg-background text-foreground">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col overflow-hidden bg-sidebar px-4 py-6 text-sidebar-foreground lg:flex">
        {/* botanical decor */}
        <LeafSprigDecor className="pointer-events-none absolute -bottom-8 -left-8 h-56 w-56 text-sidebar-foreground/25" />
        <LeafSprigDecor className="pointer-events-none absolute -right-10 top-32 h-40 w-40 rotate-45 text-sidebar-foreground/15" />

        <div className="relative flex items-center gap-3 px-2">
          <div className="grid h-11 w-11 place-items-center rounded-full bg-sidebar-foreground/15 text-sidebar-foreground shadow-inner backdrop-blur">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="font-serif truncate text-base font-semibold leading-tight text-sidebar-foreground">
              {firstName(displayName)}
            </p>
            <p className="truncate text-[11px] uppercase tracking-widest text-sidebar-foreground/70">
              Success student
            </p>
          </div>
        </div>

        <nav className="relative mt-8 flex flex-1 flex-col gap-1 overflow-y-auto pr-1">
          {nav.map((item) => {
            const active = pathname === item.to;
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "group relative flex items-center gap-3 rounded-full px-4 py-2.5 text-sm font-medium transition-all",
                  active
                    ? "text-sidebar"
                    : "text-sidebar-foreground/85 hover:translate-x-0.5 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                )}
              >
                {active && (
                  <motion.span
                    layoutId="sidebar-active"
                    className="absolute inset-0 -z-0 rounded-full bg-sidebar-foreground shadow-sm"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <Icon className="relative z-10 h-4 w-4 shrink-0" />
                <span className="relative z-10 truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <button
          onClick={toggleTheme}
          className="relative mt-2 flex items-center gap-3 rounded-full px-4 py-2.5 text-sm font-medium text-sidebar-foreground/85 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          {theme === "dark" ? "Light mode" : "Dark mode"}
        </button>
      </aside>

      <main className="min-h-screen pb-24 lg:pl-64 lg:pb-0">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-background/80 px-4 py-3 backdrop-blur lg:hidden">
          <div className="flex items-center gap-2">
            <div className="gradient-primary grid h-8 w-8 place-items-center rounded-lg text-primary-foreground">
              <GraduationCap className="h-4 w-4" />
            </div>
            <span className="text-sm font-semibold">Success Tracker</span>
          </div>
          <button
            onClick={toggleTheme}
            className="grid h-9 w-9 place-items-center rounded-lg border border-border bg-card"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </header>

        <motion.div
          key={pathname}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-10 lg:py-10"
        >
          {children}
        </motion.div>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/90 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-md items-center justify-around px-2 py-2">
          {mobileNav.map((item) => {
            const active = pathname === item.to;
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex flex-1 flex-col items-center gap-1 rounded-xl px-2 py-2 text-[10px] font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <div
                  className={cn(
                    "grid h-8 w-8 place-items-center rounded-lg transition-colors",
                    active ? "bg-primary-soft" : "",
                  )}
                >
                  <Icon className="h-4.5 w-4.5" />
                </div>
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
