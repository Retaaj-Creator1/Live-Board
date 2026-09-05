import { useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripHorizontal, Plus, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { KanbanCard } from "./KanbanCard";
import { matchesQuery, type BoardState, type Column, type Label } from "@/lib/board";
import type { LabelStyle } from "@/lib/theme";

type Props = {
  column: Column;
  cards: BoardState["cards"];
  boardLabels: Label[];
  labelStyle?: LabelStyle;
  query: string;
  onAddCard: (title: string) => void;
  onOpenCard: (cardId: string) => void;
  onDeleteCard: (cardId: string) => void;
  onRenameColumn: (title: string) => void;
  onDeleteColumn: () => void;
};

export function BoardColumn({
  column,
  cards,
  boardLabels,
  labelStyle = "soft",
  query,
  onAddCard,
  onOpenCard,
  onDeleteCard,
  onRenameColumn,
  onDeleteColumn,
}: Props) {
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `column:${column.id}`,
    data: { type: "column", columnId: column.id },
  });
  const {
    attributes,
    listeners,
    setNodeRef: setSortRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `col:${column.id}`, data: { type: "columnSort", columnId: column.id } });

  const [composing, setComposing] = useState(false);
  const [draft, setDraft] = useState("");
  const [titleDraft, setTitleDraft] = useState(column.title);
  const [editingTitle, setEditingTitle] = useState(false);

  const submitCard = () => {
    onAddCard(draft);
    setDraft("");
  };

  const visible = column.cardIds.filter(
    (id) => cards[id] && matchesQuery(cards[id]!, boardLabels, query),
  );
  const hidden = column.cardIds.length - visible.length;

  return (
    <section
      ref={setSortRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(
        "flex w-[19rem] shrink-0 flex-col rounded-xl border border-border bg-secondary/40 backdrop-blur",
        isOver && "border-primary/60 bg-secondary/70",
        isDragging && "opacity-50",
      )}
    >
      <header className="flex items-center gap-2 px-3 pt-3 pb-2">
        <button
          {...attributes}
          {...listeners}
          aria-label={`Drag list ${column.title}`}
          className="cursor-grab text-muted-foreground/60 transition-colors hover:text-foreground active:cursor-grabbing"
        >
          <GripHorizontal className="h-4 w-4" />
        </button>
        {editingTitle ? (
          <input
            autoFocus
            value={titleDraft}
            onChange={(e) => setTitleDraft(e.target.value)}
            onBlur={() => {
              if (titleDraft.trim()) {
                onRenameColumn(titleDraft.trim());
              } else {
                setTitleDraft(column.title);
              }
              setEditingTitle(false);
            }}
            onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
            className="w-full bg-transparent text-sm font-semibold tracking-wide uppercase outline-none"
          />
        ) : (
          <button
            onClick={() => {
              setTitleDraft(column.title);
              setEditingTitle(true);
            }}
            className="text-sm font-semibold tracking-wide text-foreground uppercase"
          >
            {column.title}
          </button>
        )}
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
          {column.cardIds.length}
        </span>
        <button
          onClick={onDeleteColumn}
          aria-label={`Delete list ${column.title}`}
          className="ml-auto text-muted-foreground transition-colors hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </header>

      <div ref={setDropRef} className="flex min-h-24 flex-col gap-2 px-3 pb-2">
        <SortableContext items={visible} strategy={verticalListSortingStrategy}>
          {visible.map((id) => (
            <KanbanCard
              key={id}
              card={cards[id]!}
              boardLabels={boardLabels}
              labelStyle={labelStyle}
              assigneeCount={(cards[id]!.assigneeIds ?? []).length}
              onOpen={() => onOpenCard(id)}
              onDelete={() => onDeleteCard(id)}
            />
          ))}
        </SortableContext>
        {visible.length === 0 && (
          <p className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">
            {query ? "No matching cards" : "Drop cards here"}
          </p>
        )}
        {query && hidden > 0 && visible.length > 0 && (
          <p className="text-center text-xs text-muted-foreground">{hidden} hidden by filter</p>
        )}
      </div>

      <div className="px-3 pb-3">
        {composing ? (
          <div className="rounded-lg border border-border bg-card p-2">
            <textarea
              autoFocus
              rows={2}
              value={draft}
              placeholder="What needs doing?"
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submitCard();
                }
                if (e.key === "Escape") setComposing(false);
              }}
              className="w-full resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            <div className="mt-1 flex items-center gap-2">
              <button
                onClick={submitCard}
                className="rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90"
              >
                Add card
              </button>
              <button
                onClick={() => setComposing(false)}
                aria-label="Cancel"
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setComposing(true)}
            className="flex w-full items-center gap-1.5 rounded-lg px-2 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Plus className="h-4 w-4" /> Add a card
          </button>
        )}
      </div>
    </section>
  );
}
