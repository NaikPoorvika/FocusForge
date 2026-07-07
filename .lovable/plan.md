## Simplify Dashboard

### 1. Remove redundant cards from Dashboard (`src/routes/index.tsx`)
- Remove `DashboardRewardsCard` usage from the side column and delete the component entirely.
- Remove **Total pomodoros**, **Focus score**, and **Habits done today** from `SupabaseStatRow`.

### 2. Rebalance stat grid
- Merge the existing `grid-cols-4` stat row and `SupabaseStatRow` into a single unified grid.
- Layout: `grid-cols-3` so the 9 remaining cards (Current Streak, Longest Streak, Study Today, Total Study, Today's Distractions, XP, Pomodoros Today, Tasks Done Today, Focus Sessions) fill exactly 3 rows with no gaps.
- Keep all existing `StatCard` styling, spacing, animations, and responsive behavior unchanged.

### 3. Move displaced metrics to their target pages
- **Total Pomodoros** → Add a stat card on the Analytics page (`src/routes/analytics.tsx`) using the same `Stat` component style.
- **XP Wallet / Shop / Redeem / Lifetime XP/Level** → Already present on the Rewards page (`src/routes/rewards.tsx`). No changes needed there.

### 4. Cleanup
- Remove unused imports (e.g., `Coins`, `Gift`, `Trophy` from the dashboard if no longer referenced).
- Ensure no dead code remains.