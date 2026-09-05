import { useState, useRef, useEffect } from "react";
import { UserPlus, X, Users } from "lucide-react";
import { useMembers } from "@/hooks/useMembers";
import type { MemberInfo } from "@/lib/realtime";

type Props = {
  workspaceId: string | null;
  selectedIds: string[];
  onChange: (ids: string[]) => void;
};

export function AssigneePicker({ workspaceId, selectedIds, onChange }: Props) {
  const { members } = useMembers(workspaceId);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const selectedMembers = members.filter((m) => selectedIds.includes(m.id));
  const available = members.filter((m) => !selectedIds.includes(m.id));

  const toggle = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((x) => x !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2 py-1 text-xs text-muted-foreground transition-colors hover:border-ring hover:text-foreground"
      >
        <Users className="h-3.5 w-3.5" />
        {selectedMembers.length === 0 ? (
          <span>Assign</span>
        ) : (
          <div className="flex -space-x-1.5">
            {selectedMembers.slice(0, 3).map((m) => (
              <div
                key={m.id}
                className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 text-[10px] font-medium text-primary ring-2 ring-background"
                title={m.name}
              >
                {m.name.slice(0, 1).toUpperCase()}
              </div>
            ))}
            {selectedMembers.length > 3 && (
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[10px] font-medium ring-2 ring-background">
                +{selectedMembers.length - 3}
              </div>
            )}
          </div>
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-64 rounded-lg border border-border bg-popover p-1 shadow-lg">
          {selectedMembers.length > 0 && (
            <div className="space-y-1 p-2">
              <p className="text-xs font-medium text-muted-foreground">Assigned</p>
              {selectedMembers.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm"
                >
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-xs font-medium text-primary">
                      {m.name.slice(0, 1).toUpperCase()}
                    </div>
                    <span className="truncate">{m.name}</span>
                  </div>
                  <button
                    onClick={() => toggle(m.id)}
                    className="rounded-md p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
                    aria-label={`Remove ${m.name}`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              <div className="my-1 border-t border-border" />
            </div>
          )}

          {available.length === 0 ? (
            <p className="p-3 text-center text-xs text-muted-foreground">
              No other members to assign.
            </p>
          ) : (
            <div className="max-h-48 overflow-y-auto p-1">
              <p className="px-2 py-1 text-xs font-medium text-muted-foreground">Members</p>
              {available.map((m) => (
                <button
                  key={m.id}
                  onClick={() => toggle(m.id)}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-secondary"
                >
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-xs font-medium text-primary">
                    {m.name.slice(0, 1).toUpperCase()}
                  </div>
                  <span className="truncate">{m.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
