import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Calendar,
  Users,
  FileText,
  Link as LinkIcon,
  Edit,
  Download,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Task {
  id: string;
  subject_name: string;
  description: string | null;
  due_date: string;
  is_group_work: boolean;
  group_members: string | null;
  google_docs_link: string | null;
  canva_link: string | null;
  status: string;
}

interface Attachment {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  file_type: string | null;
}

const statusConfig = {
  not_started: { label: "Não Iniciada", color: "bg-secondary" },
  in_progress: { label: "Em Andamento", color: "bg-warning" },
  completed: { label: "Concluída", color: "bg-success" },
};

const TaskDetail = () => {
  const { id } = useParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [task, setTask] = useState<Task | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    } else if (user && id) {
      fetchTask();
      fetchAttachments();
    }
  }, [user, authLoading, id, navigate]);

  const fetchTask = async () => {
    try {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      setTask(data);
    } catch (error) {
      console.error("Error fetching task:", error);
      toast({
        variant: "destructive",
        title: "Erro ao carregar tarefa",
        description: "Tente novamente mais tarde.",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAttachments = async () => {
    try {
      const { data, error } = await supabase
        .from("task_attachments")
        .select("*")
        .eq("task_id", id);

      if (error) throw error;
      setAttachments(data || []);
    } catch (error) {
      console.error("Error fetching attachments:", error);
    }
  };

  const downloadAttachment = async (attachment: Attachment) => {
    try {
      const { data, error } = await supabase.storage
        .from("task-attachments")
        .download(attachment.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = attachment.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading file:", error);
      toast({
        variant: "destructive",
        title: "Erro ao baixar arquivo",
        description: "Tente novamente mais tarde.",
      });
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!task) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <p className="text-center text-muted-foreground">Tarefa não encontrada.</p>
        </main>
      </div>
    );
  }

  const statusInfo = statusConfig[task.status as keyof typeof statusConfig];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-foreground">{task.subject_name}</h1>
          <Button onClick={() => navigate(`/task/edit/${id}`)} className="gap-2">
            <Edit className="w-4 h-4" />
            Editar
          </Button>
        </div>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Informações Gerais</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status:</span>
                <Badge className={`${statusInfo.color} text-white`}>
                  {statusInfo.label}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">
                  Data de entrega: {format(new Date(task.due_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </span>
              </div>
              {task.is_group_work && (
                <div className="flex items-start gap-2">
                  <Users className="w-4 h-4 text-muted-foreground mt-1" />
                  <div className="flex-1">
                    <p className="text-sm font-medium mb-1">Trabalho em grupo</p>
                    {task.group_members && (
                      <p className="text-sm text-muted-foreground whitespace-pre-line">
                        {task.group_members}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {task.description && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Descrição
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-line">{task.description}</p>
              </CardContent>
            </Card>
          )}

          {(task.google_docs_link || task.canva_link) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LinkIcon className="w-5 h-5" />
                  Links
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {task.google_docs_link && (
                  <div>
                    <p className="text-sm font-medium mb-1">Google Docs:</p>
                    <a
                      href={task.google_docs_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline"
                    >
                      {task.google_docs_link}
                    </a>
                  </div>
                )}
                {task.canva_link && (
                  <div>
                    <p className="text-sm font-medium mb-1">Canva:</p>
                    <a
                      href={task.canva_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline"
                    >
                      {task.canva_link}
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {attachments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="w-5 h-5" />
                  Anexos ({attachments.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {attachments.map((attachment) => (
                    <div
                      key={attachment.id}
                      className="flex items-center justify-between p-3 bg-secondary rounded-lg hover:bg-secondary/80 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{attachment.file_name}</p>
                        {attachment.file_size && (
                          <p className="text-xs text-muted-foreground">
                            {(attachment.file_size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => downloadAttachment(attachment)}
                        className="ml-2"
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
};

export default TaskDetail;
