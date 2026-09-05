import { useState, useEffect, useCallback } from "react";
import { Sparkles, Loader2, RefreshCw, Target } from "lucide-react";
import { type BoardState, formatDue, dueStatus } from "@/lib/board";
import { ai } from "@/lib/ai";

type Props = {
  cards: BoardState["cards"];
  onOpenCard: (cardId: string) => void;
};

export function AiDailyFocus({ cards, onOpenCard }: Props) {
  const [loading, setLoading] = useState(false);
  const [focusedIds, setFocusedIds] = useState<string[]>([]);

  const generate = useCallback(async () => {
    setLoading(true);
    try {
      const ids = await ai.generateDailyFocus(cards);
      setFocusedIds(ids);
    } catch {
      setFocusedIds([]);
    } finally {
      setLoading(false);
    }
  }, [cards]);

  useEffect(() => {
    if (Object.keys(cards).length > 0 && focusedIds.length === 0) {
      void generate();
    }
  }, [generate, focusedIds.length, cards]);

  const focusedCards = focusedIds.map((id) => cards[id]).filter(Boolean);

  return (
    <div className="rounded-xl border border-border">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold">
          <Target className="h-4 w-4 text-primary" />
          What to work on today
        </h3>
        <button
          onClick={generate}
          disabled={loading}
          className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-40"
          aria-label="Refresh suggestions"
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
        </button>
      </div>

      <div className="p-2">
        {loading && focusedCards.length === 0 ? (
          <div className="flex items-center gap-2 px-3 py-4 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Analyzing your cards…
          </div>
        ) : focusedCards.length === 0 ? (
          <div className="px-3 py-4 text-center text-sm text-muted-foreground">
            <Sparkles className="mx-auto mb-2 h-5 w-5 text-muted-foreground/50" />
            Add cards with due dates or priority labels to get suggestions.
          </div>
        ) : (
          <div className="space-y-1">
            {focusedCards.map((card, i) => {
              if (!card) return null;
              const status = dueStatus(card.dueDate);
              return (
                <button
                  key={card.id}
                  onClick={() => onOpenCard(card.id)}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-secondary"
                >
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[10px] font-bold text-primary">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{card.title}</p>
                    {card.dueDate && (
                      <p
                        className={`text-xs ${
                          status === "overdue"
                            ? "text-destructive"
                            : status === "soon"
                              ? "text-chart-1"
                              : "text-muted-foreground"
                        }`}
                      >
                        {formatDue(card.dueDate)}
                        {status === "overdue" && " (overdue)"}
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
