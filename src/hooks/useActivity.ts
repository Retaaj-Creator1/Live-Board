import { useCallback, useEffect, useState } from "react";
import { listActivity, type ActivityItem } from "@/lib/realtime";

type ActivityState = {
  items: ActivityItem[];
  loading: boolean;
  refresh: () => void;
};

export function useActivity(workspaceId: string | null): ActivityState {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchActivity = useCallback(async () => {
    if (!workspaceId) {
      setItems([]);
      return;
    }
    setLoading(true);
    try {
      const res = await listActivity({ data: { workspaceId, limit: 50 } });
      if (res.authenticated) {
        setItems(res.items);
      }
    } catch {
      /* keep stale data */
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    void fetchActivity();
  }, [fetchActivity]);

  return { items, loading, refresh: fetchActivity };
}
