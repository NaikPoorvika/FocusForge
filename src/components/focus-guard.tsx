import { useEffect, useRef, useState } from "react";
import { AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  failActiveFocusSession,
  logDistraction,
  stopTimer,
  useAppState,
} from "@/lib/store";
import { playWarning } from "@/lib/sound";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useCurrentUser } from "@/hooks/use-current-user";
import { incrementDistraction, insertFocusSession, dashboardStatsKeys } from "@/lib/dashboard-stats";

const AWAY_LIMIT_MS = 10_000;

export function FocusGuard() {
  const activeTimer = useAppState((s) => s.activeTimer);
  const isFocus =
    !!activeTimer && activeTimer.kind === "pomodoro-focus" && !activeTimer.pausedAt;

  const [open, setOpen] = useState(false);
  const awayStartRef = useRef<number | null>(null);
  const sessionStartRef = useRef<number | null>(null);
  const failTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFocusRef = useRef(isFocus);
  isFocusRef.current = isFocus;

  const { user } = useCurrentUser();
  const queryClient = useQueryClient();
  const userIdRef = useRef<string | undefined>(user?.id);
  userIdRef.current = user?.id;
  const qcRef = useRef(queryClient);
  qcRef.current = queryClient;

  // Track session start
  useEffect(() => {
    if (isFocus && sessionStartRef.current === null) {
      sessionStartRef.current = Date.now();
    } else if (!isFocus) {
      sessionStartRef.current = null;
    }
  }, [isFocus]);

  const recordFailedSession = (awayMs: number) => {
    const uid = userIdRef.current;
    if (!uid) return;
    const startedAt = sessionStartRef.current ?? Date.now() - awayMs;
    const endedAt = Date.now();
    Promise.all([
      incrementDistraction(uid),
      insertFocusSession(uid, {
        started_at: new Date(startedAt).toISOString(),
        ended_at: new Date(endedAt).toISOString(),
        duration: Math.max(0, Math.round((endedAt - startedAt) / 1000)),
        completed: false,
      }),
    ]).then(() => {
      qcRef.current.invalidateQueries({ queryKey: dashboardStatsKeys.today(uid) });
      qcRef.current.invalidateQueries({ queryKey: dashboardStatsKeys.totals(uid) });
      qcRef.current.invalidateQueries({ queryKey: dashboardStatsKeys.focusCount(uid) });
    });
  };

  useEffect(() => {
    if (!isFocus) {
      // clear any pending state when timer stops/pauses
      awayStartRef.current = null;
      if (failTimerRef.current) {
        clearTimeout(failTimerRef.current);
        failTimerRef.current = null;
      }
      setOpen(false);
      return;
    }

    const handleLeave = () => {
      if (!isFocusRef.current) return;
      if (awayStartRef.current !== null) return;
      awayStartRef.current = Date.now();
      try {
        playWarning();
      } catch {
        /* ignore */
      }
      setOpen(true);
      failTimerRef.current = setTimeout(() => {
        // Still away & still a focus session — fail it.
        if (awayStartRef.current !== null && isFocusRef.current) {
          const awayMs = Date.now() - awayStartRef.current;
          failActiveFocusSession(awayMs);
          recordFailedSession(awayMs);
          awayStartRef.current = null;
          failTimerRef.current = null;
          setOpen(false);
          toast.error("Focus session restarted because you left the study window.");
        }
      }, AWAY_LIMIT_MS);
    };

    const handleReturn = () => {
      if (awayStartRef.current === null) return;
      const awayMs = Date.now() - awayStartRef.current;
      if (awayMs >= AWAY_LIMIT_MS) {
        // Failure already fired (or about to). Ensure cleanup.
        if (failTimerRef.current) {
          clearTimeout(failTimerRef.current);
          failTimerRef.current = null;
        }
        if (isFocusRef.current) {
          failActiveFocusSession(awayMs);
          recordFailedSession(awayMs);
          toast.error("Focus session restarted because you left the study window.");
        }
        awayStartRef.current = null;
        setOpen(false);
      } else {
        // Under the limit — resume automatically.
        if (failTimerRef.current) {
          clearTimeout(failTimerRef.current);
          failTimerRef.current = null;
        }
        awayStartRef.current = null;
        setOpen(false);
      }
    };

    const onVisibility = () => {
      if (document.hidden) handleLeave();
      else handleReturn();
    };
    const onBlur = () => handleLeave();
    const onFocus = () => handleReturn();
    const onPageHide = () => handleLeave();

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    window.addEventListener("pagehide", onPageHide);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("pagehide", onPageHide);
      if (failTimerRef.current) {
        clearTimeout(failTimerRef.current);
        failTimerRef.current = null;
      }
      awayStartRef.current = null;
    };
  }, [isFocus]);

  const handleReturnClick = () => {
    if (failTimerRef.current) {
      clearTimeout(failTimerRef.current);
      failTimerRef.current = null;
    }
    awayStartRef.current = null;
    setOpen(false);
  };

  const handleEndSession = () => {
    if (failTimerRef.current) {
      clearTimeout(failTimerRef.current);
      failTimerRef.current = null;
    }
    const awayMs = awayStartRef.current ? Date.now() - awayStartRef.current : 0;
    logDistraction(awayMs);
    stopTimer();
    awayStartRef.current = null;
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleReturnClick()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-destructive/15 text-destructive">
            <AlertTriangle className="h-7 w-7" />
          </div>
          <DialogTitle className="text-center">Stay focused!</DialogTitle>
          <DialogDescription className="text-center">
            You left your study session. Come back within 10 seconds or it will restart.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="sm:justify-center gap-2">
          <Button variant="outline" onClick={handleEndSession}>
            End Session
          </Button>
          <Button onClick={handleReturnClick}>Return to Focus</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
