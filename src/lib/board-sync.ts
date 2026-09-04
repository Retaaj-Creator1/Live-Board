import { createServerFn, createMiddleware } from "@tanstack/react-start";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { board as boardTable } from "@/lib/db/schema";
import { auth } from "@/lib/auth/server";
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
  const session = await auth.api.getSession({ headers: request.headers });
  return session?.user.id ?? null;
}

export const fetchBoard = createServerFn({ method: "GET" })
  .middleware([captureRequest])
  .handler(async () => {
    const userId = await getUserId();
    if (!userId) return { authenticated: false as const, state: null };

    const rows = await db
      .select()
      .from(boardTable)
      .where(eq(boardTable.userId, userId))
      .limit(1);

    return { authenticated: true as const, state: rows[0]?.state ?? null };
  });

export const saveBoardToCloud = createServerFn({ method: "POST" })
  .middleware([captureRequest])
  .validator((input: unknown) => {
    if (!input || typeof input !== "object") throw new Error("Invalid payload");
    const { state } = input as { state?: unknown };
    if (!state || typeof state !== "object") throw new Error("Missing board state");
    return { state: state as BoardState };
  })
  .handler(async ({ data }) => {
    const userId = await getUserId();
    if (!userId) throw new Error("Not authenticated");

    await db
      .insert(boardTable)
      .values({ userId, state: data.state, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: boardTable.userId,
        set: { state: data.state, updatedAt: new Date() },
      });

    return { ok: true as const };
  });