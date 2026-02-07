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
import { Settings, Plus, Users, Trash2, ChevronDown, ChevronRight } from "lucide-react";
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

      // Fetch members
      const { data: membersData, error: membersError } = await supabase
        .from("environment_members")
        .select("*")
        .eq("environment_id", id);

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
      <Navbar />
      <div className="container mx-auto px-6 py-8">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">{environment.environment_name}</h1>
            {environment.description && (
              <p className="text-muted-foreground mt-2">{environment.description}</p>
            )}
          </div>
          <div className="flex gap-2">
            {isOwner && (
              <>
                <Button
                  variant="outline"
                  onClick={() => navigate(`/environment/${id}/edit`)}
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Configurações
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive">
                      <Trash2 className="w-4 h-4 mr-2" />
                      Excluir
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
            {isOwner && <TabsTrigger value="invites">Convites</TabsTrigger>}
          </TabsList>

          <TabsContent value="tasks" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Tarefas do Grupo</h2>
              <Button onClick={() => navigate(`/task/new?environment=${id}`)}>
                <Plus className="w-4 h-4 mr-2" />
                Nova Tarefa
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
              {isOwner && (
                <Button onClick={() => navigate(`/environment/${id}/edit`)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Membro
                </Button>
              )}
            </div>

            <div className="space-y-4">
              {/* Owner Card */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Users className="w-5 h-5" />
                      <div>
                        <CardTitle className="text-base">
                          {user?.email} {isOwner && "(Você)"}
                        </CardTitle>
                        <CardDescription>Proprietário</CardDescription>
                      </div>
                    </div>
                    <Badge>Todas as permissões</Badge>
                  </div>
                </CardHeader>
              </Card>

              {/* Members Cards */}
              {members.map((member) => (
                <Card key={member.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Users className="w-5 h-5" />
                        <div>
                          <CardTitle className="text-base">{member.email}</CardTitle>
                          <CardDescription>
                            {member.user_id ? "Membro ativo" : "Convite pendente"}
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex flex-wrap gap-1">
                          {member.permissions.map((perm) => (
                            <Badge key={perm} variant="secondary" className="text-xs">
                              {perm === "view" && "Visualizar"}
                              {perm === "create" && "Criar"}
                              {perm === "edit" && "Editar"}
                              {perm === "delete" && "Excluir"}
                            </Badge>
                          ))}
                        </div>
                        {isOwner && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remover membro</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tem certeza que deseja remover {member.email} deste ambiente?
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
              ))}
            </div>
          </TabsContent>

          {isOwner && (
            <TabsContent value="invites" className="space-y-6">
              <InviteManager environmentId={id!} isOwner={isOwner} />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
};

export default EnvironmentDetail;
