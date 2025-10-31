import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Calendar as CalendarIcon, Upload, X, Loader2, ChevronsUpDown, Check } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";

const TaskForm = () => {
  const { id } = useParams();
  const isEditing = Boolean(id);
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [subjectName, setSubjectName] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState<Date>();
  const [isGroupWork, setIsGroupWork] = useState(false);
  const [groupMembers, setGroupMembers] = useState("");
  const [googleDocsLink, setGoogleDocsLink] = useState("");
  const [canvaLink, setCanvaLink] = useState("");
  const [status, setStatus] = useState("not_started");
  const [files, setFiles] = useState<File[]>([]);
  const [links, setLinks] = useState<{ name: string; url: string }[]>([]);
  const [newLinkName, setNewLinkName] = useState("");
  const [newLinkUrl, setNewLinkUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [existingSubjects, setExistingSubjects] = useState<string[]>([]);
  const [openSubjectCombo, setOpenSubjectCombo] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchExistingSubjects();
    }
  }, [user]);

  useEffect(() => {
    if (isEditing && id) {
      fetchTask();
    }
  }, [isEditing, id]);

  const fetchExistingSubjects = async () => {
    try {
      const { data, error } = await supabase
        .from("tasks")
        .select("subject_name")
        .eq("user_id", user!.id);

      if (error) throw error;

      const uniqueSubjects = [...new Set(data.map(task => task.subject_name))].sort();
      setExistingSubjects(uniqueSubjects);
    } catch (error) {
      console.error("Error fetching subjects:", error);
    }
  };

  const fetchTask = async () => {
    try {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;

      setSubjectName(data.subject_name);
      setDescription(data.description || "");
      setDueDate(new Date(data.due_date));
      setIsGroupWork(data.is_group_work);
      setGroupMembers(data.group_members || "");
      setGoogleDocsLink(data.google_docs_link || "");
      setCanvaLink(data.canva_link || "");
      setStatus(data.status);
      
      // Fetch existing links
      const { data: attachmentsData } = await supabase
        .from("task_attachments")
        .select("*")
        .eq("task_id", id)
        .eq("is_link", true);

      if (attachmentsData) {
        setLinks(attachmentsData.map(att => ({
          name: att.file_name,
          url: att.file_path
        })));
      }
    } catch (error) {
      console.error("Error fetching task:", error);
      toast({
        variant: "destructive",
        title: "Erro ao carregar tarefa",
        description: "Tente novamente mais tarde.",
      });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const addLink = () => {
    if (newLinkName && newLinkUrl) {
      setLinks([...links, { name: newLinkName, url: newLinkUrl }]);
      setNewLinkName("");
      setNewLinkUrl("");
    }
  };

  const removeLink = (index: number) => {
    setLinks(links.filter((_, i) => i !== index));
  };

  const uploadFiles = async (taskId: string) => {
    if (files.length === 0 && links.length === 0) return;

    setUploading(true);
    try {
      // Upload files
      for (const file of files) {
        const fileExt = file.name.split(".").pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${user!.id}/${taskId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("task-attachments")
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { error: dbError } = await supabase
          .from("task_attachments")
          .insert({
            task_id: taskId,
            file_name: file.name,
            file_path: filePath,
            file_size: file.size,
            file_type: file.type,
            is_link: false,
          });

        if (dbError) throw dbError;
      }

      // Save links
      for (const link of links) {
        const { error: dbError } = await supabase
          .from("task_attachments")
          .insert({
            task_id: taskId,
            file_name: link.name,
            file_path: link.url,
            file_size: null,
            file_type: null,
            is_link: true,
          });

        if (dbError) throw dbError;
      }
    } catch (error) {
      console.error("Error uploading files:", error);
      throw error;
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);


    try {
      const taskData = {
        subject_name: subjectName,
        description: description || null,
        due_date: dueDate ? format(dueDate, "yyyy-MM-dd") : null,
        is_group_work: isGroupWork,
        group_members: isGroupWork ? groupMembers : null,
        google_docs_link: googleDocsLink || null,
        canva_link: canvaLink || null,
        status,
        user_id: user!.id,
      };

      if (isEditing) {
        const { error } = await supabase
          .from("tasks")
          .update(taskData)
          .eq("id", id);

        if (error) throw error;

        // Delete existing links if editing
        await supabase
          .from("task_attachments")
          .delete()
          .eq("task_id", id)
          .eq("is_link", true);

        if (files.length > 0 || links.length > 0) {
          await uploadFiles(id!);
        }

        toast({
          title: "Tarefa atualizada",
          description: "As alterações foram salvas com sucesso.",
        });
      } else {
        const { data, error } = await supabase
          .from("tasks")
          .insert(taskData)
          .select()
          .single();

        if (error) throw error;

        if (files.length > 0 || links.length > 0) {
          await uploadFiles(data.id);
        }

        toast({
          title: "Tarefa criada",
          description: "Sua nova tarefa foi adicionada com sucesso.",
        });
      }

      navigate("/dashboard");
    } catch (error) {
      console.error("Error saving task:", error);
      toast({
        variant: "destructive",
        title: "Erro ao salvar tarefa",
        description: "Tente novamente mais tarde.",
      });
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">
              {isEditing ? "Editar Tarefa" : "Nova Tarefa"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="subject">Nome da Disciplina *</Label>
                <Popover open={openSubjectCombo} onOpenChange={setOpenSubjectCombo}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={openSubjectCombo}
                      className="w-full justify-between"
                    >
                      {subjectName || "Selecione ou digite uma disciplina..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0" align="start">
                    <Command>
                      <CommandInput 
                        placeholder="Pesquisar ou adicionar disciplina..." 
                        value={subjectName}
                        onValueChange={setSubjectName}
                      />
                      <CommandList>
                        <CommandEmpty>
                          <div className="text-sm p-2">
                            {subjectName ? (
                              <button
                                type="button"
                                onClick={() => setOpenSubjectCombo(false)}
                                className="w-full text-left hover:bg-accent rounded p-2"
                              >
                                Criar "{subjectName}"
                              </button>
                            ) : (
                              "Digite o nome da disciplina"
                            )}
                          </div>
                        </CommandEmpty>
                        <CommandGroup>
                          {existingSubjects.map((subject) => (
                            <CommandItem
                              key={subject}
                              value={subject}
                              onSelect={(value) => {
                                setSubjectName(value);
                                setOpenSubjectCombo(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  subjectName === subject ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {subject}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição da Tarefa</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descreva os detalhes da tarefa..."
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label>Data de Entrega</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !dueDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dueDate ? format(dueDate, "PPP", { locale: ptBR }) : "Selecione uma data (opcional)"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dueDate}
                      onSelect={setDueDate}
                      initialFocus
                      className="pointer-events-auto"
                      modifiers={{
                        weekend: (date) => date.getDay() === 0 || date.getDay() === 6,
                      }}
                      modifiersClassNames={{
                        weekend: "text-red-500",
                      }}
                      disabled={() => false}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status da Tarefa</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="not_started">Não Iniciada</SelectItem>
                    <SelectItem value="in_progress">Em Andamento</SelectItem>
                    <SelectItem value="completed">Concluída</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="googleDocs">Link do Trabalho Escrito</Label>
                <Input
                  id="googleDocs"
                  type="url"
                  value={googleDocsLink}
                  onChange={(e) => setGoogleDocsLink(e.target.value)}
                  placeholder="https://docs.google.com/..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="canva">Link da Apresentação</Label>
                <Input
                  id="canva"
                  type="url"
                  value={canvaLink}
                  onChange={(e) => setCanvaLink(e.target.value)}
                  placeholder="https://www.canva.com/..."
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="groupWork"
                  checked={isGroupWork}
                  onCheckedChange={(checked) => setIsGroupWork(checked as boolean)}
                />
                <Label htmlFor="groupWork" className="cursor-pointer">
                  É um trabalho em grupo?
                </Label>
              </div>

              {isGroupWork && (
                <div className="space-y-2">
                  <Label htmlFor="groupMembers">Participantes do Grupo</Label>
                  <Textarea
                    id="groupMembers"
                    value={groupMembers}
                    onChange={(e) => setGroupMembers(e.target.value)}
                    placeholder="Nome dos participantes (um por linha)"
                    rows={3}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="files">Anexar Arquivos</Label>
                <Input
                  id="files"
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  className="cursor-pointer"
                />
                {files.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {files.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 bg-secondary rounded-lg"
                      >
                        <span className="text-sm truncate">{file.name}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(index)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Anexar Links</Label>
                <div className="space-y-2">
                  <Input
                    placeholder="Nome do link"
                    value={newLinkName}
                    onChange={(e) => setNewLinkName(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Input
                      placeholder="URL do link"
                      type="url"
                      value={newLinkUrl}
                      onChange={(e) => setNewLinkUrl(e.target.value)}
                    />
                    <Button
                      type="button"
                      onClick={addLink}
                      disabled={!newLinkName || !newLinkUrl}
                    >
                      Adicionar
                    </Button>
                  </div>
                </div>
                {links.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {links.map((link, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 bg-secondary rounded-lg"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{link.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{link.url}</p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeLink(index)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/dashboard")}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading || uploading} className="flex-1">
                  {loading || uploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {uploading ? "Enviando arquivos..." : "Salvando..."}
                    </>
                  ) : isEditing ? (
                    "Atualizar Tarefa"
                  ) : (
                    "Criar Tarefa"
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default TaskForm;
