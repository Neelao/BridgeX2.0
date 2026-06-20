import { useState } from "react";
import { Icon } from "./Icon";

export type EventTone = "session" | "reminder" | "done";

export interface CalendarEvent {
  id: string;
  at: number;
  tone: EventTone;
  label: string;
}

const TONE_DOT: Record<EventTone, string> = {
  session: "bg-steel-500",
  reminder: "bg-gold-500",
  done: "bg-muted",
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function Calendar({
  events,
  selectedDay,
  onSelectDay,
}: {
  events: CalendarEvent[];
  selectedDay: number | null;
  onSelectDay: (day: number) => void;
}) {
  const today = startOfDay(Date.now());
  const [cursor, setCursor] = useState(() => {
    const d = new Date(selectedDay ?? Date.now());
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // 6 weeks * 7 days grid starting on the Sunday on/before the 1st.
  const cells: number[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(0);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(0);

  const eventsByDay = new Map<number, CalendarEvent[]>();
  for (const e of events) {
    const key = startOfDay(e.at);
    if (!eventsByDay.has(key)) eventsByDay.set(key, []);
    eventsByDay.get(key)!.push(e);
  }

  const move = (delta: number) => setCursor(new Date(year, month + delta, 1));

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold text-ink-900">
          {MONTHS[month]} {year}
        </h2>
        <div className="flex items-center gap-1">
          <button onClick={() => setCursor(new Date(today))} className="rounded-full px-3 py-1.5 text-xs font-medium text-ink-700 hover:bg-paper-2">
            Today
          </button>
          <button onClick={() => move(-1)} className="rounded-full p-1.5 text-ink-600 hover:bg-paper-2" aria-label="Previous month">
            <Icon name="chevronLeft" size={18} />
          </button>
          <button onClick={() => move(1)} className="rounded-full p-1.5 text-ink-600 hover:bg-paper-2" aria-label="Next month">
            <Icon name="chevronRight" size={18} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {WEEKDAYS.map((w) => (
          <div key={w} className="pb-1 text-center text-[11px] font-semibold uppercase tracking-wide text-muted">
            {w.slice(0, 1)}
          </div>
        ))}

        {cells.map((day, i) => {
          if (day === 0) return <div key={i} />;
          const ts = new Date(year, month, day).getTime();
          const dayEvents = eventsByDay.get(ts) ?? [];
          const isToday = ts === today;
          const isSelected = selectedDay === ts;
          return (
            <button
              key={i}
              onClick={() => onSelectDay(ts)}
              className={`flex aspect-square flex-col items-center justify-start gap-1 rounded-xl border p-1.5 text-sm transition ${
                isSelected
                  ? "border-ink-900 bg-ink-900 text-white"
                  : isToday
                    ? "border-steel-300 bg-steel-50 text-ink-900"
                    : "border-transparent text-ink-700 hover:bg-paper-2"
              }`}
            >
              <span className={`text-[13px] font-medium tnum ${isSelected ? "text-white" : isToday ? "text-steel-700" : ""}`}>{day}</span>
              {dayEvents.length > 0 && (
                <span className="flex items-center gap-0.5">
                  {dayEvents.slice(0, 3).map((e) => (
                    <span key={e.id} className={`h-1.5 w-1.5 rounded-full ${isSelected ? "bg-white/80" : TONE_DOT[e.tone]}`} />
                  ))}
                  {dayEvents.length > 3 && <span className={`text-[9px] ${isSelected ? "text-white/80" : "text-muted"}`}>+</span>}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted">
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-steel-500" /> Session</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-gold-500" /> Follow-up due</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-muted" /> Past</span>
      </div>
    </div>
  );
}
