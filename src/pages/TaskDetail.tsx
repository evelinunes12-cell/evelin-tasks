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
import {
  Calendar,
  Users,
  FileText,
  Link as LinkIcon,
  Edit,
  Download,
  Loader2,
  Trash2,
  ExternalLink,
  CheckSquare,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import TaskStepDisplay from "@/components/TaskStepDisplay";

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
  checklist: { text: string; completed: boolean }[];
}

interface Attachment {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  file_type: string | null;
  is_link: boolean;
}

interface TaskStep {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  status: string;
  google_docs_link: string | null;
  canva_link: string | null;
  order_index: number;
}

const TaskDetail = () => {
  const { id } = useParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [task, setTask] = useState<Task | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingChecklist, setUpdatingChecklist] = useState(false);
  const [steps, setSteps] = useState<TaskStep[]>([]);
  const [stepAttachments, setStepAttachments] = useState<Record<string, Attachment[]>>({});

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    } else if (user && id) {
      fetchTask();
      fetchAttachments();
      fetchSteps();
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
      setTask(data as unknown as Task);
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

  const fetchSteps = async () => {
    try {
      const { data: stepsData, error: stepsError } = await supabase
        .from("task_steps")
        .select("*")
        .eq("task_id", id)
        .order("order_index");

      if (stepsError) throw stepsError;
      
      if (stepsData) {
        setSteps(stepsData);

        // Fetch attachments for each step
        const attachmentsMap: Record<string, Attachment[]> = {};
        for (const step of stepsData) {
          const { data: attachmentsData, error: attachmentsError } = await supabase
            .from("task_step_attachments")
            .select("*")
            .eq("task_step_id", step.id);

          if (!attachmentsError && attachmentsData) {
            attachmentsMap[step.id] = attachmentsData;
          }
        }
        setStepAttachments(attachmentsMap);
      }
    } catch (error) {
      console.error("Error fetching steps:", error);
    }
  };

  const downloadAttachment = async (attachment: Attachment) => {
    try {
      if (attachment.is_link) {
        window.open(attachment.file_path, "_blank");
        return;
      }

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

  const downloadStepAttachment = async (attachment: Attachment) => {
    await downloadAttachment(attachment);
  };

  const deleteAttachment = async (attachment: Attachment) => {
    try {
      // Delete from database
      const { error: dbError } = await supabase
        .from("task_attachments")
        .delete()
        .eq("id", attachment.id);

      if (dbError) throw dbError;

      // Delete from storage if it's a file (not a link)
      if (!attachment.is_link) {
        const { error: storageError } = await supabase.storage
          .from("task-attachments")
          .remove([attachment.file_path]);

        if (storageError) throw storageError;
      }

      // Update local state
      setAttachments(attachments.filter((a) => a.id !== attachment.id));

      toast({
        title: "Anexo deletado",
        description: "O anexo foi removido com sucesso.",
      });
    } catch (error) {
      console.error("Error deleting attachment:", error);
      toast({
        variant: "destructive",
        title: "Erro ao deletar anexo",
        description: "Tente novamente mais tarde.",
      });
    }
  };

  const toggleChecklistItem = async (index: number) => {
    if (!task) return;
    
    setUpdatingChecklist(true);
    try {
      const updatedChecklist = task.checklist.map((item, i) =>
        i === index ? { ...item, completed: !item.completed } : item
      );

      const { error } = await supabase
        .from("tasks")
        .update({ checklist: updatedChecklist })
        .eq("id", id);

      if (error) throw error;

      setTask({ ...task, checklist: updatedChecklist });
    } catch (error) {
      console.error("Error updating checklist:", error);
      toast({
        variant: "destructive",
        title: "Erro ao atualizar checklist",
        description: "Tente novamente mais tarde.",
      });
    } finally {
      setUpdatingChecklist(false);
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
        <Navbar minimal />
        <main className="container mx-auto px-4 py-8">
          <p className="text-center text-muted-foreground">Tarefa não encontrada.</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar minimal />
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
                <Badge variant="secondary">
                  {task.status}
                </Badge>
              </div>
              {task.due_date && (
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">
                    Data de entrega: {format(new Date(task.due_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </span>
                </div>
              )}
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
                    <p className="text-sm font-medium mb-1">Link do Trabalho Escrito:</p>
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
                    <p className="text-sm font-medium mb-1">Link da Apresentação:</p>
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

          {task.checklist && task.checklist.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckSquare className="w-5 h-5" />
                  Checklist ({task.checklist.filter((item) => item.completed).length}/{task.checklist.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {task.checklist.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 p-3 bg-secondary rounded-lg hover:bg-secondary/80 transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={item.completed}
                        onChange={() => toggleChecklistItem(index)}
                        disabled={updatingChecklist}
                        className="w-5 h-5 cursor-pointer"
                      />
                      <span className={`flex-1 text-sm ${item.completed ? "line-through text-muted-foreground" : ""}`}>
                        {item.text}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <TaskStepDisplay 
            steps={steps} 
            stepAttachments={stepAttachments} 
            onDownloadAttachment={downloadStepAttachment}
          />

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
                        <div className="flex items-center gap-2">
                          {attachment.is_link && <LinkIcon className="w-4 h-4 text-muted-foreground" />}
                          <p className="text-sm font-medium truncate">{attachment.file_name}</p>
                        </div>
                        {attachment.file_size && !attachment.is_link && (
                          <p className="text-xs text-muted-foreground">
                            {(attachment.file_size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => downloadAttachment(attachment)}
                          className="ml-2"
                        >
                          {attachment.is_link ? (
                            <ExternalLink className="w-4 h-4" />
                          ) : (
                            <Download className="w-4 h-4" />
                          )}
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja deletar este anexo? Esta ação não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteAttachment(attachment)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Deletar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
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
