import { useState } from "react";
import { Check, MessageSquare, Pencil, Trash2 } from "lucide-react";
import type { Comment } from "@/lib/board";
import { useMembers } from "@/hooks/useMembers";
import { extractMentionIds } from "@/lib/realtime";
import { MentionInput } from "./MentionInput";

type Props = {
  comments: Comment[];
  workspaceId?: string | null;
  onAdd: (text: string, mentions?: string[]) => void;
  onUpdate: (commentId: string, text: string) => void;
  onRemove: (commentId: string) => void;
};

function when(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function CommentSection({ comments, workspaceId, onAdd, onUpdate, onRemove }: Props) {
  const { members } = useMembers(workspaceId ?? null);
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  const submit = (draftText: string) => {
    const trimmed = draftText.trim();
    if (!trimmed) return;
    onAdd(trimmed, extractMentionIds(trimmed, members));
    setDraft("");
  };

  const sorted = [...comments].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <section className="space-y-2">
      <h3 className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        <MessageSquare className="h-3.5 w-3.5" /> Comments
        {comments.length > 0 && <span className="normal-case">{comments.length}</span>}
      </h3>

      <div className="space-y-2">
        <MentionInput
          workspaceId={workspaceId ?? null}
          value={draft}
          onChange={setDraft}
          onSubmit={submit}
          placeholder="Write a comment… use @ to mention"
        />
        <div className="flex items-center gap-2">
          <button
            onClick={() => submit(draft)}
            disabled={!draft.trim()}
            className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-opacity hover:bg-primary/90 disabled:opacity-40"
          >
            Comment
          </button>
          <span className="text-xs text-muted-foreground">Enter to post, @ to mention</span>
        </div>
      </div>

      <ul className="space-y-2">
        {sorted.map((c) => (
          <li key={c.id} className="group rounded-lg border border-border bg-card/60 p-3">
            <div className="flex items-center gap-2">
              <span className="grid h-6 w-6 place-items-center rounded-full bg-primary/20 text-[0.65rem] font-semibold text-primary">
                {c.author.slice(0, 2).toUpperCase()}
              </span>
              <span className="text-xs font-medium">{c.author}</span>
              <span className="text-xs text-muted-foreground">{when(c.createdAt)}</span>
              <span className="ml-auto flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                {editingId === c.id ? (
                  <button
                    onClick={() => {
                      onUpdate(c.id, editText);
                      setEditingId(null);
                    }}
                    aria-label="Save comment"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <Check className="h-3.5 w-3.5" />
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setEditText(c.text);
                      setEditingId(c.id);
                    }}
                    aria-label="Edit comment"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                )}
                <button
                  onClick={() => onRemove(c.id)}
                  aria-label="Delete comment"
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </span>
            </div>

            {editingId === c.id ? (
              <textarea
                autoFocus
                rows={2}
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") setEditingId(null);
                }}
                aria-label="Edit comment text"
                className="mt-2 w-full resize-none rounded-md border border-border bg-input/40 p-2 text-sm outline-none focus:border-ring"
              />
            ) : (
              <p className="mt-1.5 whitespace-pre-wrap text-sm leading-snug">{c.text}</p>
            )}
          </li>
        ))}
        {comments.length === 0 && (
          <li className="text-xs text-muted-foreground">No comments yet.</li>
        )}
      </ul>
    </section>
  );
}
