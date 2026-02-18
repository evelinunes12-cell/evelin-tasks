import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Plus,
  Pencil,
  Trash2,
  ArrowRightLeft,
  Archive,
  UserPlus,
  UserMinus,
  Shield,
  History,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { logError } from "@/lib/logger";

interface ActivityEntry {
  id: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  entity_name: string | null;
  details: string | null;
  created_at: string;
  user_name?: string;
}

interface Props {
  environmentId: string;
}

const ACTION_CONFIG: Record<string, { icon: React.ElementType; label: string; color: string }> = {
  created: { icon: Plus, label: "criou", color: "text-green-500" },
  updated: { icon: Pencil, label: "editou", color: "text-blue-500" },
  deleted: { icon: Trash2, label: "excluiu", color: "text-red-500" },
  status_changed: { icon: ArrowRightLeft, label: "alterou status de", color: "text-amber-500" },
  archived: { icon: Archive, label: "arquivou", color: "text-muted-foreground" },
  member_added: { icon: UserPlus, label: "adicionou membro", color: "text-green-500" },
  member_removed: { icon: UserMinus, label: "removeu membro", color: "text-red-500" },
  permissions_changed: { icon: Shield, label: "alterou permissões de", color: "text-violet-500" },
};

const ENTITY_LABELS: Record<string, string> = {
  task: "tarefa",
  member: "",
};

export default function EnvironmentActivityTimeline({ environmentId }: Props) {
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActivities();
  }, [environmentId]);

  const fetchActivities = async () => {
    try {
      setLoading(true);

      // Fetch activity log
      const { data, error } = await supabase
        .from("environment_activity_log")
        .select("*")
        .eq("environment_id", environmentId)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;

      if (!data || data.length === 0) {
        setActivities([]);
        return;
      }

      // Get unique user IDs to fetch names
      const userIds = [...new Set(data.map((a) => a.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", userIds);

      const profileMap = new Map(
        (profiles || []).map((p) => [p.id, p.full_name || p.email])
      );

      setActivities(
        data.map((a) => ({
          ...a,
          user_name: profileMap.get(a.user_id) || "Usuário",
        }))
      );
    } catch (error) {
      logError("Error fetching activity log", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <History className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold mb-2">Nenhuma atividade registrada</h3>
          <p className="text-muted-foreground text-center">
            As ações dos membros neste grupo aparecerão aqui.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Group by date
  const groupedByDate = activities.reduce<Record<string, ActivityEntry[]>>((acc, activity) => {
    const dateKey = format(new Date(activity.created_at), "yyyy-MM-dd");
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(activity);
    return acc;
  }, {});

  return (
    <ScrollArea className="h-[600px]">
      <div className="space-y-6">
        {Object.entries(groupedByDate).map(([dateKey, entries]) => (
          <div key={dateKey}>
            <div className="sticky top-0 bg-background z-10 pb-2">
              <Badge variant="outline" className="text-xs font-medium">
                {format(new Date(dateKey), "dd 'de' MMMM, yyyy", { locale: ptBR })}
              </Badge>
            </div>
            <div className="space-y-2 ml-2 border-l-2 border-border pl-4">
              {entries.map((activity) => {
                const config = ACTION_CONFIG[activity.action] || {
                  icon: Pencil,
                  label: activity.action,
                  color: "text-muted-foreground",
                };
                const Icon = config.icon;
                const entityLabel = ENTITY_LABELS[activity.entity_type] || activity.entity_type;

                return (
                  <div
                    key={activity.id}
                    className="flex items-start gap-3 py-2 relative"
                  >
                    {/* Timeline dot */}
                    <div className={`absolute -left-[1.35rem] top-3 w-2.5 h-2.5 rounded-full border-2 border-background ${config.color} bg-current`} />
                    
                    <div className={`shrink-0 mt-0.5 ${config.color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">
                        <span className="font-medium">{activity.user_name}</span>{" "}
                        <span className="text-muted-foreground">{config.label}</span>{" "}
                        {entityLabel && (
                          <span className="text-muted-foreground">{entityLabel} </span>
                        )}
                        {activity.entity_name && (
                          <span className="font-medium">"{activity.entity_name}"</span>
                        )}
                      </p>
                      {activity.details && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {activity.details}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(activity.created_at), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
