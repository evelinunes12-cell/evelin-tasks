import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useConfetti } from "@/hooks/useConfetti";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Task, ChecklistItem, parseDueDate, formatDateForDB } from "@/services/tasks";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { fetchTaskAssignees, type TaskAssignee } from "@/services/taskAssignees";
import { useToast } from "@/hooks/use-toast";
import { logError } from "@/lib/logger";
import { registerActivity } from "@/services/activity";
import { logXP, logXPForTaskAssignees, XP } from "@/services/scoring";
import { uploadTaskFile } from "@/services/attachments";
import { archiveTask } from "@/services/archive";
import ChecklistManager from "@/components/ChecklistManager";
import { AttachmentPreviewModal } from "@/components/AttachmentPreviewModal";
import { safeOpen } from "@/utils/sanitize";
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
  Archive,
  MoreVertical,
  StickyNote,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { sanitizeHtml } from "@/utils/sanitize";
import TaskStepDisplay from "@/components/TaskStepDisplay";
import { NoteDialog } from "@/components/planner/NoteDialog";
import { createNote } from "@/services/planner";
import { fetchSubjects, Subject } from "@/services/subjects";
import RichTextEditor from "@/components/RichTextEditor";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import HierarchicalStatusSelect, { HierarchicalStatus } from "@/components/HierarchicalStatusSelect";
import { fetchStatusesHierarchical } from "@/services/statuses";
import { fetchEnvironmentStatusesHierarchical } from "@/services/environmentData";
import { cn } from "@/lib/utils";

import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast as sonnerToast } from "sonner";

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
  const [linkedNotes, setLinkedNotes] = useState<{ id: string; title: string; planned_date: string | null }[]>([]);
  const [assignees, setAssignees] = useState<TaskAssignee[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isNoteDialogOpen, setIsNoteDialogOpen] = useState(false);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [taskSubjectId, setTaskSubjectId] = useState<string | null>(null);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [descriptionDraft, setDescriptionDraft] = useState("");
  const [isSavingDescription, setIsSavingDescription] = useState(false);
  // Inline edit: status
  const [statuses, setStatuses] = useState<HierarchicalStatus[]>([]);
  const [openStatusCombo, setOpenStatusCombo] = useState(false);
  const [isSavingStatus, setIsSavingStatus] = useState(false);
  // Inline edit: data de entrega
  const [openDatePopover, setOpenDatePopover] = useState(false);
  const [isSavingDate, setIsSavingDate] = useState(false);
  
  // Tipos de arquivo suportados para preview
  const PREVIEWABLE_EXTENSIONS = ['pdf', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx'];
  const DOCUMENT_EXTENSIONS = ['doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx'];

  // Estado do modal de preview
  const [previewModal, setPreviewModal] = useState<{
    isOpen: boolean;
    url: string | null;
    fileName: string;
    fileType: "pdf" | "image" | "document";
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
    return PREVIEWABLE_EXTENSIONS.includes(extension || '');
  };

  // Determina tipo do arquivo para o modal
  const getFileType = (fileName: string): "pdf" | "image" | "document" => {
    const extension = fileName.toLowerCase().split('.').pop() || '';
    if (extension === 'pdf') return 'pdf';
    if (DOCUMENT_EXTENSIONS.includes(extension)) return 'document';
    return 'image';
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
      fetchLinkedNotes();
      fetchAssignees();
      fetchSubjects().then((subs) => {
        setSubjects(subs);
      }).catch(() => {});
    }
  }, [user, authLoading, id, navigate]);

  const fetchLinkedNotes = async () => {
    try {
      const { data, error } = await supabase
        .from("planner_notes")
        .select("id, title, planned_date")
        .eq("task_id", id)
        .order("created_at", { ascending: false });

      if (!error && data) {
        setLinkedNotes(data);
      }
    } catch (error) {
      logError("Error fetching linked notes", error);
    }
  };

  const fetchAssignees = async () => {
    if (!id) return;
    try {
      const data = await fetchTaskAssignees(id);
      setAssignees(data);
    } catch (error) {
      logError("Error fetching task assignees", error);
    }
  };

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
        safeOpen(attachment.file_path);
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
        logXP(user.id, "checklist_update", XP.CHECKLIST_UPDATE);
        if (id) logXPForTaskAssignees(id, "checklist_update");
        queryClient.invalidateQueries({ queryKey: ['user-streak', user.id] });
      }

      // 1 XP por item novo adicionado (limite diário de 20 XP enforce no servidor)
      const addedCount = newItems.length - previousChecklist.length;
      if (addedCount > 0 && user?.id) {
        for (let i = 0; i < addedCount; i++) {
          logXP(user.id, "checklist_item_added", XP.CHECKLIST_ITEM_ADDED);
          if (id) logXPForTaskAssignees(id, "checklist_item_added");
        }
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

  const handleSaveDescription = async () => {
    if (!task || !id) return;
    setIsSavingDescription(true);
    try {
      // Convert empty editor content to null
      const isEmpty = descriptionDraft === "<p></p>" || descriptionDraft.trim() === "";
      const newDescription = isEmpty ? null : descriptionDraft;

      const { error } = await supabase
        .from("tasks")
        .update({ description: newDescription })
        .eq("id", id);

      if (error) throw error;

      setTask({ ...task, description: newDescription });
      setIsEditingDescription(false);
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      sonnerToast.success("Descrição atualizada!");

      if (user?.id) {
        registerActivity(user.id);
        logXP(user.id, "edit_basic", XP.EDIT_BASIC);
        if (id) logXPForTaskAssignees(id, "edit_basic");
      }
    } catch (error) {
      logError("Error updating description", error);
      sonnerToast.error("Erro ao salvar descrição");
    } finally {
      setIsSavingDescription(false);
    }
  };

  useEffect(() => {
    if (task && subjects.length > 0) {
      const match = subjects.find((s) => s.name === task.subject_name);
      setTaskSubjectId(match?.id || null);
    }
  }, [task, subjects]);

  // Carrega os status disponíveis (do ambiente ou pessoais) para edição inline
  useEffect(() => {
    if (!task) return;
    const loadStatuses = async () => {
      try {
        const data = task.environment_id
          ? await fetchEnvironmentStatusesHierarchical(task.environment_id)
          : await fetchStatusesHierarchical();
        setStatuses(data as unknown as HierarchicalStatus[]);
      } catch (error) {
        logError("Error fetching statuses", error);
      }
    };
    loadStatuses();
  }, [task?.environment_id]);

  // Edição inline: altera o status salvando automaticamente
  const handleInlineStatusChange = async (newStatus: string) => {
    if (!task || !id || newStatus === task.status) {
      setOpenStatusCombo(false);
      return;
    }
    const previousStatus = task.status;
    setTask({ ...task, status: newStatus });
    setOpenStatusCombo(false);
    setIsSavingStatus(true);
    try {
      const { error } = await supabase
        .from("tasks")
        .update({ status: newStatus })
        .eq("id", id);
      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      sonnerToast.success("Status atualizado!");

      if (user?.id) {
        if (newStatus.toLowerCase().includes("conclu")) {
          triggerConfetti();
          await registerActivity(user.id);
          queryClient.invalidateQueries({ queryKey: ["user-streak", user.id] });
          logXP(user.id, "task_completed", XP.TASK_COMPLETED);
          logXPForTaskAssignees(id, "task_completed");
        } else {
          await registerActivity(user.id);
          queryClient.invalidateQueries({ queryKey: ["user-streak", user.id] });
          logXP(user.id, "status_change", XP.STATUS_CHANGE);
          logXPForTaskAssignees(id, "status_change");
        }
      }
    } catch (error) {
      logError("Error updating status inline", error);
      setTask((prev) => (prev ? { ...prev, status: previousStatus } : prev));
      sonnerToast.error("Erro ao atualizar status");
    } finally {
      setIsSavingStatus(false);
    }
  };

  // Edição inline: altera a data de entrega salvando automaticamente
  const handleInlineDueDateChange = async (date: Date | undefined) => {
    if (!task || !id) return;
    const newDueDate = date ? formatDateForDB(date) : null;
    if (newDueDate === task.due_date) {
      setOpenDatePopover(false);
      return;
    }
    const previousDueDate = task.due_date;
    setTask({ ...task, due_date: newDueDate as string });
    setOpenDatePopover(false);
    setIsSavingDate(true);
    try {
      const { error } = await supabase
        .from("tasks")
        .update({ due_date: newDueDate })
        .eq("id", id);
      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      sonnerToast.success("Data de entrega atualizada!");

      if (user?.id) {
        registerActivity(user.id);
        logXP(user.id, "edit_basic", XP.EDIT_BASIC);
        logXPForTaskAssignees(id, "edit_basic");
      }
    } catch (error) {
      logError("Error updating due date inline", error);
      setTask((prev) => (prev ? { ...prev, due_date: previousDueDate } : prev));
      sonnerToast.error("Erro ao atualizar data de entrega");
    } finally {
      setIsSavingDate(false);
    }
  };


  const handleSaveNote = async (data: {
    title: string;
    content: string;
    subject_id: string | null;
    task_id: string | null;
    planned_date: string | null;
  }) => {
    if (!user?.id) return;
    try {
      await createNote(user.id, {
        title: data.title,
        content: data.content,
        subject_id: data.subject_id,
        task_id: data.task_id,
        planned_date: data.planned_date,
      });
      queryClient.invalidateQueries({ queryKey: ["planner-notes"] });
      fetchLinkedNotes();
      toast({ title: "Anotação criada", description: "Vinculada a esta tarefa." });
    } catch (error) {
      logError("Error creating note from task", error);
      toast({ variant: "destructive", title: "Erro ao criar anotação" });
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
        <div className="flex items-center justify-between mb-6 gap-2">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground truncate">{task.subject_name}</h1>
          <div className="flex items-center gap-2 shrink-0">
            <Button onClick={() => navigate(`/task/edit/${id}`)} size="sm" className="gap-2">
              <Edit className="w-4 h-4" />
              <span className="hidden sm:inline">Editar</span>
            </Button>
            <Button variant="outline" size="sm" onClick={() => setIsNoteDialogOpen(true)} className="gap-2">
              <StickyNote className="w-4 h-4" />
              <span className="hidden sm:inline">Criar Anotação</span>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="h-8 w-8 sm:h-9 sm:w-9">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-popover">
                <DropdownMenuItem 
                  onClick={async () => {
                    try {
                      await archiveTask(task.id);
                      sonnerToast.success("Tarefa arquivada!", {
                        description: "Você pode encontrá-la em Tarefas Arquivadas.",
                        action: {
                          label: "Ver",
                          onClick: () => navigate("/archived"),
                        },
                      });
                      queryClient.invalidateQueries({ queryKey: ['tasks'] });
                      navigate("/dashboard");
                    } catch (error) {
                      sonnerToast.error("Erro ao arquivar tarefa");
                    }
                  }} 
                  className="gap-2"
                >
                  <Archive className="w-4 h-4" />
                  Arquivar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
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
              {assignees.length > 0 && (
                <div className="flex items-start gap-2 pt-2 border-t">
                  <Users className="w-4 h-4 text-muted-foreground mt-1 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium mb-2">Membros vinculados</p>
                    <div className="flex flex-wrap gap-2">
                      {assignees.map((a) => {
                        const name = a.full_name || a.username || a.email || "Usuário";
                        const initials = name
                          .split(/\s+/)
                          .map((p) => p[0])
                          .filter(Boolean)
                          .slice(0, 2)
                          .join("")
                          .toUpperCase();
                        return (
                          <Badge
                            key={a.user_id}
                            variant="secondary"
                            className="gap-2 pl-1 pr-2 py-1"
                          >
                            <Avatar className="h-5 w-5">
                              <AvatarImage src={a.avatar_url || undefined} />
                              <AvatarFallback className="text-[9px]">
                                {initials}
                              </AvatarFallback>
                            </Avatar>
                            <span className="truncate max-w-[160px]">{name}</span>
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>


          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Descrição
                </div>
                {!isEditingDescription ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setDescriptionDraft(task.description || "");
                      setIsEditingDescription(true);
                    }}
                    className="h-8 gap-1.5 text-muted-foreground"
                  >
                    <Edit className="w-4 h-4" />
                    Editar
                  </Button>
                ) : (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsEditingDescription(false)}
                      className="h-8"
                    >
                      Cancelar
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSaveDescription}
                      disabled={isSavingDescription}
                      className="h-8"
                    >
                      {isSavingDescription ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-1" />
                      ) : null}
                      Salvar
                    </Button>
                  </div>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isEditingDescription ? (
                <RichTextEditor
                  content={descriptionDraft}
                  onChange={setDescriptionDraft}
                  editable={true}
                  placeholder="Adicione uma descrição..."
                />
              ) : task.description ? (
                <div
                  className="text-sm prose prose-sm dark:prose-invert max-w-none cursor-pointer rounded-md p-2 -m-2 hover:bg-muted/50 transition-colors"
                  onClick={() => {
                    setDescriptionDraft(task.description || "");
                    setIsEditingDescription(true);
                  }}
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(task.description) }}
                />
              ) : (
                <p
                  className="text-sm text-muted-foreground cursor-pointer rounded-md p-2 -m-2 hover:bg-muted/50 transition-colors italic"
                  onClick={() => {
                    setDescriptionDraft("");
                    setIsEditingDescription(true);
                  }}
                >
                  Clique para adicionar uma descrição...
                </p>
              )}
            </CardContent>
          </Card>

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
                      className="text-sm text-primary hover:underline break-all"
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
                      className="text-sm text-primary hover:underline break-all"
                    >
                      {task.canva_link}
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {linkedNotes.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <StickyNote className="w-5 h-5" />
                  Anotações Vinculadas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {linkedNotes.map((note) => (
                  <button
                    key={note.id}
                    onClick={() => navigate("/planner")}
                    className="flex items-center justify-between w-full rounded-md border p-3 text-left hover:bg-accent transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <StickyNote className="h-4 w-4 text-primary shrink-0" />
                      <span className="text-sm font-medium truncate">
                        {note.title || "Sem título"}
                      </span>
                    </div>
                    {note.planned_date && (
                      <span className="text-xs text-muted-foreground shrink-0 ml-2">
                        {format(new Date(note.planned_date + "T12:00:00"), "dd/MM", { locale: ptBR })}
                      </span>
                    )}
                  </button>
                ))}
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
                          <p className="text-sm font-medium break-all">{attachment.file_name}</p>
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

      {/* Modal de Criar Anotação vinculada */}
      <NoteDialog
        open={isNoteDialogOpen}
        onOpenChange={setIsNoteDialogOpen}
        subjects={subjects}
        prefilledTaskId={id}
        prefilledSubjectId={taskSubjectId}
        onSave={handleSaveNote}
      />
    </div>
  );
};

export default TaskDetail;
