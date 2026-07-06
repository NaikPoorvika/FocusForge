# Focus Companion — Chrome Extension

Syncs XP, streak, longest streak, focus score, pomodoros, study minutes,
distractions, and focus sessions to your Lovable dashboard (Supabase
`daily_stats` + `focus_sessions`) as the paired user under RLS.

## Load unpacked

1. Open `chrome://extensions`.
2. Enable **Developer mode** (top right).
3. Click **Load unpacked** and select this `extension/` folder.
4. Pin the extension for easy access.

## Pair your account

1. In the web app, sign in and visit **`/connect-extension`**.
2. Click **Copy JSON**.
3. Open the extension popup and click **Paste Session JSON**.
4. Paste the JSON into the prompt and confirm.

The popup will flip to `Paired ✓` and today's stats will load. Tokens are
refreshed automatically every 30 minutes via a `chrome.alarms` keep-alive.

## What the popup can do

- **Paste Session JSON** — pair or re-pair to a Supabase session.
- **+1 Pomodoro (25 min)** — upserts `daily_stats` (`completed_pomodoros +1`,
  `study_minutes +25`, `xp +10`) and inserts a `focus_sessions` row.
- **+1 Distraction** — upserts `daily_stats`
  (`today_distractions +1`, `total_distractions +1`, `focus_score -5`).
- **Sync now** — refreshes token + reads today's row.
- **Sign out** — clears the stored session.

## Programmatic API (for other extension scripts or the background worker)

Send messages to the background service worker:

```js
chrome.runtime.sendMessage({
  type: "UPDATE_STATS",
  payload: {
    xp: 240,
    streak: 5,
    longest_streak: 12,
    focus_score: 88,
    completed_pomodoros: 4,
    study_minutes: 100,
    today_distractions: 2,
    total_distractions: 37,
  },
});

chrome.runtime.sendMessage({
  type: "LOG_FOCUS_SESSION",
  payload: {
    website: "example.com",
    started_at: new Date(Date.now() - 25 * 60_000).toISOString(),
    ended_at: new Date().toISOString(),
    duration: 1500,
    completed: true,
  },
});
```

All writes flow through the paired Supabase session (RLS enforced as the
signed-in user). No service-role keys are used or stored.

## Storage

- `chrome.storage.local["lovableSession"]` — session envelope:
  `{ supabaseUrl, supabasePublishableKey, accessToken, refreshToken,
     expiresAt, userId, email }`.
