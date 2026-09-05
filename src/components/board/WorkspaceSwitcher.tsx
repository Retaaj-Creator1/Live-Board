import { useState } from "react";
import { ChevronDown, Plus, Building2 } from "lucide-react";

type Workspace = {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  role?: string;
};

type Props = {
  workspaces: Workspace[];
  currentWorkspaceId: string | null;
  onSelect: (id: string) => void;
  onCreate: (name: string) => Promise<{ ok: boolean; error?: string }>;
};

export function WorkspaceSwitcher({ workspaces, currentWorkspaceId, onSelect, onCreate }: Props) {
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const current = workspaces.find((w) => w.id === currentWorkspaceId);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setError(null);
    const res = await onCreate(name.trim());
    if (res.ok) {
      setName("");
      setCreating(false);
      setOpen(false);
    } else {
      setError(res.error ?? "Failed to create workspace");
    }
  };

  if (!workspaces.length) {
    return (
      <div className="w-72 rounded-lg border border-border bg-popover p-3 shadow-lg">
        <div className="space-y-2">
          <input
            autoFocus
            value={name}
            placeholder="Workspace name"
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void handleCreate();
              if (e.key === "Escape") setName("");
            }}
            className="w-full rounded-md border border-border bg-input/40 px-2 py-1.5 text-sm outline-none placeholder:text-muted-foreground focus:border-ring"
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex gap-1">
            <button
              onClick={() => void handleCreate()}
              disabled={!name.trim()}
              className="flex-1 rounded-md bg-primary px-2 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-40"
            >
              Create workspace
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium transition-colors hover:border-ring"
      >
        <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="max-w-[12rem] truncate">{current?.name ?? "Select workspace"}</span>
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-64 rounded-lg border border-border bg-popover p-1 shadow-lg">
          <div className="max-h-64 overflow-y-auto">
            {workspaces.map((ws) => (
              <button
                key={ws.id}
                onClick={() => {
                  onSelect(ws.id);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-secondary ${
                  ws.id === currentWorkspaceId ? "bg-secondary font-medium" : ""
                }`}
              >
                <span className="truncate">{ws.name}</span>
                <span className="ml-2 shrink-0 text-xs text-muted-foreground">{ws.role}</span>
              </button>
            ))}
          </div>

          <div className="my-1 border-t border-border" />

          {creating ? (
            <div className="space-y-2 p-2">
              <input
                autoFocus
                value={name}
                placeholder="Workspace name"
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void handleCreate();
                  if (e.key === "Escape") setCreating(false);
                }}
                className="w-full rounded-md border border-border bg-input/40 px-2 py-1.5 text-sm outline-none placeholder:text-muted-foreground focus:border-ring"
              />
              {error && <p className="text-xs text-destructive">{error}</p>}
              <div className="flex gap-1">
                <button
                  onClick={() => void handleCreate()}
                  className="flex-1 rounded-md bg-primary px-2 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                >
                  Create
                </button>
                <button
                  onClick={() => {
                    setCreating(false);
                    setName("");
                    setError(null);
                  }}
                  className="flex-1 rounded-md border border-border px-2 py-1.5 text-xs hover:bg-secondary"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setCreating(true)}
              className="flex w-full items-center gap-1.5 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <Plus className="h-3.5 w-3.5" /> New workspace
            </button>
          )}
        </div>
      )}
    </div>
  );
}
