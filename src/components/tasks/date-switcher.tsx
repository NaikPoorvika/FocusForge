import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { todayISO } from "@/lib/store";

function addDays(date: string, delta: number) {
  const d = new Date(date + "T00:00:00");
  d.setDate(d.getDate() + delta);
  return d.toISOString().slice(0, 10);
}

function formatLong(date: string) {
  const d = new Date(date + "T00:00:00");
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function DateSwitcher({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const today = todayISO();
  const tomorrow = addDays(today, 1);
  const isToday = value === today;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1 rounded-full border border-border bg-card p-1 shadow-sm">
        <button
          onClick={() => onChange(addDays(value, -1))}
          className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted"
          aria-label="Previous day"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <Popover>
          <PopoverTrigger asChild>
            <button className="flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold transition-colors hover:bg-muted">
              <CalendarDays className="h-4 w-4 text-primary" />
              {formatLong(value)}
              {isToday && (
                <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                  Today
                </span>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-3" align="center">
            <Input
              type="date"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className="w-[200px]"
            />
          </PopoverContent>
        </Popover>
        <button
          onClick={() => onChange(addDays(value, 1))}
          className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted"
          aria-label="Next day"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <div className="flex gap-1">
        <Button
          size="sm"
          variant={value === today ? "default" : "outline"}
          onClick={() => onChange(today)}
        >
          Today
        </Button>
        <Button
          size="sm"
          variant={value === tomorrow ? "default" : "outline"}
          onClick={() => onChange(tomorrow)}
        >
          Tomorrow
        </Button>
      </div>
    </div>
  );
}
