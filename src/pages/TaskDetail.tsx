import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useConfetti } from "@/hooks/useConfetti";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Task, ChecklistItem } from "@/services/tasks";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { logError } from "@/lib/logger";
import { registerActivity } from "@/services/activity";
import { uploadTaskFile } from "@/services/attachments";
import ChecklistManager from "@/components/ChecklistManager";
import { AttachmentPreviewModal } from "@/components/AttachmentPreviewModal";
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
  Upload,
  Eye,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import TaskStepDisplay from "@/components/TaskStepDisplay";
import { Input } from "@/components/ui/input";

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
  const { triggerConfetti } = useConfetti();
  const queryClient = useQueryClient();
  const [task, setTask] = useState<Task | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [steps, setSteps] = useState<TaskStep[]>([]);
  const [stepAttachments, setStepAttachments] = useState<Record<string, Attachment[]>>({});
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Estado do modal de preview
  const [previewModal, setPreviewModal] = useState<{
    isOpen: boolean;
    url: string | null;
    fileName: string;
    fileType: "pdf" | "image";
    attachment: Attachment | null;
  }>({
    isOpen: false,
    url: null,
    fileName: "",
    fileType: "pdf",
    attachment: null,
  });

  // Helper para verificar se arquivo pode ser visualizado inline
  const isPreviewable = (fileName: string): boolean => {
    const extension = fileName.toLowerCase().split('.').pop();
    return ['pdf', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(extension || '');
  };

  // Determina tipo do arquivo para o modal
  const getFileType = (fileName: string): "pdf" | "image" => {
    const extension = fileName.toLowerCase().split('.').pop();
    return extension === 'pdf' ? 'pdf' : 'image';
  };

  // Gera URL assinada do Supabase Storage (bucket privado)
  const getSignedUrl = async (filePath: string): Promise<string | null> => {
    const { data, error } = await supabase.storage
      .from("task-attachments")
      .createSignedUrl(filePath, 3600); // URL válida por 1 hora
    
    if (error) {
      logError(error.message, "Erro ao gerar URL de visualização");
      return null;
    }
    return data.signedUrl;
  };

  // Abre o modal de preview
  const previewAttachment = async (attachment: Attachment) => {
    const signedUrl = await getSignedUrl(attachment.file_path);
    if (signedUrl) {
      setPreviewModal({
        isOpen: true,
        url: signedUrl,
        fileName: attachment.file_name,
        fileType: getFileType(attachment.file_name),
        attachment,
      });
    } else {
      toast({
        title: "Erro",
        description: "Não foi possível gerar o link de visualização.",
        variant: "destructive",
      });
    }
  };

  // Fecha o modal de preview
  const closePreviewModal = () => {
    setPreviewModal({
      isOpen: false,
      url: null,
      fileName: "",
      fileType: "pdf",
      attachment: null,
    });
  };

  // Função auxiliar para corrigir a visualização da data (compensa fuso horário)
  const formatDateDisplay = (dateString: string) => {
    if (!dateString) return null;
    
    // Para datas no formato YYYY-MM-DD, parse sem conversão de fuso
    if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const parts = dateString.split("-");
      const date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      return format(date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
    }
    
    // Para datas ISO, compensa o fuso horário
    const date = new Date(dateString);
    const timeZoneOffset = date.getTimezoneOffset() * 60000;
    const adjustedDate = new Date(date.getTime() + timeZoneOffset);
    return format(adjustedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  };

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    } else if (user && id) {
      fetchTask();
      fetchAttachments();
      fetchSteps();
    }
  }, [user, authLoading, id, navigate]);

  // Função para garantir que itens do checklist tenham IDs
  const ensureChecklistIds = (checklist: any[]): ChecklistItem[] => {
    if (!checklist || !Array.isArray(checklist)) return [];
    return checklist.map((item, index) => ({
      id: item.id || `item-${Date.now()}-${index}`,
      text: item.text || "",
      completed: Boolean(item.completed),
    }));
  };

  const fetchTask = async () => {
    try {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      
      // Garante que o checklist tenha IDs válidos
      const taskData = data as unknown as Task;
      if (taskData.checklist) {
        taskData.checklist = ensureChecklistIds(taskData.checklist);
      }
      
      setTask(taskData);
    } catch (error) {
      logError("Error fetching task", error);
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
      logError("Error fetching attachments", error);
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
      logError("Error fetching steps", error);
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
      logError("Error downloading file", error);
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
      logError("Error deleting attachment", error);
      toast({
        variant: "destructive",
        title: "Erro ao deletar anexo",
        description: "Tente novamente mais tarde.",
      });
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0 || !user?.id || !id) return;

    setIsUploading(true);
    const fileArray = Array.from(files);
    let successCount = 0;
    let errorCount = 0;

    try {
      const uploadPromises = fileArray.map(async (file) => {
        try {
          await uploadTaskFile(id, user.id, file);
          successCount++;
        } catch (error) {
          logError(`Error uploading file ${file.name}`, error);
          errorCount++;
        }
      });

      await Promise.all(uploadPromises);

      // Refresh attachments list
      await fetchAttachments();

      if (successCount > 0) {
        toast({
          title: "Upload concluído",
          description: `${successCount} arquivo${successCount > 1 ? 's' : ''} anexado${successCount > 1 ? 's' : ''} com sucesso.`,
        });
      }

      if (errorCount > 0) {
        toast({
          variant: "destructive",
          title: "Alguns arquivos falharam",
          description: `${errorCount} arquivo${errorCount > 1 ? 's' : ''} não ${errorCount > 1 ? 'puderam' : 'pôde'} ser enviado${errorCount > 1 ? 's' : ''}.`,
        });
      }
    } catch (error) {
      logError("Error uploading files", error);
      toast({
        variant: "destructive",
        title: "Erro ao enviar arquivos",
        description: "Tente novamente mais tarde.",
      });
    } finally {
      setIsUploading(false);
      // Reset input value to allow uploading same files again
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleChecklistChange = async (newItems: ChecklistItem[]) => {
    if (!task || !id) return;
    
    const previousChecklist = task.checklist || [];
    const previousCompletedCount = previousChecklist.filter(item => item.completed).length;
    const newCompletedCount = newItems.filter(item => item.completed).length;
    
    // Atualiza o estado local imediatamente para UI responsiva
    setTask({ ...task, checklist: newItems });
    
    try {
      const { error } = await supabase
        .from("tasks")
        .update({ checklist: newItems as unknown as any })
        .eq("id", id);

      if (error) throw error;

      // Invalida queries para sincronizar UI
      queryClient.invalidateQueries({ queryKey: ["tasks"] });

      // Se marcou algum item novo como concluído, registra atividade
      if (newCompletedCount > previousCompletedCount && user?.id) {
        await registerActivity(user.id);
        queryClient.invalidateQueries({ queryKey: ['user-streak', user.id] });
      }

      // Verifica se todas as etapas foram concluídas
      const allCompleted = newItems.every(item => item.completed);
      if (allCompleted && newItems.length > 0 && previousCompletedCount < newItems.length) {
        triggerConfetti();
      }
    } catch (error) {
      logError("Error updating checklist", error);
      // Reverte o estado local em caso de erro
      setTask({ ...task, checklist: previousChecklist });
      toast({
        variant: "destructive",
        title: "Erro ao atualizar checklist",
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
                    Data de entrega: {formatDateDisplay(task.due_date)}
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

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckSquare className="w-5 h-5" />
                Checklist
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ChecklistManager
                items={task.checklist || []}
                onItemsChange={handleChecklistChange}
                showProgress
              />
            </CardContent>
          </Card>

          <TaskStepDisplay 
            steps={steps} 
            stepAttachments={stepAttachments} 
            onDownloadAttachment={downloadStepAttachment}
          />

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="w-5 h-5" />
                Anexos {attachments.length > 0 && `(${attachments.length})`}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Upload section */}
              <div className="flex items-center gap-2">
                <Input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={handleFileUpload}
                  disabled={isUploading}
                  className="hidden"
                  id="file-upload"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.jpg,.jpeg,.png,.gif,.webp,.svg,.zip,.rar"
                />
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="gap-2"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      Anexar arquivos
                    </>
                  )}
                </Button>
                <span className="text-xs text-muted-foreground">
                  Máx. 10MB por arquivo
                </span>
              </div>

              {/* Attachments list */}
              {attachments.length > 0 ? (
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
                        <TooltipProvider>
                          {/* Botão de Visualizar - apenas para PDFs e imagens */}
                          {!attachment.is_link && isPreviewable(attachment.file_name) && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => previewAttachment(attachment)}
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Visualizar</p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                          
                          {/* Botão de Download/Abrir Link */}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => downloadAttachment(attachment)}
                              >
                                {attachment.is_link ? (
                                  <ExternalLink className="w-4 h-4" />
                                ) : (
                                  <Download className="w-4 h-4" />
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{attachment.is_link ? "Abrir link" : "Baixar"}</p>
                            </TooltipContent>
                          </Tooltip>

                          {/* Botão de Excluir */}
                          <AlertDialog>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </AlertDialogTrigger>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Excluir</p>
                              </TooltipContent>
                            </Tooltip>
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
                        </TooltipProvider>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhum anexo ainda. Use o botão acima para anexar arquivos.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Modal de Preview de Anexos */}
      <AttachmentPreviewModal
        isOpen={previewModal.isOpen}
        onClose={closePreviewModal}
        url={previewModal.url}
        fileName={previewModal.fileName}
        fileType={previewModal.fileType}
        onDownload={previewModal.attachment ? () => downloadAttachment(previewModal.attachment!) : undefined}
      />
    </div>
  );
};

export default TaskDetail;
