import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { X, Plus, Mail, Users, BookOpen, ListTodo, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { logError } from "@/lib/logger";
import { environmentFormSchema, memberSchema, subjectStatusSchema } from "@/lib/validation";
import {
  fetchEnvironmentSubjects,
  fetchEnvironmentStatuses,
  createEnvironmentSubject,
  createEnvironmentStatus,
  deleteEnvironmentSubject,
  deleteEnvironmentStatus,
  EnvironmentSubject,
  EnvironmentStatus,
} from "@/services/environmentData";
import { registerActivity } from "@/services/activity";

interface Member {
  email: string;
  permissions: string[];
}

const EnvironmentForm = () => {
  const { id } = useParams();
  const isNewEnvironment = !id || id === "new";
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [environmentName, setEnvironmentName] = useState("");
  const [description, setDescription] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [newMemberPermissions, setNewMemberPermissions] = useState<string[]>(["view"]);

  // Environment subjects and statuses
  const [subjects, setSubjects] = useState<EnvironmentSubject[]>([]);
  const [statuses, setStatuses] = useState<EnvironmentStatus[]>([]);
  const [newSubjectName, setNewSubjectName] = useState("");
  const [newSubjectColor, setNewSubjectColor] = useState("#3b82f6");
  const [newStatusName, setNewStatusName] = useState("");
  const [newStatusColor, setNewStatusColor] = useState("#3b82f6");

  const availablePermissions = [
    { value: "view", label: "Visualizar" },
    { value: "create", label: "Criar" },
    { value: "edit", label: "Editar" },
    { value: "delete", label: "Excluir" },
  ];

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (id && !isNewEnvironment) {
      fetchEnvironment();
    }
  }, [id, isNewEnvironment]);

  const fetchEnvironment = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("shared_environments")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;

      setEnvironmentName(data.environment_name);
      setDescription(data.description || "");

      const { data: membersData } = await supabase
        .from("environment_members")
        .select("email, permissions")
        .eq("environment_id", id);

      setMembers(membersData || []);

      // Fetch subjects and statuses
      const subjectsData = await fetchEnvironmentSubjects(id!);
      setSubjects(subjectsData);

      const statusesData = await fetchEnvironmentStatuses(id!);
      setStatuses(statusesData);
    } catch (error) {
      logError("Error fetching environment", error);
      toast.error("Erro ao carregar grupo");
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = () => {
    // Validate member input
    const validation = memberSchema.safeParse({ email: newMemberEmail, permissions: newMemberPermissions });
    if (!validation.success) {
      toast.error(validation.error.errors[0]?.message || "Dados inválidos");
      return;
    }
    if (members.some(m => m.email === newMemberEmail)) {
      toast.error("Este e-mail já foi adicionado");
      return;
    }
    setMembers([...members, { email: newMemberEmail, permissions: newMemberPermissions }]);
    setNewMemberEmail("");
    setNewMemberPermissions(["view"]);
  };

  const handleRemoveMember = (email: string) => setMembers(members.filter(m => m.email !== email));

  const handlePermissionToggle = (permission: string) => {
    setNewMemberPermissions(prev => prev.includes(permission) ? prev.filter(p => p !== permission) : [...prev, permission]);
  };

  const handleAddSubject = async () => {
    // Validate subject input
    const validation = subjectStatusSchema.safeParse({ name: newSubjectName, color: newSubjectColor });
    if (!validation.success) {
      toast.error(validation.error.errors[0]?.message || "Dados inválidos");
      return;
    }
    if (!isNewEnvironment) {
      try {
        const newSubject = await createEnvironmentSubject(id!, newSubjectName, newSubjectColor);
        setSubjects([...subjects, newSubject]);
        toast.success("Disciplina adicionada!");
      } catch { toast.error("Erro ao adicionar disciplina"); }
    } else {
      setSubjects([...subjects, { id: `temp-${Date.now()}`, environment_id: "", name: newSubjectName, color: newSubjectColor, created_at: "", updated_at: "" }]);
    }
    setNewSubjectName("");
    setNewSubjectColor("#3b82f6");
  };

  const handleRemoveSubject = async (subjectId: string) => {
    if (!isNewEnvironment && !subjectId.startsWith("temp-")) {
      try { await deleteEnvironmentSubject(subjectId); toast.success("Disciplina removida!"); } catch { toast.error("Erro"); }
    }
    setSubjects(subjects.filter(s => s.id !== subjectId));
  };

  const handleAddStatus = async () => {
    // Validate status input
    const validation = subjectStatusSchema.safeParse({ name: newStatusName, color: newStatusColor });
    if (!validation.success) {
      toast.error(validation.error.errors[0]?.message || "Dados inválidos");
      return;
    }
    if (!isNewEnvironment) {
      try {
        const newStatus = await createEnvironmentStatus(id!, newStatusName, newStatusColor);
        setStatuses([...statuses, newStatus]);
        toast.success("Status adicionado!");
      } catch { toast.error("Erro ao adicionar status"); }
    } else {
      setStatuses([...statuses, { id: `temp-${Date.now()}`, environment_id: "", name: newStatusName, color: newStatusColor, created_at: "", updated_at: "", is_default: false, order_index: statuses.length, parent_id: null }]);
    }
    setNewStatusName("");
    setNewStatusColor("#3b82f6");
  };

  const handleRemoveStatus = async (statusId: string) => {
    if (!isNewEnvironment && !statusId.startsWith("temp-")) {
      try { await deleteEnvironmentStatus(statusId); toast.success("Status removido!"); } catch { toast.error("Erro"); }
    }
    setStatuses(statuses.filter(s => s.id !== statusId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate environment form
    const validation = environmentFormSchema.safeParse({ environment_name: environmentName, description });
    if (!validation.success) {
      toast.error(validation.error.errors[0]?.message || "Dados inválidos");
      return;
    }
    
    if (!user?.id) { toast.error("Usuário não autenticado"); return; }

    try {
      setLoading(true);
      if (isNewEnvironment) {
        const { data: envData, error } = await supabase.from("shared_environments").insert({ environment_name: validation.data.environment_name, description: validation.data.description || null, owner_id: user.id }).select().single();
        if (error) throw error;

        if (members.length > 0) {
          await supabase.from("environment_members").insert(members.map(m => ({ environment_id: envData.id, email: m.email, user_id: null, permissions: m.permissions as any })));
        }
        for (const s of subjects) await createEnvironmentSubject(envData.id, s.name, s.color);
        for (const s of statuses) await createEnvironmentStatus(envData.id, s.name, s.color);

        // Registra atividade para a ofensiva
        if (user) {
          registerActivity(user.id);
        }

        toast.success("Grupo de trabalho criado!");
        navigate(`/environment/${envData.id}`);
      } else {
        await supabase.from("shared_environments").update({ environment_name: validation.data.environment_name, description: validation.data.description || null }).eq("id", id);

        const { data: existingMembers } = await supabase.from("environment_members").select("email").eq("environment_id", id);
        const existingEmails = existingMembers?.map(m => m.email) || [];
        const emailsToDelete = existingEmails.filter(e => !members.map(m => m.email).includes(e));
        if (emailsToDelete.length > 0) await supabase.from("environment_members").delete().eq("environment_id", id).in("email", emailsToDelete);
        
        const membersToAdd = members.filter(m => !existingEmails.includes(m.email));
        if (membersToAdd.length > 0) await supabase.from("environment_members").insert(membersToAdd.map(m => ({ environment_id: id, email: m.email, user_id: null, permissions: m.permissions as any })));

        toast.success("Grupo atualizado!");
        navigate(`/environment/${id}`);
      }
    } catch (error) { logError("Error saving environment", error); toast.error("Erro ao salvar grupo"); } finally { setLoading(false); }
  };

  if (authLoading || !user) return <div className="min-h-screen flex items-center justify-center"><p className="text-muted-foreground">Carregando...</p></div>;
  if (!isNewEnvironment && loading) return <div className="min-h-screen flex items-center justify-center"><p className="text-muted-foreground">Carregando grupo...</p></div>;

  return (
    <div className="min-h-screen bg-background">
      <Navbar minimal />
      <div className="container mx-auto px-6 py-8 max-w-4xl">
        <h1 className="text-3xl font-bold text-foreground mb-8">{isNewEnvironment ? "Novo Grupo de Trabalho" : "Editar Grupo"}</h1>
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Informações do Grupo</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2"><Label>Nome do Grupo *</Label><Input value={environmentName} onChange={(e) => setEnvironmentName(e.target.value)} placeholder="Ex: Projeto TCC, Grupo de Estudos..." required /></div>
              <div className="space-y-2"><Label>Descrição</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} /></div>
            </CardContent>
          </Card>

          <Tabs defaultValue="members">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="members"><Users className="w-4 h-4 mr-2" />Membros</TabsTrigger>
              <TabsTrigger value="subjects"><BookOpen className="w-4 h-4 mr-2" />Disciplinas</TabsTrigger>
              <TabsTrigger value="statuses"><ListTodo className="w-4 h-4 mr-2" />Status</TabsTrigger>
            </TabsList>

            <TabsContent value="members">
              <Card>
                <CardHeader><CardTitle>Membros</CardTitle><CardDescription>Adicione membros por email</CardDescription></CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2"><Input type="email" value={newMemberEmail} onChange={(e) => setNewMemberEmail(e.target.value)} placeholder="email@exemplo.com" className="flex-1" /><Button type="button" onClick={handleAddMember}><Plus className="w-4 h-4" /></Button></div>
                  <div className="flex flex-wrap gap-4">{availablePermissions.map(p => <div key={p.value} className="flex items-center space-x-2"><Checkbox checked={newMemberPermissions.includes(p.value)} onCheckedChange={() => handlePermissionToggle(p.value)} /><Label>{p.label}</Label></div>)}</div>
                  {members.map(m => <div key={m.email} className="flex items-center justify-between p-3 bg-muted rounded-lg"><div className="flex items-center gap-2"><Mail className="w-4 h-4" /><span>{m.email}</span></div><div className="flex items-center gap-2">{m.permissions.map(p => <Badge key={p} variant="secondary">{availablePermissions.find(ap => ap.value === p)?.label}</Badge>)}<Button type="button" variant="ghost" size="sm" onClick={() => handleRemoveMember(m.email)}><X className="w-4 h-4" /></Button></div></div>)}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="subjects">
              <Card>
                <CardHeader><CardTitle>Disciplinas</CardTitle><CardDescription>Disciplinas disponíveis neste grupo</CardDescription></CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2"><Input value={newSubjectName} onChange={(e) => setNewSubjectName(e.target.value)} placeholder="Nome da disciplina" className="flex-1" /><Input type="color" value={newSubjectColor} onChange={(e) => setNewSubjectColor(e.target.value)} className="w-12" /><Button type="button" onClick={handleAddSubject}><Plus className="w-4 h-4" /></Button></div>
                  {subjects.map(s => <div key={s.id} className="flex items-center justify-between p-3 bg-muted rounded-lg"><div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full" style={{ backgroundColor: s.color || "#3b82f6" }} /><span>{s.name}</span></div><Button type="button" variant="ghost" size="sm" onClick={() => handleRemoveSubject(s.id)}><Trash2 className="w-4 h-4" /></Button></div>)}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="statuses">
              <Card>
                <CardHeader><CardTitle>Status</CardTitle><CardDescription>Status disponíveis neste grupo</CardDescription></CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2"><Input value={newStatusName} onChange={(e) => setNewStatusName(e.target.value)} placeholder="Nome do status" className="flex-1" /><Input type="color" value={newStatusColor} onChange={(e) => setNewStatusColor(e.target.value)} className="w-12" /><Button type="button" onClick={handleAddStatus}><Plus className="w-4 h-4" /></Button></div>
                  {statuses.map(s => <div key={s.id} className="flex items-center justify-between p-3 bg-muted rounded-lg"><div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full" style={{ backgroundColor: s.color || "#3b82f6" }} /><span>{s.name}</span></div><Button type="button" variant="ghost" size="sm" onClick={() => handleRemoveStatus(s.id)}><Trash2 className="w-4 h-4" /></Button></div>)}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="flex gap-4 justify-end"><Button type="button" variant="outline" onClick={() => navigate("/shared-environments")}>Cancelar</Button><Button type="submit" disabled={loading}>{loading ? "Salvando..." : isNewEnvironment ? "Criar Grupo" : "Salvar"}</Button></div>
        </form>
      </div>
    </div>
  );
};

export default EnvironmentForm;
