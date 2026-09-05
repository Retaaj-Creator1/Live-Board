import { useCallback, useEffect, useState } from "react";
import { listWorkspaces, createWorkspace } from "@/lib/board-sync";

type Workspace = {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  createdAt: Date;
  role?: string;
};

type WorkspaceState = {
  workspaces: Workspace[];
  currentWorkspaceId: string | null;
  loading: boolean;
  selectWorkspace: (id: string) => void;
  createNewWorkspace: (name: string) => Promise<{ ok: boolean; error?: string }>;
};

const STORAGE_KEY = "openboard.currentWorkspaceId";

export function useWorkspace(userId?: string | null): WorkspaceState {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Load selected workspace from localStorage on mount.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) setCurrentWorkspaceId(stored);
  }, []);

  // Fetch workspaces when user signs in.
  useEffect(() => {
    if (!userId) {
      setWorkspaces([]);
      setCurrentWorkspaceId(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    listWorkspaces()
      .then((res) => {
        if (cancelled) return;
        if (res.authenticated) {
          setWorkspaces(res.workspaces);
          // Auto-select first workspace if none selected.
          setCurrentWorkspaceId((prev) => {
            if (prev && res.workspaces.some((w) => w.id === prev)) return prev;
            return res.workspaces[0]?.id ?? null;
          });
        }
      })
      .catch(() => {
        if (!cancelled) setWorkspaces([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const selectWorkspace = useCallback((id: string) => {
    setCurrentWorkspaceId(id);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, id);
    }
  }, []);

  const createNewWorkspace = useCallback(
    async (name: string) => {
      try {
        const res = await createWorkspace({ data: { name } });
        if (res.ok) {
          const newWorkspace: Workspace = {
            id: res.workspace.id,
            name: res.workspace.name,
            slug: res.workspace.slug,
            ownerId: res.workspace.ownerId,
            createdAt: res.workspace.createdAt,
            role: "owner",
          };
          setWorkspaces((prev) => [...prev, newWorkspace]);
          selectWorkspace(newWorkspace.id);
          return { ok: true };
        }
        return { ok: false, error: "Failed to create workspace" };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to create workspace";
        return { ok: false, error: message };
      }
    },
    [selectWorkspace],
  );

  return {
    workspaces,
    currentWorkspaceId,
    loading,
    selectWorkspace,
    createNewWorkspace,
  };
}
