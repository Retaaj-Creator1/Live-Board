import { useEffect, useState } from "react";
import { CalendarDays, Plus, Trash2, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  checklistProgress,
  type BoardSettings,
  type Card,
  type Label,
  type LabelColor,
} from "@/lib/board";
import { dialogTheme } from "@/lib/theme";
import { LabelPicker } from "./LabelPicker";
import { AttachmentList } from "./AttachmentList";
import { CommentSection } from "./CommentSection";
import { AssigneePicker } from "./AssigneePicker";
import { AiChecklistButton } from "./AiChecklistButton";

type Props = {
  card: Card | null;
  columnTitle?: string;
  labels: Label[];
  settings: BoardSettings;
  workspaceId?: string | null;
  onClose: () => void;
  onUpdate: (patch: Partial<Omit<Card, "id">>) => void;
  onToggleLabel: (label: string) => void;
  onCreateLabel: (name: string, color: LabelColor) => void;
  onUpdateLabel: (labelId: string, patch: { name?: string; color?: LabelColor }) => void;
  onDeleteLabel: (labelId: string) => void;
  onUploadFile: (file: File) => Promise<unknown>;
  onRemoveFile: (attachmentId: string) => void;
  onAddChecklistItem: (text: string) => void;
  onToggleChecklistItem: (itemId: string) => void;
  onRemoveChecklistItem: (itemId: string) => void;
  onAddComment: (text: string, mentions?: string[]) => void;
  onUpdateComment: (commentId: string, text: string) => void;
  onRemoveComment: (commentId: string) => void;
  onDelete: () => void;
};

export function CardDialog({
  card,
  columnTitle,
  labels,
  settings,
  workspaceId,
  onClose,
  onUpdate,
  onToggleLabel,
  onCreateLabel,
  onUpdateLabel,
  onDeleteLabel,
  onUploadFile,
  onRemoveFile,
  onAddChecklistItem,
  onToggleChecklistItem,
  onRemoveChecklistItem,
  onAddComment,
  onUpdateComment,
  onRemoveComment,
  onDelete,
}: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [item, setItem] = useState("");

  useEffect(() => {
    if (card) {
      setTitle(card.title);
      setDescription(card.description ?? "");
      setItem("");
    }
    // Intentionally keyed on the card's identity only: resets edits when the
    // dialog switches cards, but keeps in-progress edits while other fields
    // change (labels, checklist…) re-create the same card object.
  }, [card?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!card) return null;
  const progress = checklistProgress(card);
  const theme = dialogTheme(settings.dialogTheme, settings.boardTheme);
  const pct = progress.total ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <Dialog open={!!card} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="max-h-[90vh] overflow-y-auto sm:max-w-xl"
        style={{ ...theme.vars, background: theme.background }}
      >
        <DialogHeader>
          <DialogTitle className="sr-only">Card details</DialogTitle>
          <DialogDescription className="sr-only">
            Edit the title, labels, due date and checklist for this card.
          </DialogDescription>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => {
              if (title.trim()) {
                onUpdate({ title: title.trim() });
              } else {
                setTitle(card.title);
              }
            }}
            onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
            aria-label="Card title"
            className="w-full bg-transparent pr-8 text-left font-semibold text-lg tracking-tight outline-none"
          />
          {columnTitle && (
            <p className="text-xs text-muted-foreground uppercase">in {columnTitle}</p>
          )}
        </DialogHeader>

        <LabelPicker
          labels={labels}
          labelStyle={settings.labelStyle}
          selected={card.labels ?? []}
          onToggle={onToggleLabel}
          onCreate={onCreateLabel}
          onUpdate={onUpdateLabel}
          onDelete={onDeleteLabel}
        />

        <section className="space-y-2">
          <h3 className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            <CalendarDays className="h-3.5 w-3.5" /> Due date
          </h3>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={card.dueDate ?? ""}
              onChange={(e) => onUpdate({ dueDate: e.target.value || null })}
              aria-label="Due date"
              className="rounded-lg border border-border bg-input/40 px-3 py-1.5 text-sm outline-none focus:border-ring"
            />
            {card.dueDate && (
              <button
                onClick={() => onUpdate({ dueDate: null })}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Clear
              </button>
            )}
          </div>
        </section>

        <section className="space-y-2">
          <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Description
          </h3>
          <textarea
            rows={4}
            value={description}
            placeholder="Add more detail…"
            onChange={(e) => setDescription(e.target.value)}
            onBlur={() => {
              const next = description.trim();
              if (next !== (card.description ?? "")) onUpdate({ description: next });
            }}
            className="w-full resize-none rounded-lg border border-border bg-input/40 p-3 text-sm outline-none placeholder:text-muted-foreground focus:border-ring"
          />
        </section>

        <AttachmentList
          attachments={card.attachments ?? []}
          onUpload={onUploadFile}
          onRemove={onRemoveFile}
        />

        <section className="space-y-2">
          <h3 className="flex items-center gap-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Checklist
            {progress.total > 0 && (
              <span className="normal-case">
                {progress.done}/{progress.total}
              </span>
            )}
          </h3>
          {progress.total > 0 && (
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
            </div>
          )}
          <ul className="space-y-1">
            {(card.checklist ?? []).map((i) => (
              <li key={i.id} className="group flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={i.done}
                  onChange={() => onToggleChecklistItem(i.id)}
                  className="h-4 w-4 accent-primary"
                  aria-label={i.text}
                />
                <span
                  className={cn("flex-1 text-sm", i.done && "text-muted-foreground line-through")}
                >
                  {i.text}
                </span>
                <button
                  onClick={() => onRemoveChecklistItem(i.id)}
                  aria-label={`Remove ${i.text}`}
                  className="opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <X className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                </button>
              </li>
            ))}
          </ul>
          <div className="flex items-center gap-2">
            <input
              value={item}
              placeholder="Add an item"
              onChange={(e) => setItem(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  onAddChecklistItem(item);
                  setItem("");
                }
              }}
              className="flex-1 rounded-lg border border-border bg-input/40 px-3 py-1.5 text-sm outline-none placeholder:text-muted-foreground focus:border-ring"
            />
            <button
              onClick={() => {
                onAddChecklistItem(item);
                setItem("");
              }}
              className="inline-flex items-center gap-1 rounded-lg bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="h-3.5 w-3.5" /> Add
            </button>
          </div>
          <AiChecklistButton
            cardTitle={card.title}
            cardDescription={card.description}
            onAddItems={(items) => items.forEach((text) => onAddChecklistItem(text))}
          />
        </section>

        <section className="space-y-2">
          <h3 className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Assignees
          </h3>
          <AssigneePicker
            workspaceId={workspaceId ?? null}
            selectedIds={card.assigneeIds ?? []}
            onChange={(ids) => onUpdate({ assigneeIds: ids })}
          />
        </section>

        <CommentSection
          comments={card.comments ?? []}
          workspaceId={workspaceId ?? null}
          onAdd={onAddComment}
          onUpdate={onUpdateComment}
          onRemove={onRemoveComment}
        />

        <button
          onClick={() => {
            onDelete();
            onClose();
          }}
          className="inline-flex items-center gap-1.5 self-start rounded-lg border border-border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:border-destructive/50 hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" /> Delete card
        </button>
      </DialogContent>
    </Dialog>
  );
}
