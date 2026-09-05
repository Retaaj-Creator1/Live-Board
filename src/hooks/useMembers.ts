import { useCallback, useEffect, useState } from "react";
import { listMembers, type MemberInfo } from "@/lib/realtime";

type MembersState = {
  members: MemberInfo[];
  loading: boolean;
  refresh: () => void;
};

export function useMembers(workspaceId: string | null): MembersState {
  const [members, setMembers] = useState<MemberInfo[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchMembers = useCallback(async () => {
    if (!workspaceId) {
      setMembers([]);
      return;
    }
    setLoading(true);
    try {
      const res = await listMembers({ data: { workspaceId } });
      if (res.authenticated) {
        setMembers(res.members);
      }
    } catch {
      /* keep stale data */
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    void fetchMembers();
  }, [fetchMembers]);

  return { members, loading, refresh: fetchMembers };
}
