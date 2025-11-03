import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import StatsCards from "@/components/StatsCards";
import TaskCard from "@/components/TaskCard";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Search } from "lucide-react";
interface Task {
  id: string;
  subject_name: string;
  description: string | null;
  due_date: string;
  is_group_work: boolean;
  status: string;
  canva_link: string | null;
  created_at: string;
  google_docs_link: string | null;
  group_members: string | null;
  updated_at: string;
  user_id: string;
  checklist: {
    text: string;
    completed: boolean;
  }[];
}
const Dashboard = () => {
  const {
    user,
    loading: authLoading
  } = useAuth();
  const navigate = useNavigate();
  const {
    toast
  } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("due_date");
  const [searchQuery, setSearchQuery] = useState<string>("");
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);
  useEffect(() => {
    if (user) {
      fetchTasks();
    }
  }, [user]);
  const fetchTasks = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from("tasks").select("*").order("due_date", {
        ascending: true
      });
      if (error) throw error;
      setTasks(data as Task[] || []);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      toast({
        variant: "destructive",
        title: "Erro ao carregar tarefas",
        description: "Tente novamente mais tarde."
      });
    } finally {
      setLoading(false);
    }
  };
  const handleDeleteTask = async (id: string) => {
    try {
      const {
        error
      } = await supabase.from("tasks").delete().eq("id", id);
      if (error) throw error;
      setTasks(tasks.filter(task => task.id !== id));
      toast({
        title: "Tarefa excluída",
        description: "A tarefa foi removida com sucesso."
      });
    } catch (error) {
      console.error("Error deleting task:", error);
      toast({
        variant: "destructive",
        title: "Erro ao excluir tarefa",
        description: "Tente novamente mais tarde."
      });
    }
  };
  const filteredTasks = tasks.filter(task => {
    const matchesStatus = statusFilter === "all" || task.status === statusFilter;
    const matchesSearch = searchQuery === "" || task.subject_name.toLowerCase().includes(searchQuery.toLowerCase()) || task.description && task.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  }).sort((a, b) => {
    if (sortBy === "due_date") {
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    } else if (sortBy === "subject") {
      return a.subject_name.localeCompare(b.subject_name);
    }
    return 0;
  });
  const stats = {
    notStarted: tasks.filter(t => t.status === "not_started").length,
    inProgress: tasks.filter(t => t.status === "in_progress").length,
    completed: tasks.filter(t => t.status === "completed").length
  };
  if (authLoading || loading) {
    return <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>;
  }
  return <div className="min-h-screen bg-background flex-1">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-foreground mb-2">Minhas Tarefas</h2>
          <p className="text-muted-foreground">Gerencie seus trabalhos e projetos de forma organizada</p>
        </div>

        <StatsCards notStarted={stats.notStarted} inProgress={stats.inProgress} completed={stats.completed} />

        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input type="text" placeholder="Pesquisar por disciplina ou descrição..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9" />
          </div>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Filtrar por status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="not_started">Não Iniciadas</SelectItem>
              <SelectItem value="in_progress">Em Andamento</SelectItem>
              <SelectItem value="completed">Concluídas</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Ordenar por" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="due_date">Data de Entrega</SelectItem>
              <SelectItem value="subject">Nome da Disciplina</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {filteredTasks.length === 0 ? <div className="text-center py-12">
            <p className="text-muted-foreground text-lg">
              Nenhuma tarefa encontrada. Crie sua primeira tarefa!
            </p>
          </div> : <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTasks.map(task => <TaskCard key={task.id} id={task.id} subjectName={task.subject_name} description={task.description} dueDate={task.due_date} isGroupWork={task.is_group_work} status={task.status} checklist={task.checklist} onDelete={handleDeleteTask} />)}
          </div>}
      </main>
    </div>;
};
export default Dashboard;