import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const QUERY_KEY = ["study-groups-unread-total"] as const;

async function fetchTotal(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("read", false)
    .like("link", "/grupos-de-estudo/%");
  if (error) throw error;
  return count ?? 0;
}

export function useStudyGroupsUnreadTotal() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: total = 0 } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => fetchTotal(user!.id),
    enabled: !!user?.id,
  });

  useEffect(() => {
    if (!user?.id) return;
    const ch = supabase
      .channel(`sg-unread-total-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => qc.invalidateQueries({ queryKey: QUERY_KEY })
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user?.id, qc]);

  return total;
}
