import { createServerFn, createMiddleware } from "@tanstack/react-start";
import { eq, and, desc, max } from "drizzle-orm";
import { db } from "@/lib/db";
import { activity, board, notification, workspaceMember, user } from "@/lib/db/schema";
import { auth } from "@/lib/auth/server";

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
  if (!currentRequest) return null;
  try {
    const session = await auth.api.getSession({ headers: currentRequest.headers });
    return session?.user.id ?? null;
  } catch {
    return null;
  }
}

export type ActivityItem = {
  id: string;
  type: string;
  payload: { [k: string]: string | number | boolean | null };
  userId: string | null;
  userName: string | null;
  createdAt: string;
};
export type NotificationItem = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  read: boolean;
  link: string | null;
  createdAt: string;
};
export type MemberInfo = {
  id: string;
  name: string;
  email: string;
  image: string | null;
  role: string;
};

/**
 * Map `@Name` mentions in text to member ids. Matches against the member's
 * full name so multi-word names (e.g. "Jane Doe") are attributed correctly.
 */
export function extractMentionIds(text: string, members: MemberInfo[]): string[] {
  const normalized = text.toLowerCase();
  return members
    .filter((m) => m.name.toLowerCase() && normalized.includes(`@${m.name.toLowerCase()}`))
    .map((m) => m.id);
}

export const listActivity = createServerFn({ method: "GET" })
  .middleware([captureRequest])
  .validator((input: unknown) => {
    const { workspaceId, limit } = (input ?? {}) as { workspaceId?: string; limit?: number };
    return { workspaceId: workspaceId ?? null, limit: limit ?? 50 };
  })
  .handler(async ({ data }) => {
    const userId = await getUserId();
    if (!userId) return { authenticated: false as const, items: [] };
    if (!data.workspaceId) return { authenticated: true as const, items: [] };
    try {
      const rows = await db
        .select({
          id: activity.id,
          type: activity.type,
          payload: activity.payload,
          userId: activity.userId,
          userName: user.name,
          createdAt: activity.createdAt,
        })
        .from(activity)
        .leftJoin(user, eq(activity.userId, user.id))
        .where(eq(activity.workspaceId, data.workspaceId))
        .orderBy(desc(activity.createdAt))
        .limit(data.limit);
      const items: ActivityItem[] = rows.map((r) => ({
        id: r.id,
        type: r.type,
        payload: r.payload as ActivityItem["payload"],
        userId: r.userId,
        userName: r.userName ?? null,
        createdAt: r.createdAt.toISOString(),
      }));
      return { authenticated: true as const, items };
    } catch {
      return { authenticated: true as const, items: [] };
    }
  });

export const logActivity = createServerFn({ method: "POST" })
  .middleware([captureRequest])
  .validator((input: unknown) => {
    if (!input || typeof input !== "object") throw new Error("Invalid payload");
    const { workspaceId, boardId, type, payload } = input as {
      workspaceId?: string;
      boardId?: string | null;
      type?: string;
      payload?: Record<string, unknown>;
    };
    if (!workspaceId) throw new Error("Missing workspaceId");
    if (!type) throw new Error("Missing activity type");
    return { workspaceId, boardId: boardId ?? null, type, payload: payload ?? {} };
  })
  .handler(async ({ data }) => {
    const userId = await getUserId();
    if (!userId) return { ok: false as const };
    try {
      await db.insert(activity).values({
        workspaceId: data.workspaceId,
        boardId: data.boardId,
        userId,
        type: data.type,
        payload: data.payload,
      });
      broadcastToWorkspace(data.workspaceId, "activity", { sentAt: new Date().toISOString() });
      return { ok: true as const };
    } catch {
      return { ok: false as const };
    }
  });

// Poll-based realtime: SSE isn't available in this TanStack Start version, so
// clients compare change markers (board + latest activity timestamps).
export const realtimePoll = createServerFn({ method: "GET" })
  .middleware([captureRequest])
  .validator((input: unknown) => {
    const { workspaceId } = (input ?? {}) as { workspaceId?: string };
    return { workspaceId: workspaceId ?? null };
  })
  .handler(async ({ data }) => {
    const userId = await getUserId();
    if (!userId || !data.workspaceId) {
      return { authenticated: false as const, boardUpdatedAt: null, latestActivityAt: null };
    }
    try {
      const [boardRow] = await db
        .select({ updatedAt: board.updatedAt })
        .from(board)
        .where(eq(board.workspaceId, data.workspaceId))
        .limit(1);
      const [latest] = await db
        .select({ latest: max(activity.createdAt) })
        .from(activity)
        .where(eq(activity.workspaceId, data.workspaceId));
      const toIso = (value: Date | string | null | undefined): string | null =>
        value ? new Date(value).toISOString() : null;
      return {
        authenticated: true as const,
        boardUpdatedAt: toIso(boardRow?.updatedAt),
        latestActivityAt: toIso(latest?.latest),
      };
    } catch {
      return { authenticated: true as const, boardUpdatedAt: null, latestActivityAt: null };
    }
  });

export const createMentionNotifications = createServerFn({ method: "POST" })
  .middleware([captureRequest])
  .validator((input: unknown) => {
    if (!input || typeof input !== "object") throw new Error("Invalid payload");
    const { workspaceId, mentionedUserIds, actorName, cardTitle } = input as {
      workspaceId?: string;
      mentionedUserIds?: string[];
      actorName?: string;
      cardTitle?: string;
    };
    if (!workspaceId) throw new Error("Missing workspaceId");
    if (!Array.isArray(mentionedUserIds) || mentionedUserIds.length === 0)
      throw new Error("Missing mentionedUserIds");
    return {
      workspaceId,
      mentionedUserIds: mentionedUserIds.filter(Boolean) as string[],
      actorName: actorName ?? "Someone",
      cardTitle: cardTitle ?? null,
    };
  })
  .handler(async ({ data }) => {
    const userId = await getUserId();
    if (!userId) return { ok: false as const };
    try {
      await db.insert(notification).values(
        data.mentionedUserIds.map((targetId) => ({
          userId: targetId,
          workspaceId: data.workspaceId,
          type: "mention",
          title: `${data.actorName} mentioned you`,
          body: data.cardTitle ? `On "${data.cardTitle}"` : null,
          link: "/",
        })),
      );
      return { ok: true as const };
    } catch {
      return { ok: false as const };
    }
  });

export const listNotifications = createServerFn({ method: "GET" })
  .middleware([captureRequest])
  .handler(async () => {
    const userId = await getUserId();
    if (!userId) return { authenticated: false as const, items: [], unread: 0 };
    try {
      const rows = await db
        .select()
        .from(notification)
        .where(eq(notification.userId, userId))
        .orderBy(desc(notification.createdAt))
        .limit(50);
      const items: NotificationItem[] = rows.map((r) => ({
        id: r.id,
        type: r.type,
        title: r.title,
        body: r.body,
        read: r.read,
        link: r.link,
        createdAt: r.createdAt.toISOString(),
      }));
      return { authenticated: true as const, items, unread: rows.filter((r) => !r.read).length };
    } catch {
      return { authenticated: true as const, items: [], unread: 0 };
    }
  });

export const markNotificationRead = createServerFn({ method: "POST" })
  .middleware([captureRequest])
  .validator((input: unknown) => {
    const { id } = (input ?? {}) as { id?: string };
    if (!id) throw new Error("Missing notification id");
    return { id };
  })
  .handler(async ({ data }) => {
    const userId = await getUserId();
    if (!userId) return { ok: false as const };
    try {
      await db
        .update(notification)
        .set({ read: true })
        .where(and(eq(notification.id, data.id), eq(notification.userId, userId)));
      return { ok: true as const };
    } catch {
      return { ok: false as const };
    }
  });

export const markAllNotificationsRead = createServerFn({ method: "POST" })
  .middleware([captureRequest])
  .handler(async () => {
    const userId = await getUserId();
    if (!userId) return { ok: false as const };
    try {
      await db.update(notification).set({ read: true }).where(eq(notification.userId, userId));
      return { ok: true as const };
    } catch {
      return { ok: false as const };
    }
  });

export const listMembers = createServerFn({ method: "GET" })
  .middleware([captureRequest])
  .validator((input: unknown) => {
    const { workspaceId } = (input ?? {}) as { workspaceId?: string };
    return { workspaceId: workspaceId ?? null };
  })
  .handler(async ({ data }) => {
    const userId = await getUserId();
    if (!userId) return { authenticated: false as const, members: [] };
    if (!data.workspaceId) return { authenticated: true as const, members: [] };
    try {
      const rows = await db
        .select({
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          role: workspaceMember.role,
        })
        .from(workspaceMember)
        .innerJoin(user, eq(workspaceMember.userId, user.id))
        .where(eq(workspaceMember.workspaceId, data.workspaceId));
      return { authenticated: true as const, members: rows as MemberInfo[] };
    } catch {
      return { authenticated: true as const, members: [] };
    }
  });

/**
 * Push an event to every client subscribed to a workspace in this process.
 * Currently no component subscribes with an in-process sink (realtime uses
 * polling), so this is a cheap no-op unless a future transport registers.
 */
export function broadcastToWorkspace(workspaceId: string, event: string, payload: unknown): void {
  const key = `broadcast:${workspaceId}`;
  const listeners = (globalThis as Record<string, unknown>)[key];
  if (!(listeners instanceof Set)) return;
  const sink = listeners as Set<(e: string, p: unknown) => void>;
  sink.forEach((fn) => {
    try {
      fn(event, payload);
    } catch {
      /* ignore a failing subscriber */
    }
  });
}
