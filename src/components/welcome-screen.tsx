import { useState } from "react";
import { motion } from "framer-motion";
import { GraduationCap, Sparkles, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { setState, todayISO, useAppState, type UserSettings } from "@/lib/store";

export function WelcomeScreen() {
  const currentTheme = useAppState((s) => s.theme);
  const [step, setStep] = useState(0);
  const [theme, setTheme] = useState<"light" | "dark">(currentTheme ?? "light");
  const [form, setForm] = useState<UserSettings>({
    studentName: "",
    challengeName: "My 30-Day Challenge",
    duration: 30,
    dailyStudyGoal: 3,
    wakeTime: "07:00",
    sleepTime: "23:00",
    reminderTime: "20:00",
    startDate: todayISO(),
    onboarded: false,
  });

  const update = <K extends keyof UserSettings>(k: K, v: UserSettings[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const finish = () => {
    if (!form.studentName.trim()) return;
    setState((s) => ({ ...s, theme, settings: { ...form, onboarded: true } }));
  };

  const steps = [
    {
      title: "Welcome!",
      subtitle: "Let's set up your success challenge.",
      content: (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Your name</Label>
            <Input
              id="name"
              placeholder="Alex Johnson"
              value={form.studentName}
              onChange={(e) => update("studentName", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="challenge">Challenge name</Label>
            <Input
              id="challenge"
              value={form.challengeName}
              onChange={(e) => update("challengeName", e.target.value)}
            />
          </div>
        </div>
      ),
      canNext: form.studentName.trim().length > 0,
    },
    {
      title: "Your goals",
      subtitle: "How long, how much?",
      content: (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Challenge duration (days)</Label>
            <Input
              type="number"
              min={1}
              max={365}
              value={form.duration}
              onChange={(e) => update("duration", Number(e.target.value) || 30)}
            />
          </div>
          <div className="space-y-2">
            <Label>Daily study goal (hours)</Label>
            <Input
              type="number"
              step="0.5"
              min={0.5}
              max={16}
              value={form.dailyStudyGoal}
              onChange={(e) => update("dailyStudyGoal", Number(e.target.value) || 3)}
            />
          </div>
        </div>
      ),
      canNext: form.duration > 0 && form.dailyStudyGoal > 0,
    },
    {
      title: "Your rhythm",
      subtitle: "When do you wake, sleep, and want to be reminded?",
      content: (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label>Wake up</Label>
            <Input
              type="time"
              value={form.wakeTime}
              onChange={(e) => update("wakeTime", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Sleep</Label>
            <Input
              type="time"
              value={form.sleepTime}
              onChange={(e) => update("sleepTime", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Reminder</Label>
            <Input
              type="time"
              value={form.reminderTime}
              onChange={(e) => update("reminderTime", e.target.value)}
            />
          </div>
        </div>
      ),
      canNext: true,
    },
    {
      title: "Pick your theme",
      subtitle: "You can change this anytime in Settings.",
      content: (
        <div className="grid grid-cols-2 gap-3">
          {(["light", "dark"] as const).map((t) => {
            const active = theme === t;
            const Icon = t === "light" ? Sun : Moon;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setTheme(t)}
                className={`flex flex-col items-center gap-2 rounded-2xl border-2 p-6 transition-all ${
                  active
                    ? "border-primary bg-primary-soft"
                    : "border-border bg-card hover:border-primary/40"
                }`}
              >
                <div
                  className={`grid h-12 w-12 place-items-center rounded-xl ${
                    t === "light" ? "bg-warning/20 text-warning-foreground" : "bg-slate-800 text-white"
                  }`}
                >
                  <Icon className="h-6 w-6" />
                </div>
                <span className="text-sm font-semibold capitalize">{t} mode</span>
              </button>
            );
          })}
        </div>
      ),
      canNext: true,
    },
  ];

  const current = steps[step];

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-xl overflow-hidden rounded-3xl border border-border bg-card shadow-2xl shadow-primary/10"
      >
        <div className="gradient-primary relative flex items-center gap-3 px-8 py-6 text-primary-foreground">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-white/20 backdrop-blur">
            <GraduationCap className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider opacity-90">
              Student Success Tracker
            </p>
            <p className="text-lg font-semibold">Let's build your 30-day streak</p>
          </div>
          <Sparkles className="ml-auto h-5 w-5 opacity-80" />
        </div>

        <div className="px-8 py-8">
          <div className="mb-6 flex items-center gap-2">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  i <= step ? "bg-primary" : "bg-muted"
                }`}
              />
            ))}
          </div>

          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.25 }}
          >
            <h2 className="text-2xl font-bold tracking-tight text-foreground">{current.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{current.subtitle}</p>
            <div className="mt-6">{current.content}</div>
          </motion.div>

          <div className="mt-8 flex justify-between gap-3">
            <Button
              variant="ghost"
              disabled={step === 0}
              onClick={() => setStep((s) => Math.max(0, s - 1))}
            >
              Back
            </Button>
            {step < steps.length - 1 ? (
              <Button disabled={!current.canNext} onClick={() => setStep((s) => s + 1)}>
                Continue
              </Button>
            ) : (
              <Button onClick={finish} disabled={!current.canNext}>
                Start My Challenge
              </Button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
