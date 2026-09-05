import { createServerFn, createMiddleware } from "@tanstack/react-start";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { board as boardTable, workspace as workspaceTable, workspaceMember } from "@/lib/db/schema";
import { auth } from "@/lib/auth/server";
import { broadcastToWorkspace } from "@/lib/realtime";
import type { BoardState } from "@/lib/board";

// This version of TanStack Start doesn't expose the incoming Request to server
// function handlers directly, so a request middleware captures it out-of-band.
let currentRequest: Request | undefined;

const captureRequest = createMiddleware().server(async ({ next, request }) => {
  currentRequest = request;
  try {
    return await next();
  } finally {
    currentRequest = undefined;
  }
});

async function getUserId(): Promise<string | null> {
  const request = currentRequest;
  if (!request) return null;
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    return session?.user.id ?? null;
  } catch {
    // Auth not configured (no DATABASE_URL) — treat as unauthenticated.
    return null;
  }
}

// ─── Board sync (per workspace) ─────────────────────────────────────────────

export const fetchBoard = createServerFn({ method: "GET" })
  .middleware([captureRequest])
  .validator((input: unknown) => {
    const { workspaceId } = (input ?? {}) as { workspaceId?: string };
    return { workspaceId: workspaceId ?? null };
  })
  .handler(async ({ data }) => {
    const userId = await getUserId();
    if (!userId) return { authenticated: false as const, state: null };

    if (!data.workspaceId) return { authenticated: true as const, state: null };

    try {
      // Only workspace members have access. The app models one board per
      // workspace, so membership is checked against workspace_member.
      const wsMembership = await db
        .select({ userId: workspaceMember.userId })
        .from(workspaceMember)
        .where(
          and(
            eq(workspaceMember.userId, userId),
            eq(workspaceMember.workspaceId, data.workspaceId),
          ),
        )
        .limit(1);

      if (!wsMembership.length) {
        return { authenticated: true as const, state: null };
      }

      const rows = await db
        .select()
        .from(boardTable)
        .where(eq(boardTable.workspaceId, data.workspaceId))
        .limit(1);

      return { authenticated: true as const, state: rows[0]?.state ?? null };
    } catch {
      // Database not available — return no cloud state so local board is used.
      return { authenticated: true as const, state: null };
    }
  });

export const saveBoardToCloud = createServerFn({ method: "POST" })
  .middleware([captureRequest])
  .validator((input: unknown) => {
    if (!input || typeof input !== "object") throw new Error("Invalid payload");
    const { state, workspaceId } = input as {
      state?: unknown;
      workspaceId?: string;
    };
    if (!state || typeof state !== "object") throw new Error("Missing board state");
    if (!workspaceId || typeof workspaceId !== "string") throw new Error("Missing workspaceId");
    return { state: state as BoardState, workspaceId };
  })
  .handler(async ({ data }) => {
    const userId = await getUserId();
    if (!userId) throw new Error("Not authenticated");

    // Only workspace members may write to the board.
    const membership = await db
      .select({ userId: workspaceMember.userId })
      .from(workspaceMember)
      .where(
        and(eq(workspaceMember.userId, userId), eq(workspaceMember.workspaceId, data.workspaceId)),
      )
      .limit(1);
    if (!membership.length) throw new Error("Not a workspace member");

    // board.workspaceId has no unique constraint, so `onConflictDoUpdate` is
    // not valid — do an explicit read-then-write upsert keyed on the row id.
    const [existing] = await db
      .select({ id: boardTable.id })
      .from(boardTable)
      .where(eq(boardTable.workspaceId, data.workspaceId))
      .limit(1);

    if (existing) {
      await db
        .update(boardTable)
        .set({ state: data.state, updatedAt: new Date() })
        .where(eq(boardTable.id, existing.id));
    } else {
      await db
        .insert(boardTable)
        .values({ workspaceId: data.workspaceId, state: data.state, updatedAt: new Date() });
    }

    broadcastToWorkspace(data.workspaceId, "board_update", {
      savedAt: new Date().toISOString(),
    });

    return { ok: true as const };
  });

// ─── Workspace management ────────────────────────────────────────────────────

export const listWorkspaces = createServerFn({ method: "GET" })
  .middleware([captureRequest])
  .handler(async () => {
    const userId = await getUserId();
    if (!userId) return { authenticated: false as const, workspaces: [] };

    try {
      const rows = await db
        .select({
          id: workspaceTable.id,
          name: workspaceTable.name,
          slug: workspaceTable.slug,
          ownerId: workspaceTable.ownerId,
          createdAt: workspaceTable.createdAt,
          role: workspaceMember.role,
        })
        .from(workspaceMember)
        .innerJoin(workspaceTable, eq(workspaceMember.workspaceId, workspaceTable.id))
        .where(eq(workspaceMember.userId, userId));

      return { authenticated: true as const, workspaces: rows };
    } catch {
      return { authenticated: true as const, workspaces: [] };
    }
  });

export const createWorkspace = createServerFn({ method: "POST" })
  .middleware([captureRequest])
  .validator((input: unknown) => {
    const { name } = (input ?? {}) as { name?: string };
    if (!name || typeof name !== "string" || !name.trim())
      throw new Error("Workspace name is required");
    return { name: name.trim() };
  })
  .handler(async ({ data }) => {
    const userId = await getUserId();
    if (!userId) throw new Error("Not authenticated");

    const slug = data.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    const created = await db
      .transaction(async (tx) => {
        const [ws] = await tx
          .insert(workspaceTable)
          .values({ name: data.name, slug, ownerId: userId })
          .returning();

        if (!ws) throw new Error("Failed to create workspace");

        await tx.insert(workspaceMember).values({
          workspaceId: ws.id,
          userId,
          role: "owner",
        });

        return ws;
      })
      .catch((error) => {
        throw error;
      });

    return { ok: true as const, workspace: created };
  });
