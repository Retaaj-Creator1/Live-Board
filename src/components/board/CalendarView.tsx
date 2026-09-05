import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { dueStatus, formatDue, type BoardState } from "@/lib/board";

type Props = {
  state: BoardState;
  onOpenCard: (cardId: string) => void;
};

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function CalendarView({ state, onOpenCard }: Props) {
  const [cursor, setCursor] = useState(() => new Date());

  const year = cursor.getFullYear();
  const month = cursor.getMonth();

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cards = Object.values(state.cards).filter((c) => c.dueDate);

  const cardsByDate: Record<string, typeof cards> = {};
  for (const card of cards) {
    if (!card.dueDate) continue;
    const key = card.dueDate;
    if (!cardsByDate[key]) cardsByDate[key] = [];
    cardsByDate[key].push(card);
  }

  const prev = () => setCursor(new Date(year, month - 1, 1));
  const next = () => setCursor(new Date(year, month + 1, 1));

  const today = new Date();
  const isToday = (day: number) =>
    today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="rounded-xl border border-border">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <button
          onClick={prev}
          className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
          aria-label="Previous month"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <h3 className="text-sm font-semibold">
          {MONTHS[month]} {year}
        </h3>
        <button
          onClick={next}
          className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
          aria-label="Next month"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-border">
        {DAYS.map((d) => (
          <div
            key={d}
            className="px-2 py-2 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7">
        {cells.map((day, i) => {
          if (day === null) {
            return (
              <div
                key={`empty-${i}`}
                className="min-h-[6rem] border-b border-r border-border/50 bg-secondary/20"
              />
            );
          }

          const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const dayCards = cardsByDate[dateStr] ?? [];

          return (
            <div
              key={`day-${day}`}
              className={cn(
                "min-h-[6rem] border-b border-r border-border/50 p-1.5",
                isToday(day) && "bg-primary/5",
              )}
            >
              <div
                className={cn(
                  "mb-1 text-xs font-medium",
                  isToday(day) ? "text-primary" : "text-muted-foreground",
                )}
              >
                {day}
              </div>
              <div className="space-y-0.5">
                {dayCards.slice(0, 3).map((card) => {
                  const status = dueStatus(card.dueDate);
                  return (
                    <button
                      key={card.id}
                      onClick={() => onOpenCard(card.id)}
                      className={cn(
                        "w-full truncate rounded px-1.5 py-0.5 text-left text-[0.65rem] font-medium transition-colors",
                        status === "overdue"
                          ? "bg-destructive/20 text-destructive hover:bg-destructive/30"
                          : status === "soon"
                            ? "bg-chart-1/20 text-chart-1 hover:bg-chart-1/30"
                            : "bg-secondary text-foreground hover:bg-secondary/80",
                      )}
                    >
                      {card.title}
                    </button>
                  );
                })}
                {dayCards.length > 3 && (
                  <span className="block px-1.5 text-[0.6rem] text-muted-foreground">
                    +{dayCards.length - 3} more
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
