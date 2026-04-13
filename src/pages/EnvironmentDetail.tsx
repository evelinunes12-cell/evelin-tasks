import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";
import TaskCard from "@/components/TaskCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, Plus, Users, Trash2, ChevronDown, ChevronRight, History, Clock } from "lucide-react";
import { LogOut } from "lucide-react";
import EnvironmentActivityTimeline from "@/components/EnvironmentActivityTimeline";
import InviteManager from "@/components/InviteManager";
import { toast } from "sonner";
import { logError } from "@/lib/logger";
import { fetchEnvironmentStatusesHierarchical, type EnvironmentStatus } from "@/services/environmentData";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Environment {
  id: string;
  environment_name: string;
  description: string | null;
  owner_id: string;
}

interface Task {
  id: string;
  subject_name: string;
  description: string | null;
  due_date: string | null;
  is_group_work: boolean;
  status: string;
  checklist: any;
}

interface Member {
  id: string;
  email: string;
  username?: string | null;
  full_name?: string | null;
  avatar_url?: string | null;
  permissions: string[];
  user_id: string | null;
}

const EnvironmentDetail = () => {
  const { id } = useParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [environment, setEnvironment] = useState<Environment | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [hierarchicalStatuses, setHierarchicalStatuses] = useState<EnvironmentStatus[]>([]);
  const [expandedStatuses, setExpandedStatuses] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);

  const handleLeaveGroup = async () => {
    if (!user || !id) return;
    try {
      // Find membership by user_id or by email
      const userEmail = user.email;
      const myMembership = members.find(
        (m) => m.user_id === user.id || (m.user_id === null && m.email === userEmail)
      );
      if (!myMembership) {
        toast.error("Você não é membro deste grupo");
        return;
      }
      const { error } = await supabase
        .from("environment_members")
        .delete()
        .eq("id", myMembership.id);
      if (error) throw error;
      toast.success("Você saiu do grupo");
      navigate("/shared-environments", { replace: true });
    } catch (error) {
      logError("Error leaving group", error);
      toast.error("Erro ao sair do grupo");
    }
  };

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user && id) {
      fetchEnvironmentData();
    }
  }, [user, id]);

  const fetchEnvironmentData = async () => {
    try {
      setLoading(true);

      // Fetch environment
      const { data: envData, error: envError } = await supabase
        .from("shared_environments")
        .select("*")
        .eq("id", id)
        .single();

      if (envError) throw envError;

      setEnvironment(envData);
      setIsOwner(envData.owner_id === user?.id);

      // Fetch tasks
      const { data: tasksData, error: tasksError } = await supabase
        .from("tasks")
        .select("*")
        .eq("environment_id", id)
        .order("created_at", { ascending: false });

      if (tasksError) throw tasksError;
      setTasks(tasksData || []);

      // Fetch hierarchical statuses
      const statusesData = await fetchEnvironmentStatusesHierarchical(id!);
      setHierarchicalStatuses(statusesData);
      // Auto-expand all parent statuses
      setExpandedStatuses(new Set(statusesData.map(s => s.id)));

      // Fetch members with email masking for non-owners
      const { data: membersData, error: membersError } = await supabase
        .rpc("get_environment_members", { p_environment_id: id });

      if (membersError) throw membersError;
      setMembers(membersData || []);
    } catch (error) {
      logError("Error fetching environment data", error);
      toast.error("Erro ao carregar dados do grupo");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      const { error } = await supabase.from("tasks").delete().eq("id", taskId);

      if (error) throw error;

      setTasks(tasks.filter((t) => t.id !== taskId));
      toast.success("Tarefa excluída com sucesso!");
    } catch (error) {
      logError("Error deleting task", error);
      toast.error("Erro ao excluir tarefa");
    }
  };

  const handleDeleteEnvironment = async () => {
    try {
      const { error } = await supabase
        .from("shared_environments")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Grupo excluído com sucesso!");
      navigate("/shared-environments");
    } catch (error) {
      logError("Error deleting environment", error);
      toast.error("Erro ao excluir grupo");
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    try {
      const { error } = await supabase
        .from("environment_members")
        .delete()
        .eq("id", memberId);

      if (error) throw error;

      setMembers(members.filter((m) => m.id !== memberId));
      toast.success("Membro removido com sucesso!");
    } catch (error) {
      logError("Error removing member", error);
      toast.error("Erro ao remover membro");
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  if (!environment) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Grupo não encontrado</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar minimal />
      <div className="container mx-auto px-6 py-8">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground truncate">{environment.environment_name}</h1>
            {environment.description && (
              <p className="text-muted-foreground mt-2">{environment.description}</p>
            )}
          </div>
          <div className="flex gap-2">
            {!isOwner && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <LogOut className="w-4 h-4" />
                    <span className="hidden sm:inline ml-2">Sair do Grupo</span>
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Sair do grupo</AlertDialogTitle>
                    <AlertDialogDescription>
                      Tem certeza que deseja sair deste grupo? Você perderá o acesso às tarefas e precisará de um novo convite para voltar.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleLeaveGroup}>
                      Sair
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            {isOwner && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/environment/${id}/edit`)}
                >
                  <Settings className="w-4 h-4" />
                  <span className="hidden sm:inline ml-2">Configurações</span>
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm">
                      <Trash2 className="w-4 h-4" />
                      <span className="hidden sm:inline ml-2">Excluir</span>
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                      <AlertDialogDescription>
                        Tem certeza que deseja excluir este grupo? Todas as tarefas e membros serão removidos. Esta ação não pode ser desfeita.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDeleteEnvironment}>
                        Excluir
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            )}
          </div>
        </div>

        <Tabs defaultValue="tasks" className="w-full">
          <TabsList>
            <TabsTrigger value="tasks">Tarefas</TabsTrigger>
            <TabsTrigger value="members">Membros</TabsTrigger>
            <TabsTrigger value="history">
              <History className="w-4 h-4 mr-1" />
              Histórico
            </TabsTrigger>
            {isOwner && <TabsTrigger value="invites">Convites</TabsTrigger>}
          </TabsList>

          <TabsContent value="tasks" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Tarefas do Grupo</h2>
              <Button size="sm" onClick={() => navigate(`/task/new?environment=${id}`)}>
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline ml-2">Nova Tarefa</span>
              </Button>
            </div>

            {tasks.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <h3 className="text-xl font-semibold mb-2">Nenhuma tarefa encontrada</h3>
                  <p className="text-muted-foreground mb-6 text-center">
                    Crie a primeira tarefa neste grupo
                  </p>
                  <Button onClick={() => navigate(`/task/new?environment=${id}`)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Criar Tarefa
                  </Button>
                </CardContent>
              </Card>
            ) : hierarchicalStatuses.length > 0 ? (
              <div className="space-y-4">
                {hierarchicalStatuses.map((parentStatus) => {
                  // Collect all status names under this parent (parent + children)
                  const childNames = parentStatus.children?.map(c => c.name) || [];
                  const allNames = childNames.length > 0 ? childNames : [parentStatus.name];
                  const statusTasks = tasks.filter(t => allNames.includes(t.status));
                  
                  if (statusTasks.length === 0) return null;

                  return (
                    <Collapsible
                      key={parentStatus.id}
                      open={expandedStatuses.has(parentStatus.id)}
                      onOpenChange={() => {
                        setExpandedStatuses(prev => {
                          const next = new Set(prev);
                          if (next.has(parentStatus.id)) next.delete(parentStatus.id);
                          else next.add(parentStatus.id);
                          return next;
                        });
                      }}
                    >
                      <Card>
                        <CollapsibleTrigger asChild>
                          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                {expandedStatuses.has(parentStatus.id) ? (
                                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                                ) : (
                                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                                )}
                                <div
                                  className="w-4 h-4 rounded-full shrink-0"
                                  style={{ backgroundColor: parentStatus.color || "#3b82f6" }}
                                />
                                <CardTitle className="text-lg">{parentStatus.name}</CardTitle>
                                <Badge variant="secondary">{statusTasks.length}</Badge>
                              </div>
                            </div>
                          </CardHeader>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <CardContent className="pt-0">
                            {parentStatus.children && parentStatus.children.length > 0 ? (
                              // Group tasks by child status
                              <div className="space-y-4">
                                {parentStatus.children.map(childStatus => {
                                  const childTasks = tasks.filter(t => t.status === childStatus.name);
                                  if (childTasks.length === 0) return null;
                                  return (
                                    <div key={childStatus.id}>
                                      <div className="flex items-center gap-2 mb-3">
                                        <div
                                          className="w-3 h-3 rounded-full shrink-0"
                                          style={{ backgroundColor: childStatus.color || "#3b82f6" }}
                                        />
                                        <span className="text-sm font-medium text-muted-foreground">
                                          {childStatus.name}
                                        </span>
                                        <Badge variant="outline" className="text-xs">
                                          {childTasks.length}
                                        </Badge>
                                      </div>
                                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ml-5">
                                        {childTasks.map(task => (
                                          <TaskCard
                                            key={task.id}
                                            id={task.id}
                                            subjectName={task.subject_name}
                                            description={task.description || undefined}
                                            dueDate={task.due_date}
                                            isGroupWork={task.is_group_work}
                                            status={task.status}
                                            checklist={task.checklist}
                                            onDelete={handleDeleteTask}
                                          />
                                        ))}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              // No children, show tasks directly
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {statusTasks.map(task => (
                                  <TaskCard
                                    key={task.id}
                                    id={task.id}
                                    subjectName={task.subject_name}
                                    description={task.description || undefined}
                                    dueDate={task.due_date}
                                    isGroupWork={task.is_group_work}
                                    status={task.status}
                                    checklist={task.checklist}
                                    onDelete={handleDeleteTask}
                                  />
                                ))}
                              </div>
                            )}
                          </CardContent>
                        </CollapsibleContent>
                      </Card>
                    </Collapsible>
                  );
                })}

                {/* Tasks with unmatched statuses */}
                {(() => {
                  const allKnownNames = hierarchicalStatuses.flatMap(p => {
                    const childNames = p.children?.map(c => c.name) || [];
                    return childNames.length > 0 ? childNames : [p.name];
                  });
                  const unmatchedTasks = tasks.filter(t => !allKnownNames.includes(t.status));
                  if (unmatchedTasks.length === 0) return null;
                  return (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Outros</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {unmatchedTasks.map(task => (
                            <TaskCard
                              key={task.id}
                              id={task.id}
                              subjectName={task.subject_name}
                              description={task.description || undefined}
                              dueDate={task.due_date}
                              isGroupWork={task.is_group_work}
                              status={task.status}
                              checklist={task.checklist}
                              onDelete={handleDeleteTask}
                            />
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })()}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {tasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    id={task.id}
                    subjectName={task.subject_name}
                    description={task.description || undefined}
                    dueDate={task.due_date}
                    isGroupWork={task.is_group_work}
                    status={task.status}
                    checklist={task.checklist}
                    onDelete={handleDeleteTask}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="members" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Membros do Grupo</h2>
            </div>

            <div className="space-y-3">
              {/* Owner Card */}
              <Card className="border-primary/30">
                <CardHeader className="py-3 px-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm shrink-0">
                        {isOwner ? "V" : (environment.owner_id.slice(0, 1).toUpperCase())}
                      </div>
                      <div>
                        <CardTitle className="text-sm font-medium">
                          {isOwner ? "Você (Proprietário)" : "Proprietário"}
                        </CardTitle>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs border-primary/30 text-primary">
                      Proprietário
                    </Badge>
                  </div>
                </CardHeader>
              </Card>

              {/* Active Members */}
              {members.filter(m => m.user_id !== null).map((member) => {
                const displayName = member.username ? `@${member.username}` : member.full_name || member.email;
                const isCurrentUser = member.user_id === user?.id;
                const initials = (member.full_name || member.email || "?").charAt(0).toUpperCase();

                return (
                  <Card key={member.id}>
                    <CardHeader className="py-3 px-4">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-3 min-w-0">
                          {member.avatar_url ? (
                            <img src={member.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-muted-foreground font-semibold text-sm shrink-0">
                              {initials}
                            </div>
                          )}
                          <div className="min-w-0">
                            <CardTitle className="text-sm font-medium truncate">
                              {displayName}{isCurrentUser ? " (Você)" : ""}
                            </CardTitle>
                            {member.username && (
                              <CardDescription className="text-xs truncate">{member.email}</CardDescription>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="flex flex-wrap gap-1">
                            {member.permissions.map((perm) => (
                              <Badge key={perm} variant="secondary" className="text-xs">
                                {perm === "view" ? "Ver" : perm === "create" ? "Criar" : perm === "edit" ? "Editar" : perm === "delete" ? "Excluir" : perm}
                              </Badge>
                            ))}
                          </div>
                          {isOwner && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <Trash2 className="w-4 h-4 text-muted-foreground" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Remover membro</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Tem certeza que deseja remover {displayName} deste grupo?
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleRemoveMember(member.id)}>
                                    Remover
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                );
              })}

              {/* Pending Members (no user_id yet) */}
              {members.filter(m => m.user_id === null).length > 0 && (
                <div className="space-y-2 pt-2">
                  <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Convites pendentes
                  </p>
                  {members.filter(m => m.user_id === null).map((member) => (
                    <Card key={member.id} className="opacity-70">
                      <CardHeader className="py-3 px-4">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-full bg-muted/50 flex items-center justify-center text-muted-foreground text-sm shrink-0">
                              ?
                            </div>
                            <div className="min-w-0">
                              <CardTitle className="text-sm font-medium truncate text-muted-foreground">{member.email}</CardTitle>
                              <CardDescription className="text-xs">Aguardando aceite</CardDescription>
                            </div>
                          </div>
                          {isOwner && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <Trash2 className="w-4 h-4 text-muted-foreground" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Remover convite pendente</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Tem certeza que deseja remover o convite de {member.email}?
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleRemoveMember(member.id)}>
                                    Remover
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              )}

              {members.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhum membro além do proprietário. Use a aba "Convites" para adicionar pessoas.
                </p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            <div className="flex items-center gap-2 mb-2">
              <History className="w-5 h-5 text-muted-foreground" />
              <h2 className="text-xl font-semibold">Histórico de Atividades</h2>
            </div>
            <EnvironmentActivityTimeline environmentId={id!} />
          </TabsContent>

          {isOwner && (
            <TabsContent value="invites" className="space-y-6">
              <InviteManager environmentId={id!} isOwner={isOwner} onMemberAdded={fetchEnvironmentData} />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
};

export default EnvironmentDetail;
