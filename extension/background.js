// MV3 service worker. Handles pairing, token refresh, and Supabase REST writes.
// No supabase-js dependency — direct fetch to PostgREST + GoTrue.

const STORAGE_KEY = "lovableSession";

function todayDate() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

async function getSession() {
  const { [STORAGE_KEY]: s } = await chrome.storage.local.get(STORAGE_KEY);
  return s || null;
}

async function saveSession(s) {
  await chrome.storage.local.set({ [STORAGE_KEY]: s });
}

async function clearSession() {
  await chrome.storage.local.remove(STORAGE_KEY);
}

// Refresh access token if expired or expiring within 60s.
async function ensureFreshToken() {
  const s = await getSession();
  if (!s) throw new Error("Not paired");
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = s.expiresAt || 0;
  if (expiresAt && expiresAt - now > 60) return s;

  const res = await fetch(
    `${s.supabaseUrl}/auth/v1/token?grant_type=refresh_token`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: s.supabasePublishableKey,
      },
      body: JSON.stringify({ refresh_token: s.refreshToken }),
    },
  );
  const rawText = await res.text().catch(() => "");
  if (!res.ok) {
    throw new Error(`Refresh failed: ${rawText}`);
  }
  let data = {};
  if (rawText) {
    try {
      data = JSON.parse(rawText);
    } catch (e) {
      throw new Error(`Refresh returned invalid JSON: ${rawText.slice(0, 200)}`);
    }
  }
  const updated = {
    ...s,
    accessToken: data.access_token,
    refreshToken: data.refresh_token || s.refreshToken,
    expiresAt: Math.floor(Date.now() / 1000) + (data.expires_in || 3600),
    userId: data.user?.id || s.userId,
    email: data.user?.email || s.email,
  };
  await saveSession(updated);
  return updated;
}

async function sbFetch(path, options = {}) {
  const s = await ensureFreshToken();
  const url = `${s.supabaseUrl}/rest/v1${path}`;
  const headers = {
    "Content-Type": "application/json",
    apikey: s.supabasePublishableKey,
    Authorization: `Bearer ${s.accessToken}`,
    ...(options.headers || {}),
  };
  const res = await fetch(url, { ...options, headers });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Supabase ${res.status}: ${text}`);
  }
  if (res.status === 204 || res.status === 205) return null;
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function getTodayStats() {
  const s = await getSession();
  if (!s) return null;
  const rows = await sbFetch(
    `/daily_stats?user_id=eq.${s.userId}&stat_date=eq.${todayDate()}&select=*`,
  );
  return rows && rows[0] ? rows[0] : null;
}

async function upsertTodayStats(patch) {
  const s = await ensureFreshToken();
  const existing = await getTodayStats();
  const base = existing || {
    user_id: s.userId,
    stat_date: todayDate(),
    xp: 0,
    streak: 0,
    longest_streak: 0,
    focus_score: 100,
    today_distractions: 0,
    total_distractions: 0,
    completed_pomodoros: 0,
    study_minutes: 0,
  };
  const merged = { ...base, ...patch, user_id: s.userId, stat_date: todayDate() };
  await sbFetch(`/daily_stats?on_conflict=user_id,stat_date`, {
    method: "POST",
    headers: {
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify(merged),
  });
  return merged;
}

async function insertFocusSession(entry) {
  const s = await ensureFreshToken();
  await sbFetch(`/focus_sessions`, {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ ...entry, user_id: s.userId }),
  });
}

// ------- Message handlers -------

const handlers = {
  async GET_STATE() {
    const s = await getSession();
    if (!s) return { paired: false };
    let today = null;
    try {
      today = await getTodayStats();
    } catch (e) {
      console.warn("getTodayStats failed", e);
    }
    return { paired: true, email: s.email, userId: s.userId, today };
  },

  async PAIR(payload) {
    const required = [
      "supabaseUrl",
      "supabasePublishableKey",
      "accessToken",
      "refreshToken",
      "userId",
    ];
    for (const k of required) {
      if (!payload?.[k]) throw new Error(`Missing field: ${k}`);
    }
    const session = {
      supabaseUrl: payload.supabaseUrl,
      supabasePublishableKey: payload.supabasePublishableKey,
      accessToken: payload.accessToken,
      refreshToken: payload.refreshToken,
      expiresAt: payload.expiresAt || Math.floor(Date.now() / 1000) + 3600,
      userId: payload.userId,
      email: payload.email || null,
    };
    await saveSession(session);
    // Force a refresh + sanity read to confirm the tokens work.
    await ensureFreshToken();
    await getTodayStats();
    return { ok: true };
  },

  async SIGN_OUT() {
    await clearSession();
    return { ok: true };
  },

  async LOG_POMODORO({ minutes = 25 }) {
    const current = (await getTodayStats()) || {};
    const startedAt = new Date(Date.now() - minutes * 60_000).toISOString();
    const endedAt = new Date().toISOString();
    await upsertTodayStats({
      completed_pomodoros: (current.completed_pomodoros || 0) + 1,
      study_minutes: (current.study_minutes || 0) + minutes,
      xp: (current.xp || 0) + 10,
    });
    await insertFocusSession({
      website: null,
      started_at: startedAt,
      ended_at: endedAt,
      duration: minutes * 60,
      completed: true,
    });
    return { ok: true };
  },

  async LOG_DISTRACTION() {
    const current = (await getTodayStats()) || {};
    await upsertTodayStats({
      today_distractions: (current.today_distractions || 0) + 1,
      total_distractions: (current.total_distractions || 0) + 1,
      focus_score: Math.max(0, (current.focus_score ?? 100) - 5),
    });
    return { ok: true };
  },

  async UPDATE_STATS(patch) {
    // Generic partial update: { xp, streak, longest_streak, focus_score,
    // today_distractions, total_distractions, completed_pomodoros, study_minutes }
    await upsertTodayStats(patch || {});
    return { ok: true };
  },

  async LOG_FOCUS_SESSION(entry) {
    await insertFocusSession({
      website: entry?.website ?? null,
      started_at: entry?.started_at || new Date().toISOString(),
      ended_at: entry?.ended_at || new Date().toISOString(),
      duration: entry?.duration ?? 0,
      completed: entry?.completed ?? true,
    });
    return { ok: true };
  },

  async SYNC() {
    // Touches the network to refresh the token and re-read today's row.
    await ensureFreshToken();
    await getTodayStats();
    return { ok: true };
  },
};

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  const fn = handlers[msg?.type];
  if (!fn) {
    sendResponse({ ok: false, error: `Unknown message type: ${msg?.type}` });
    return false;
  }
  Promise.resolve()
    .then(() => fn(msg.payload || {}))
    .then((res) => sendResponse(res && typeof res === "object" ? { ok: true, ...res } : { ok: true }))
    .catch((err) => {
      console.error(msg.type, err);
      sendResponse({ ok: false, error: err?.message || String(err) });
    });
  return true; // keep the message channel open for async response
});

// Periodic token refresh so the session stays alive in the background.
chrome.alarms.create("keep-alive", { periodInMinutes: 30 });
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== "keep-alive") return;
  try {
    await ensureFreshToken();
  } catch (e) {
    console.warn("Background refresh failed", e);
  }
});
