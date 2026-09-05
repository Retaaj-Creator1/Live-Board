import { useState } from "react";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { LABEL_COLORS, labelClass, labelDot, type Label, type LabelColor } from "@/lib/board";
import type { LabelStyle } from "@/lib/theme";

type Props = {
  labels: Label[];
  labelStyle?: LabelStyle;
  selected: string[];
  onToggle: (labelId: string) => void;
  onCreate: (name: string, color: LabelColor) => void;
  onUpdate: (labelId: string, patch: { name?: string; color?: LabelColor }) => void;
  onDelete: (labelId: string) => void;
};

function ColorRow({
  value,
  onChange,
}: {
  value: LabelColor;
  onChange: (color: LabelColor) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {LABEL_COLORS.map((c) => (
        <button
          key={c.id}
          onClick={() => onChange(c.id)}
          aria-label={c.name}
          aria-pressed={value === c.id}
          className={cn(
            "h-5 w-5 rounded-full ring-offset-2 ring-offset-background transition-all",
            c.dot,
            value === c.id ? "ring-2 ring-ring" : "opacity-60 hover:opacity-100",
          )}
        />
      ))}
    </div>
  );
}

export function LabelPicker({
  labels,
  labelStyle = "soft",
  selected,
  onToggle,
  onCreate,
  onUpdate,
  onDelete,
}: Props) {
  const [managing, setManaging] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState<LabelColor>("amber");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const create = () => {
    if (!newName.trim()) return;
    onCreate(newName, newColor);
    setNewName("");
  };

  return (
    <section className="space-y-2">
      <div className="flex items-center gap-2">
        <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Labels
        </h3>
        <button
          onClick={() => setManaging((m) => !m)}
          className="ml-auto text-xs text-muted-foreground hover:text-foreground"
        >
          {managing ? "Done" : "Edit labels"}
        </button>
      </div>

      {!managing && (
        <div className="flex flex-wrap gap-2">
          {labels.map((label) => {
            const active = selected.includes(label.id);
            return (
              <button
                key={label.id}
                onClick={() => onToggle(label.id)}
                aria-pressed={active}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium transition-opacity",
                  labelClass(label.color, labelStyle),
                  !active && "opacity-40 hover:opacity-70",
                )}
              >
                {label.name}
              </button>
            );
          })}
          {labels.length === 0 && (
            <p className="text-xs text-muted-foreground">
              No labels yet — use “Edit labels” to create your own.
            </p>
          )}
        </div>
      )}

      {managing && (
        <div className="space-y-2 rounded-lg border border-border bg-card/60 p-3">
          <ul className="space-y-2">
            {labels.map((label) => (
              <li key={label.id} className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className={cn("h-3 w-3 shrink-0 rounded-full", labelDot(label.color))} />
                  {editingId === label.id ? (
                    <input
                      autoFocus
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          onUpdate(label.id, { name: editName });
                          setEditingId(null);
                        }
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      className="flex-1 rounded-md border border-border bg-input/40 px-2 py-1 text-sm outline-none focus:border-ring"
                    />
                  ) : (
                    <span className="flex-1 text-sm">{label.name}</span>
                  )}
                  {editingId === label.id ? (
                    <button
                      onClick={() => {
                        onUpdate(label.id, { name: editName });
                        setEditingId(null);
                      }}
                      aria-label={`Save ${label.name}`}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setEditName(label.name);
                        setEditingId(label.id);
                      }}
                      aria-label={`Rename ${label.name}`}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => onDelete(label.id)}
                    aria-label={`Delete label ${label.name}`}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <ColorRow value={label.color} onChange={(color) => onUpdate(label.id, { color })} />
              </li>
            ))}
          </ul>

          <div className="space-y-2 border-t border-border pt-2">
            <div className="flex items-center gap-2">
              <input
                value={newName}
                placeholder="New label name"
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && create()}
                aria-label="New label name"
                className="flex-1 rounded-md border border-border bg-input/40 px-2 py-1 text-sm outline-none placeholder:text-muted-foreground focus:border-ring"
              />
              <button
                onClick={create}
                className="inline-flex items-center gap-1 rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90"
              >
                <Plus className="h-3.5 w-3.5" /> Create
              </button>
              {newName && (
                <button
                  onClick={() => setNewName("")}
                  aria-label="Clear new label"
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <ColorRow value={newColor} onChange={setNewColor} />
          </div>
        </div>
      )}
    </section>
  );
}
