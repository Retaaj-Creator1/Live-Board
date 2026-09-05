import { useEffect, useRef, useState } from "react";
import { realtimePoll } from "@/lib/realtime";

type RealtimeEvent = {
  type: string;
  payload: unknown;
};

const POLL_INTERVAL_MS = 5_000;

/**
 * Lightweight realtime via polling. This TanStack Start version has no SSE
 * API-route support, so we compare change markers (board + latest activity
 * timestamps) against the database and emit a synthetic event when they move.
 */
export function useRealtime(workspaceId: string | null, userId: string | null) {
  const [connected, setConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<RealtimeEvent | null>(null);
  const markers = useRef<{ boardUpdatedAt: string | null; latestActivityAt: string | null }>({
    boardUpdatedAt: null,
    latestActivityAt: null,
  });

  useEffect(() => {
    if (!workspaceId || !userId) {
      setConnected(false);
      markers.current = { boardUpdatedAt: null, latestActivityAt: null };
      return;
    }

    let cancelled = false;

    const poll = async () => {
      try {
        const res = await realtimePoll({ data: { workspaceId } });
        if (cancelled) return;
        if (!res.authenticated) {
          setConnected(false);
          return;
        }
        const prev = markers.current;
        if (res.boardUpdatedAt !== prev.boardUpdatedAt) {
          prev.boardUpdatedAt = res.boardUpdatedAt;
          setLastEvent({ type: "board_update", payload: { updatedAt: res.boardUpdatedAt } });
        }
        if (res.latestActivityAt !== prev.latestActivityAt) {
          prev.latestActivityAt = res.latestActivityAt;
          setLastEvent({ type: "activity", payload: { activityAt: res.latestActivityAt } });
        }
        setConnected(true);
      } catch {
        if (!cancelled) setConnected(false);
      }
    };

    void poll();
    const timer = setInterval(poll, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(timer);
      setConnected(false);
    };
  }, [workspaceId, userId]);

  return { connected, lastEvent };
}
