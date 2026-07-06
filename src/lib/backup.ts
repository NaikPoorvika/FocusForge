// Export / import helpers.
import { getExtras, replaceExtras, type ExtrasState } from "./extras-store";
import { getState, setState, type AppState } from "./store";

export function downloadFile(name: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportJSON() {
  const payload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    app: getState(),
    extras: getExtras(),
  };
  downloadFile(
    `success-tracker-backup-${new Date().toISOString().slice(0, 10)}.json`,
    JSON.stringify(payload, null, 2),
    "application/json",
  );
}

function csvEscape(v: unknown): string {
  const s = v == null ? "" : String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function toCSV<T extends Record<string, unknown>>(rows: T[]): string {
  if (rows.length === 0) return "";
  const cols = Object.keys(rows[0]);
  const header = cols.join(",");
  const lines = rows.map((r) => cols.map((c) => csvEscape(r[c])).join(","));
  return [header, ...lines].join("\n");
}

export function exportCSV() {
  const s = getState();
  const tasksCSV = toCSV(
    s.tasks.map((t) => ({
      date: t.date,
      title: t.title,
      category: t.category,
      priority: t.priority,
      completed: t.completed,
      completedAt: t.completedAt ?? "",
    })),
  );
  const sessionsCSV = toCSV(
    s.sessions.map((x) => ({
      date: x.date,
      minutes: x.minutes,
      subject: x.subject ?? "",
      source: x.source,
    })),
  );
  const content =
    "# TASKS\n" + tasksCSV + "\n\n# STUDY SESSIONS\n" + sessionsCSV + "\n";
  downloadFile(
    `success-tracker-${new Date().toISOString().slice(0, 10)}.csv`,
    content,
    "text/csv",
  );
}

export async function importJSONFile(file: File): Promise<void> {
  const text = await file.text();
  const parsed = JSON.parse(text) as { app?: AppState; extras?: ExtrasState };
  if (parsed.app) {
    setState(() => parsed.app!);
  }
  if (parsed.extras) {
    replaceExtras(parsed.extras);
  }
}
