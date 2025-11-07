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
import { Settings, Plus, Users, Trash2 } from "lucide-react";
import { toast } from "sonner";
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

      // Fetch members
      const { data: membersData, error: membersError } = await supabase
        .from("environment_members")
        .select("*")
        .eq("environment_id", id);

      if (membersError) throw membersError;
      setMembers(membersData || []);
    } catch (error: any) {
      console.error("Error fetching environment data:", error);
      toast.error("Erro ao carregar dados do ambiente");
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
    } catch (error: any) {
      console.error("Error deleting task:", error);
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

      toast.success("Ambiente excluído com sucesso!");
      navigate("/shared-environments");
    } catch (error: any) {
      console.error("Error deleting environment:", error);
      toast.error("Erro ao excluir ambiente");
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
    } catch (error: any) {
      console.error("Error removing member:", error);
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
        <p className="text-muted-foreground">Ambiente não encontrado</p>
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
                        Tem certeza que deseja excluir este ambiente? Todas as tarefas e membros serão removidos. Esta ação não pode ser desfeita.
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
          </TabsList>

          <TabsContent value="tasks" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Tarefas do Ambiente</h2>
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
                    Crie a primeira tarefa neste ambiente
                  </p>
                  <Button onClick={() => navigate(`/task/new?environment=${id}`)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Criar Tarefa
                  </Button>
                </CardContent>
              </Card>
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
              <h2 className="text-xl font-semibold">Membros do Ambiente</h2>
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
        </Tabs>
      </div>
    </div>
  );
};

export default EnvironmentDetail;
