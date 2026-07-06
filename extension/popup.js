// Popup UI logic. All Supabase writes go through the background service worker.

const $ = (id) => document.getElementById(id);

function setStatus(msg, isError = false) {
  const el = $("status");
  el.textContent = msg || "";
  el.style.color = isError ? "#b91c1c" : "#6b7280";
}

async function send(type, payload = {}) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type, payload }, (res) => {
      resolve(res || { ok: false, error: chrome.runtime.lastError?.message });
    });
  });
}

async function refresh() {
  const res = await send("GET_STATE");
  if (res.paired) {
    $("account-status").innerHTML = '<span class="badge ok">Paired</span>';
    $("account-email").textContent = res.email || "—";
  } else {
    $("account-status").innerHTML = '<span class="badge off">Not paired</span>';
    $("account-email").textContent = "—";
  }
  const s = res.today || {};
  $("s-xp").textContent = s.xp ?? 0;
  $("s-streak").textContent = s.streak ?? 0;
  $("s-focus").textContent = s.focus_score ?? 100;
  $("s-pomo").textContent = s.completed_pomodoros ?? 0;
  $("s-min").textContent = s.study_minutes ?? 0;
  $("s-dist").textContent = s.today_distractions ?? 0;
}

$("paste-btn").addEventListener("click", async () => {
  const raw = prompt(
    "Paste the session JSON copied from the /connect-extension page in the web app:",
  );
  if (!raw) return;
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    setStatus("Invalid JSON", true);
    return;
  }
  setStatus("Pairing…");
  const res = await send("PAIR", parsed);
  if (!res.ok) {
    setStatus(res.error || "Pairing failed", true);
    return;
  }
  setStatus("Paired ✓");
  await refresh();
});

$("pomo-btn").addEventListener("click", async () => {
  setStatus("Logging pomodoro…");
  const res = await send("LOG_POMODORO", { minutes: 25 });
  setStatus(res.ok ? "Pomodoro logged ✓" : res.error || "Failed", !res.ok);
  await refresh();
});

$("dist-btn").addEventListener("click", async () => {
  setStatus("Logging distraction…");
  const res = await send("LOG_DISTRACTION", {});
  setStatus(res.ok ? "Distraction logged ✓" : res.error || "Failed", !res.ok);
  await refresh();
});

$("sync-btn").addEventListener("click", async () => {
  setStatus("Syncing…");
  const res = await send("SYNC");
  setStatus(res.ok ? "Synced ✓" : res.error || "Sync failed", !res.ok);
  await refresh();
});

$("signout-btn").addEventListener("click", async () => {
  await send("SIGN_OUT");
  setStatus("Signed out");
  await refresh();
});

refresh();
