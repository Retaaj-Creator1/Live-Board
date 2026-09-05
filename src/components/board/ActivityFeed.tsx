import { useEffect } from "react";
import { useActivity } from "@/hooks/useActivity";
import type { ActivityItem } from "@/lib/realtime";

type Props = {
  workspaceId: string | null;
  refreshTrigger?: number;
};

function formatTime(dateStr: string): string {
  const now = new Date();
  const diff = now.getTime() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function describeActivity(item: ActivityItem): string {
  const name = item.userName ?? "Someone";
  const title = item.payload["title"] as string | undefined;
  const cardTitle = item.payload["cardTitle"] as string | undefined;
  switch (item.type) {
    case "card_created":
      return `${name} added card "${title ?? "Untitled"}"`;
    case "card_moved":
      return `${name} moved card "${title ?? "Untitled"}"`;
    case "card_updated":
      return `${name} updated card "${title ?? "Untitled"}"`;
    case "card_deleted":
      return `${name} deleted card "${title ?? "Untitled"}"`;
    case "comment_added":
      return `${name} commented on "${cardTitle ?? "a card"}"`;
    case "member_added":
      return `${name} joined the workspace`;
    case "board_created":
      return `${name} created the board`;
    default:
      return `${name} made a change`;
  }
}

export function ActivityFeed({ workspaceId, refreshTrigger }: Props) {
  const { items, loading, refresh } = useActivity(workspaceId);

  useEffect(() => {
    if (refreshTrigger) void refresh();
  }, [refreshTrigger, refresh]);

  if (loading && !items.length) {
    return (
      <div className="space-y-3 p-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex gap-3">
            <div className="h-8 w-8 shrink-0 rounded-full bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-3/4 rounded bg-muted" />
              <div className="h-2 w-1/2 rounded bg-muted/60" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="p-6 text-center text-sm text-muted-foreground">
        No activity yet. Changes will appear here.
      </div>
    );
  }

  return (
    <div className="space-y-1 p-2">
      {items.map((item) => (
        <div key={item.id} className="flex items-start gap-3 rounded-lg px-3 py-2 text-sm">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-medium text-primary">
            {(item.userName ?? "?").slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-foreground/90">{describeActivity(item)}</p>
            <p className="text-xs text-muted-foreground">{formatTime(item.createdAt)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
