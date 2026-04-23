import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Coffee, Radio } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { formatUsername } from "@/lib/username";
import { getCurrentStudyInfo } from "@/lib/studyPresence";
import type { StudyGroupMember } from "@/services/studyGroups";

interface Props {
  groupId: string;
  members: StudyGroupMember[];
}

interface PresenceMeta {
  studying: boolean;
  startedAt?: number;
  subject?: string;
}

export default function StudyStatusPanel({ groupId, members }: Props) {
  const { user } = useAuth();
  const [presence, setPresence] = useState<Map<string, PresenceMeta>>(new Map());
  const [, setTick] = useState(0);

  // Re-render every 30s to refresh elapsed counters
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 30_000);
    return () => clearInterval(t);
  }, []);

  // Subscribe to the same presence channel as MembersPanel — reuse the channel id.
  useEffect(() => {
    if (!user) return;
    const channel = supabase.channel(`study-group-presence-${groupId}`, {
      config: { presence: { key: user.id } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<PresenceMeta>();
        const next = new Map<string, PresenceMeta>();
        Object.entries(state).forEach(([uid, metas]) => {
          // pick the freshest meta entry for this user
          const meta = metas[metas.length - 1];
          if (meta) next.set(uid, meta);
        });
        setPresence(next);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          const info = getCurrentStudyInfo();
          await channel.track(
            info
              ? { studying: true, startedAt: info.startedAt, subject: info.subject }
              : { studying: false },
          );
        }
      });

    const interval = setInterval(async () => {
      if (channel.state !== "joined") return;
      const info = getCurrentStudyInfo();
      await channel.track(
        info
          ? { studying: true, startedAt: info.startedAt, subject: info.subject }
          : { studying: false },
      );
    }, 15_000);

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [groupId, user?.id]);

  // Sort: studying first (longest first), then idle alphabetically
  const sorted = [...members].sort((a, b) => {
    const pa = presence.get(a.user_id);
    const pb = presence.get(b.user_id);
    const aLive = !!(pa?.studying && a.share_status);
    const bLive = !!(pb?.studying && b.share_status);
    if (aLive && !bLive) return -1;
    if (!aLive && bLive) return 1;
    if (aLive && bLive) {
      return (pa?.startedAt ?? 0) - (pb?.startedAt ?? 0); // earlier start = studying longer
    }
    return (a.profile?.full_name ?? "").localeCompare(b.profile?.full_name ?? "");
  });

  const studyingCount = sorted.filter(
    (m) => m.share_status && presence.get(m.user_id)?.studying,
  ).length;
  const onlineCount = sorted.filter(
    (m) => m.share_status && presence.has(m.user_id),
  ).length;

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-lg flex items-center gap-2">
            <Radio className="h-4 w-4 text-success animate-pulse" />
            Status de estudo
          </h2>
          <p className="text-xs text-muted-foreground">
            Veja em tempo real quem está estudando agora.
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <Badge variant="secondary" className="shrink-0">
            {studyingCount} estudando
          </Badge>
          <Badge variant="outline" className="shrink-0 text-xs">
            {onlineCount} online
          </Badge>
        </div>
      </div>

      <div className="space-y-2">
        {sorted.map((m) => {
          const meta = presence.get(m.user_id);
          const sharing = m.share_status;
          const isOnline = !!meta && sharing;
          const isLive = !!meta?.studying && sharing;
          const startedAt = meta?.startedAt;
          const elapsedMin = startedAt
            ? Math.max(0, Math.floor((Date.now() - startedAt) / 60_000))
            : 0;
          const isMe = m.user_id === user?.id;

          return (
            <div
              key={m.id}
              className={cn(
                "flex items-center gap-3 p-3 rounded-xl border transition-colors",
                isLive
                  ? "border-success/30 bg-success/5"
                  : isOnline
                    ? "border-primary/20 bg-primary/5"
                    : "border-border/50 bg-card/40",
              )}
            >
              <div className="relative">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={m.profile?.avatar_url ?? undefined} />
                  <AvatarFallback>
                    {(m.profile?.full_name ?? "?").charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {isLive ? (
                  <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-success border-2 border-background animate-pulse" />
                ) : isOnline ? (
                  <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-primary border-2 border-background" />
                ) : (
                  <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-muted-foreground/40 border-2 border-background" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-medium truncate">
                    {m.profile?.full_name || "Usuário"}
                    {isMe && (
                      <span className="text-xs text-muted-foreground ml-1">(você)</span>
                    )}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {formatUsername(m.profile?.username)}
                </p>
              </div>

              <div className="flex flex-col items-end gap-1 shrink-0 max-w-[55%]">
                {!sharing ? (
                  <Badge variant="outline" className="gap-1">
                    <Coffee className="h-3 w-3" />
                    Privacidade ativa
                  </Badge>
                ) : isLive ? (
                  <>
                    <Badge className="gap-1 bg-success text-success-foreground hover:bg-success/90">
                      <Radio className="h-3 w-3 animate-pulse" />
                      Estudando agora
                    </Badge>
                    {meta?.subject && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1 truncate max-w-full">
                        <BookOpen className="h-3 w-3 shrink-0" />
                        <span className="truncate">{meta.subject}</span>
                      </span>
                    )}
                    {elapsedMin > 0 && (
                      <span className="text-[11px] text-muted-foreground tabular-nums">
                        há {elapsedMin} min
                      </span>
                    )}
                  </>
                ) : isOnline ? (
                  <Badge variant="outline" className="gap-1 border-primary/40 text-primary">
                    <Radio className="h-3 w-3" />
                    Online
                  </Badge>
                ) : (
                  <Badge variant="outline" className="gap-1 text-muted-foreground">
                    <Coffee className="h-3 w-3" />
                    Offline
                  </Badge>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {sorted.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">
          Nenhum membro neste grupo ainda.
        </p>
      )}
    </div>
  );
}
