import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, MessageCircle, Users, Trash2, LogOut, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import { getStudyGroup, listGroupMembers, deleteGroup, leaveGroup } from "@/services/studyGroups";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import MembersPanel from "@/components/study-groups/MembersPanel";
import StudyGroupChat from "@/components/study-groups/StudyGroupChat";
import StudyStatusPanel from "@/components/study-groups/StudyStatusPanel";

export default function StudyGroupDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const qc = useQueryClient();

  const { data: group, isLoading: loadingGroup } = useQuery({
    queryKey: ["study-group", id],
    queryFn: () => getStudyGroup(id!),
    enabled: !!id,
  });

  const { data: members = [], isLoading: loadingMembers } = useQuery({
    queryKey: ["study-group-members", id],
    queryFn: () => listGroupMembers(id!),
    enabled: !!id,
  });

  // Realtime: refresh members on any change
  useEffect(() => {
    if (!id) return;
    const ch = supabase
      .channel(`sg-members-${id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "study_group_members", filter: `group_id=eq.${id}` },
        () => qc.invalidateQueries({ queryKey: ["study-group-members", id] })
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [id, qc]);

  // Mark group chat notifications as read while the group is open and visible
  useEffect(() => {
    if (!id || !user) return;

    const markRead = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        await supabase.rpc("mark_study_group_messages_notifications_read", {
          p_group_id: id,
        });
        qc.invalidateQueries({ queryKey: ["notifications"] });
        qc.invalidateQueries({ queryKey: ["study-groups-unread"] });
      } catch {
        // silent
      }
    };

    // Initial mark on mount
    markRead();

    // Re-mark when tab becomes visible again
    document.addEventListener("visibilitychange", markRead);

    // Re-mark when a new message arrives for this group
    const ch = supabase
      .channel(`sg-msg-read-${id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "study_group_messages",
          filter: `group_id=eq.${id}`,
        },
        () => markRead()
      )
      .subscribe();

    return () => {
      document.removeEventListener("visibilitychange", markRead);
      supabase.removeChannel(ch);
    };
  }, [id, user, qc]);

  const myMember = members.find((m) => m.user_id === user?.id);
  const isAdmin = myMember?.role === "admin";

  const handleLeave = async () => {
    if (!myMember) return;
    try {
      await leaveGroup(myMember.id);
      toast.success("Você saiu do grupo");
      navigate("/grupos-de-estudo");
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao sair");
    }
  };

  const handleDelete = async () => {
    if (!group) return;
    try {
      await deleteGroup(group.id);
      toast.success("Grupo apagado");
      navigate("/grupos-de-estudo");
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao apagar");
    }
  };

  if (loadingGroup || loadingMembers) {
    return (
      <div className="container mx-auto p-4 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!group) {
    return (
      <div className="container mx-auto p-6 text-center">
        <p className="text-muted-foreground">Grupo não encontrado ou sem acesso.</p>
        <Button className="mt-4" onClick={() => navigate("/grupos-de-estudo")}>Voltar</Button>
      </div>
    );
  }

  const refreshMembers = () => qc.invalidateQueries({ queryKey: ["study-group-members", id] });

  return (
    <div className="flex flex-col h-[100dvh] md:h-screen">
      {/* Header */}
      <header className="border-b p-3 flex items-center gap-3 bg-card shrink-0">
        <Button size="icon" variant="ghost" onClick={() => navigate("/grupos-de-estudo")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="font-semibold truncate">{group.name}</h1>
          {group.description && (
            <p className="text-xs text-muted-foreground truncate">{group.description}</p>
          )}
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button size="icon" variant="ghost" title={isAdmin ? "Apagar grupo" : "Sair do grupo"}>
              {isAdmin ? <Trash2 className="h-4 w-4" /> : <LogOut className="h-4 w-4" />}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {isAdmin ? "Apagar grupo?" : "Sair do grupo?"}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {isAdmin
                  ? "Esta ação é permanente. Todos os membros, mensagens e dados serão removidos."
                  : "Você não verá mais as mensagens nem o ranking deste grupo."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={isAdmin ? handleDelete : handleLeave}>
                {isAdmin ? "Apagar" : "Sair"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </header>

      {/* Body */}
      <div className="flex-1 min-h-0">
        {isMobile ? (
          <Tabs defaultValue="chat" className="h-full flex flex-col">
            <TabsList className="grid grid-cols-3 mx-3 mt-2">
              <TabsTrigger value="chat"><MessageCircle className="h-4 w-4 mr-1" /> Chat</TabsTrigger>
              <TabsTrigger value="status"><Radio className="h-4 w-4 mr-1" /> Status</TabsTrigger>
              <TabsTrigger value="members"><Users className="h-4 w-4 mr-1" /> Membros</TabsTrigger>
            </TabsList>
            <TabsContent value="chat" className="flex-1 min-h-0 mt-0">
              <StudyGroupChat groupId={group.id} members={members} />
            </TabsContent>
            <TabsContent value="status" className="flex-1 min-h-0 mt-0 overflow-y-auto">
              <StudyStatusPanel groupId={group.id} members={members} />
            </TabsContent>
            <TabsContent value="members" className="flex-1 min-h-0 mt-0 overflow-y-auto">
              <MembersPanel
                groupId={group.id}
                members={members}
                isAdmin={isAdmin}
                onMembersChange={refreshMembers}
              />
            </TabsContent>
          </Tabs>
        ) : (
          <div className="grid grid-cols-[360px_1fr] h-full">
            <aside className="border-r overflow-y-auto">
              <Tabs defaultValue="status" className="h-full flex flex-col">
                <TabsList className="grid grid-cols-2 mx-3 mt-2">
                  <TabsTrigger value="status"><Radio className="h-4 w-4 mr-1" /> Status</TabsTrigger>
                  <TabsTrigger value="members"><Users className="h-4 w-4 mr-1" /> Membros</TabsTrigger>
                </TabsList>
                <TabsContent value="status" className="flex-1 min-h-0 mt-0 overflow-y-auto">
                  <StudyStatusPanel groupId={group.id} members={members} />
                </TabsContent>
                <TabsContent value="members" className="flex-1 min-h-0 mt-0 overflow-y-auto">
                  <MembersPanel
                    groupId={group.id}
                    members={members}
                    isAdmin={isAdmin}
                    onMembersChange={refreshMembers}
                  />
                </TabsContent>
              </Tabs>
            </aside>
            <section className="min-h-0">
              <StudyGroupChat groupId={group.id} members={members} />
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
