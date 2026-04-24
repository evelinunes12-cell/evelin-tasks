import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Users, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { listMyStudyGroups, createStudyGroup, getStudyGroupsUnreadCounts } from "@/services/studyGroups";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export default function StudyGroups() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const { data: groups, isLoading } = useQuery({
    queryKey: ["study-groups"],
    queryFn: listMyStudyGroups,
  });

  const groupIds = (groups ?? []).map((g) => g.id);
  const { data: unreadCounts } = useQuery({
    queryKey: ["study-groups-unread", groupIds],
    queryFn: () => getStudyGroupsUnreadCounts(groupIds),
    enabled: groupIds.length > 0,
  });

  // Realtime: refresh unread counts when notifications change
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`sg-unread-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => qc.invalidateQueries({ queryKey: ["study-groups-unread"] })
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user, qc]);

  const createMutation = useMutation({
    mutationFn: () => createStudyGroup(name.trim(), description.trim()),
    onSuccess: (g) => {
      toast.success("Grupo criado!");
      qc.invalidateQueries({ queryKey: ["study-groups"] });
      setOpen(false);
      setName("");
      setDescription("");
      navigate(`/grupos-de-estudo/${g.id}`);
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao criar grupo"),
  });

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-5xl">
      <div className="flex items-center gap-2 mb-6">
        <SidebarTrigger className="md:hidden" />
        <GraduationCap className="h-6 w-6 text-primary" />
        <h1 className="text-2xl md:text-3xl font-bold">Grupos de Estudo</h1>
      </div>

      <div className="flex justify-between items-center mb-6">
        <p className="text-muted-foreground text-sm">
          Estude junto: compartilhe status, métricas e converse com seu grupo.
        </p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4" /> Criar grupo
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar novo grupo de estudo</DialogTitle>
              <DialogDescription>
                Você será automaticamente o administrador.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="g-name">Nome *</Label>
                <Input
                  id="g-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Galera do ENEM 2026"
                  maxLength={80}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="g-desc">Descrição</Label>
                <Textarea
                  id="g-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Sobre o que é o grupo?"
                  maxLength={300}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={() => createMutation.mutate()}
                disabled={!name.trim() || createMutation.isPending}
              >
                {createMutation.isPending ? "Criando..." : "Criar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      ) : !groups || groups.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent className="space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Users className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">Você ainda não tem grupos</h3>
              <p className="text-sm text-muted-foreground">
                Crie um grupo e convide amigos para estudar juntos.
              </p>
            </div>
            <Button onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4" /> Criar meu primeiro grupo
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {groups.map((g) => {
            const unread = unreadCounts?.[g.id] ?? 0;
            return (
            <Card
              key={g.id}
              className="cursor-pointer hover:border-primary/50 transition-colors relative"
              onClick={() => navigate(`/grupos-de-estudo/${g.id}`)}
            >
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-lg truncate flex-1 min-w-0">{g.name}</CardTitle>
                  {unread > 0 && (
                    <Badge
                      variant="destructive"
                      className="shrink-0 h-5 min-w-5 px-1.5 rounded-full text-[10px] font-semibold"
                      aria-label={`${unread} mensagens não lidas`}
                    >
                      {unread > 99 ? "99+" : unread}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {g.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2 break-words">
                    {g.description}
                  </p>
                )}
                <div className="flex items-center justify-between">
                  <div className="flex -space-x-2">
                    {g.sample_members.length > 0 ? (
                      g.sample_members.map((m) => (
                        <Avatar
                          key={m.user_id}
                          className="h-7 w-7 border-2 border-background"
                          title={m.full_name ?? m.username ?? undefined}
                        >
                          <AvatarImage src={m.avatar_url ?? undefined} />
                          <AvatarFallback className="text-[10px]">
                            {(m.full_name ?? m.username ?? "?").charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      ))
                    ) : (
                      <Avatar className="h-7 w-7 border-2 border-background">
                        <AvatarFallback><Users className="h-3 w-3" /></AvatarFallback>
                      </Avatar>
                    )}
                    {g.member_count > g.sample_members.length && g.sample_members.length > 0 && (
                      <Avatar className="h-7 w-7 border-2 border-background">
                        <AvatarFallback className="text-[10px]">
                          +{g.member_count - g.sample_members.length}
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {g.member_count} {g.member_count === 1 ? "membro" : "membros"}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
