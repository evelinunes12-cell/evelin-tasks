import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  listGroupMembers, getWeeklyRanking, updateMyMemberPrefs, addMemberByIdentifier, removeMember,
  type StudyGroupMember,
} from "@/services/studyGroups";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Settings, UserPlus, Trophy, X, Crown } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { formatUsername } from "@/lib/username";
import { cn } from "@/lib/utils";

interface Props {
  groupId: string;
  members: StudyGroupMember[];
  isAdmin: boolean;
  onMembersChange: () => void;
}

export default function MembersPanel({ groupId, members, isAdmin, onMembersChange }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const myMember = members.find((m) => m.user_id === user?.id);
  const [livePresence, setLivePresence] = useState<Map<string, number>>(new Map()); // user_id -> startedAt(ms)
  const [, setTick] = useState(0); // forces re-render every 30s for elapsed counter
  const [inviteOpen, setInviteOpen] = useState(false);
  const [identifier, setIdentifier] = useState("");

  // Re-render every 30s to update "studying for Xmin" counter
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 30_000);
    return () => clearInterval(t);
  }, []);

  // Realtime presence: track who is studying right now (with start timestamp)
  useEffect(() => {
    if (!user) return;
    const channel = supabase.channel(`study-group-presence-${groupId}`, {
      config: { presence: { key: user.id } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<{ studying: boolean; startedAt?: number }>();
        const studyingUsers = new Map<string, number>();
        Object.entries(state).forEach(([uid, metas]) => {
          const meta = metas.find((m) => m.studying);
          if (meta) studyingUsers.set(uid, meta.startedAt ?? Date.now());
        });
        setLivePresence(studyingUsers);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          const info = detectStudying();
          await channel.track({
            studying: myMember?.share_status ? info.studying : false,
            startedAt: info.startedAt,
          });
        }
      });

    // Re-publish presence periodically so peers stay in sync with timer state
    const interval = setInterval(async () => {
      if (channel.state !== "joined") return;
      const info = detectStudying();
      await channel.track({
        studying: myMember?.share_status ? info.studying : false,
        startedAt: info.startedAt,
      });
    }, 15_000);

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [groupId, user?.id, myMember?.share_status, myMember?.id]);

  const { data: ranking, isLoading: loadingRanking } = useQuery({
    queryKey: ["study-group-ranking", groupId],
    queryFn: () => getWeeklyRanking(groupId),
    refetchInterval: 60_000,
  });

  const prefsMutation = useMutation({
    mutationFn: (prefs: { share_status?: boolean; share_metrics?: boolean }) =>
      updateMyMemberPrefs(myMember!.id, prefs),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["study-group-members", groupId] });
      qc.invalidateQueries({ queryKey: ["study-group-ranking", groupId] });
      onMembersChange();
    },
    onError: (e: any) => toast.error(e.message ?? "Erro"),
  });

  const inviteMutation = useMutation({
    mutationFn: () => addMemberByIdentifier(groupId, identifier),
    onSuccess: () => {
      toast.success("Membro adicionado!");
      setIdentifier("");
      setInviteOpen(false);
      qc.invalidateQueries({ queryKey: ["study-group-members", groupId] });
      onMembersChange();
    },
    onError: (e: any) => toast.error(e.message ?? "Erro"),
  });

  const removeMutation = useMutation({
    mutationFn: (memberId: string) => removeMember(memberId),
    onSuccess: () => {
      toast.success("Membro removido");
      qc.invalidateQueries({ queryKey: ["study-group-members", groupId] });
      onMembersChange();
    },
    onError: (e: any) => toast.error(e.message ?? "Erro"),
  });

  const maxMinutes = Math.max(1, ...(ranking ?? []).map((r) => Number(r.total_minutes) || 0));

  return (
    <div className="space-y-6 p-4">
      {/* Privacy + Invite header */}
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-semibold text-lg">Membros ({members.length})</h2>
        <div className="flex gap-2">
          {isAdmin && (
            <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  <UserPlus className="h-4 w-4" />
                  <span className="hidden sm:inline">Convidar</span>
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Adicionar membro</DialogTitle>
                  <DialogDescription>
                    Digite o @username ou email da pessoa.
                  </DialogDescription>
                </DialogHeader>
                <Input
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="@username ou email@exemplo.com"
                />
                <DialogFooter>
                  <Button variant="outline" onClick={() => setInviteOpen(false)}>Cancelar</Button>
                  <Button
                    onClick={() => inviteMutation.mutate()}
                    disabled={!identifier.trim() || inviteMutation.isPending}
                  >
                    {inviteMutation.isPending ? "Adicionando..." : "Adicionar"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
          {myMember && (
            <Popover>
              <PopoverTrigger asChild>
                <Button size="sm" variant="outline">
                  <Settings className="h-4 w-4" />
                  <span className="hidden sm:inline">Privacidade</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-sm mb-1">Minha privacidade</h4>
                    <p className="text-xs text-muted-foreground">Controle o que o grupo vê sobre você.</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="share_status" className="text-sm">Status ao vivo</Label>
                    <Switch
                      id="share_status"
                      checked={myMember.share_status}
                      onCheckedChange={(v) => prefsMutation.mutate({ share_status: v })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="share_metrics" className="text-sm">Tempo de estudo</Label>
                    <Switch
                      id="share_metrics"
                      checked={myMember.share_metrics}
                      onCheckedChange={(v) => prefsMutation.mutate({ share_metrics: v })}
                    />
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          )}
        </div>
      </div>

      {/* Members list */}
      <div className="space-y-2">
        {members.map((m) => {
          const isLive = livePresence.has(m.user_id) && m.share_status;
          const isMe = m.user_id === user?.id;
          return (
            <div
              key={m.id}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/40 transition-colors"
            >
              <div className="relative">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={m.profile?.avatar_url ?? undefined} />
                  <AvatarFallback>{(m.profile?.full_name ?? "?").charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                {isLive && (
                  <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-success border-2 border-background animate-pulse" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-medium truncate">
                    {m.profile?.full_name || "Usuário"} {isMe && <span className="text-xs text-muted-foreground">(você)</span>}
                  </p>
                  {m.role === "admin" && <Crown className="h-3 w-3 text-warning shrink-0" />}
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {formatUsername(m.profile?.username)}
                  {isLive && <span className="text-success ml-1.5">• Estudando agora</span>}
                </p>
              </div>
              {isAdmin && !isMe && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={() => {
                    if (confirm(`Remover ${m.profile?.full_name || "membro"} do grupo?`)) {
                      removeMutation.mutate(m.id);
                    }
                  }}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          );
        })}
      </div>

      {/* Weekly Ranking */}
      <div className="space-y-2 pt-2 border-t">
        <div className="flex items-center gap-2 mb-3">
          <Trophy className="h-4 w-4 text-warning" />
          <h3 className="font-semibold text-sm">Ranking semanal (7 dias)</h3>
        </div>
        {loadingRanking ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10" />)}
          </div>
        ) : !ranking || ranking.length === 0 ? (
          <p className="text-xs text-muted-foreground">Sem dados ainda.</p>
        ) : (
          <div className="space-y-1.5">
            {ranking.map((r, i) => {
              const minutes = Number(r.total_minutes) || 0;
              const pct = r.shares_metrics ? (minutes / maxMinutes) * 100 : 0;
              return (
                <div key={r.user_id} className="text-xs">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={cn(
                      "w-5 text-center font-bold",
                      i === 0 && "text-warning",
                      i === 1 && "text-muted-foreground",
                      i === 2 && "text-warning/70",
                    )}>
                      {i + 1}
                    </span>
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={r.avatar_url ?? undefined} />
                      <AvatarFallback className="text-[8px]">
                        {(r.full_name ?? "?").charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="flex-1 truncate">{r.full_name || formatUsername(r.username)}</span>
                    <span className="text-muted-foreground tabular-nums">
                      {r.shares_metrics ? `${minutes} min` : "—"}
                    </span>
                  </div>
                  <div className="h-1 bg-muted rounded overflow-hidden ml-7">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// Helper to detect if user is currently in a focus session
async function detectIsStudying(): Promise<boolean> {
  try {
    const stored = sessionStorage.getItem("focus_timer_state");
    if (stored) {
      const s = JSON.parse(stored);
      if (s.isRunning && s.endTime && s.endTime > Date.now() && !s.isBreak) return true;
    }
  } catch {}
  return false;
}
