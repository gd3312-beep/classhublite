import { useMemo, useState } from "react";
import { addMonths, endOfMonth, format, isSameDay, isToday, startOfMonth, startOfWeek, addDays, isSameMonth } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

export interface DeadlineLite {
  id: string;
  due_date: string; // YYYY-MM-DD
}

interface CalendarProps {
  deadlines: DeadlineLite[];
  loading?: boolean;
  onSelectDate: (date: Date) => void;
}

export function Calendar({ deadlines, loading, onSelectDate }: CalendarProps) {
  const [cursor, setCursor] = useState(() => new Date());

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: 0 });
    const end = endOfMonth(cursor);
    const out: Date[] = [];
    let d = start;
    // 6 weeks max grid
    for (let i = 0; i < 42; i++) {
      out.push(d);
      d = addDays(d, 1);
      if (i >= 34 && d > end && d.getDay() === 0) break;
    }
    return out;
  }, [cursor]);

  const deadlineDates = useMemo(() => {
    const set = new Set<string>();
    deadlines.forEach((d) => set.add(d.due_date));
    return set;
  }, [deadlines]);

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-card sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold tracking-tight sm:text-xl">{format(cursor, "MMMM yyyy")}</h2>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => setCursor((c) => addMonths(c, -1))} aria-label="Previous month">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setCursor(new Date())}>
            Today
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setCursor((c) => addMonths(c, 1))} aria-label="Next month">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-medium uppercase tracking-wider text-muted-foreground sm:text-xs">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="py-2">{d}</div>
        ))}
      </div>

      {loading ? (
        <div className="mt-1 grid grid-cols-7 gap-1">
          {Array.from({ length: 35 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="mt-1 grid grid-cols-7 gap-1">
          {days.map((day) => {
            const key = format(day, "yyyy-MM-dd");
            const hasDeadline = deadlineDates.has(key);
            const inMonth = isSameMonth(day, cursor);
            const today = isToday(day);
            return (
              <button
                key={key}
                onClick={() => onSelectDate(day)}
                className={cn(
                  "group relative flex aspect-square flex-col items-center justify-center rounded-lg text-sm transition-all",
                  "hover:bg-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  !inMonth && "text-muted-foreground/40",
                  today && "bg-highlight text-highlight-foreground font-semibold shadow-soft hover:bg-highlight/90",
                  !today && hasDeadline && "bg-brown-soft text-foreground font-medium",
                )}
                aria-label={`${format(day, "PPPP")}${hasDeadline ? ", has deadlines" : ""}`}
              >
                <span>{format(day, "d")}</span>
                {hasDeadline && (
                  <span
                    className={cn(
                      "absolute bottom-1 h-1.5 w-1.5 rounded-full",
                      today ? "bg-highlight-foreground" : "bg-highlight",
                    )}
                  />
                )}
              </button>
            );
          })}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-highlight" /> Today
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-brown" /> Deadline
        </span>
      </div>
    </div>
  );
}
