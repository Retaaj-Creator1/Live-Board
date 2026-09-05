import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  CalendarDays,
  CheckSquare,
  GripVertical,
  MessageSquare,
  Paperclip,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  checklistProgress,
  dueStatus,
  formatDue,
  labelClass,
  type Card,
  type Label,
} from "@/lib/board";
import type { LabelStyle } from "@/lib/theme";

type Props = {
  card: Card;
  boardLabels: Label[];
  labelStyle?: LabelStyle;
  assigneeCount?: number;
  onOpen: () => void;
  onDelete: () => void;
};

export function KanbanCard({
  card,
  boardLabels,
  labelStyle = "soft",
  assigneeCount = 0,
  onOpen,
  onDelete,
}: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
    data: { type: "card" },
  });
  const labels = (card.labels ?? [])
    .map((id) => boardLabels.find((l) => l.id === id))
    .filter(Boolean) as Label[];
  const progress = checklistProgress(card);
  const status = dueStatus(card.dueDate);

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(
        "group relative rounded-lg border border-border bg-card p-3 shadow-sm",
        "hover:border-ring/60",
        isDragging && "opacity-40",
      )}
    >
      <div className="flex items-start gap-2">
        <button
          {...attributes}
          {...listeners}
          aria-label={`Drag ${card.title}`}
          className="mt-0.5 cursor-grab text-muted-foreground/60 transition-colors hover:text-foreground active:cursor-grabbing"
        >
          <GripVertical className="h-4 w-4" />
        </button>

        <button onClick={onOpen} className="flex-1 space-y-2 text-left">
          {labels.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {labels.map((l) => (
                <span
                  key={l.id}
                  className={cn(
                    "rounded-full border px-2 py-0.5 text-[0.65rem] font-medium",
                    labelClass(l.color, labelStyle),
                  )}
                >
                  {l.name}
                </span>
              ))}
            </div>
          )}

          <span className="block text-sm leading-snug text-card-foreground">{card.title}</span>

          {(progress.total > 0 ||
            card.dueDate ||
            (card.attachments ?? []).length > 0 ||
            (card.comments ?? []).length > 0) && (
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              {card.dueDate && (
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-md border border-border px-1.5 py-0.5",
                    status === "overdue" && "border-destructive/50 text-destructive",
                    status === "soon" && "border-chart-1/50 text-chart-1",
                  )}
                >
                  <CalendarDays className="h-3 w-3" /> {formatDue(card.dueDate)}
                </span>
              )}
              {progress.total > 0 && (
                <span className="inline-flex items-center gap-1">
                  <CheckSquare className="h-3 w-3" /> {progress.done}/{progress.total}
                </span>
              )}
              {(card.attachments ?? []).length > 0 && (
                <span className="inline-flex items-center gap-1">
                  <Paperclip className="h-3 w-3" /> {(card.attachments ?? []).length}
                </span>
              )}
              {(card.comments ?? []).length > 0 && (
                <span className="inline-flex items-center gap-1">
                  <MessageSquare className="h-3 w-3" /> {(card.comments ?? []).length}
                </span>
              )}
              {assigneeCount > 0 && (
                <span className="inline-flex items-center gap-1">
                  <div className="flex -space-x-1">
                    {Array.from({ length: Math.min(assigneeCount, 3) }).map((_, i) => (
                      <div
                        key={i}
                        className="h-4 w-4 rounded-full border border-card bg-primary/30"
                      />
                    ))}
                  </div>
                  {assigneeCount > 3 && (
                    <span className="text-[0.65rem]">+{assigneeCount - 3}</span>
                  )}
                </span>
              )}
            </div>
          )}
        </button>

        <button
          onClick={onDelete}
          aria-label={`Delete ${card.title}`}
          className="opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
        >
          <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
        </button>
      </div>
    </div>
  );
}
