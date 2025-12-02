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
import { X, Plus, Mail } from "lucide-react";
import { toast } from "sonner";

interface Member {
  email: string;
  permissions: string[];
}

const EnvironmentForm = () => {
  const { id } = useParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [environmentName, setEnvironmentName] = useState("");
  const [description, setDescription] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [newMemberPermissions, setNewMemberPermissions] = useState<string[]>(["view"]);

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
    if (id && id !== "new") {
      fetchEnvironment();
    }
  }, [id]);

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

      // Fetch members
      const { data: membersData, error: membersError } = await supabase
        .from("environment_members")
        .select("email, permissions")
        .eq("environment_id", id);

      if (membersError) throw membersError;

      setMembers(membersData || []);
    } catch (error: any) {
      console.error("Error fetching environment:", error);
      toast.error("Erro ao carregar ambiente");
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = () => {
    if (!newMemberEmail) {
      toast.error("Digite um e-mail válido");
      return;
    }

    if (members.some(m => m.email === newMemberEmail)) {
      toast.error("Este e-mail já foi adicionado");
      return;
    }

    if (newMemberPermissions.length === 0) {
      toast.error("Selecione pelo menos uma permissão");
      return;
    }

    setMembers([...members, { email: newMemberEmail, permissions: newMemberPermissions }]);
    setNewMemberEmail("");
    setNewMemberPermissions(["view"]);
  };

  const handleRemoveMember = (email: string) => {
    setMembers(members.filter(m => m.email !== email));
  };

  const handlePermissionToggle = (permission: string) => {
    setNewMemberPermissions(prev =>
      prev.includes(permission)
        ? prev.filter(p => p !== permission)
        : [...prev, permission]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!environmentName.trim()) {
      toast.error("Digite um nome para o ambiente");
      return;
    }

    try {
      setLoading(true);

      if (id === "new") {
        // Create new environment
        const { data: envData, error: envError } = await supabase
          .from("shared_environments")
          .insert({
            environment_name: environmentName,
            description: description || null,
            owner_id: user?.id,
          })
          .select()
          .single();

        if (envError) throw envError;

        // Add members
        if (members.length > 0) {
          const { error: membersError } = await supabase
            .from("environment_members")
            .insert(
              members.map(m => ({
                environment_id: envData.id,
                email: m.email,
                user_id: null, // Will be updated when user accepts invitation
                permissions: m.permissions as ("view" | "create" | "edit" | "delete")[],
              }))
            );

          if (membersError) throw membersError;
        }

        toast.success("Ambiente criado com sucesso!");
        navigate(`/environment/${envData.id}`);
      } else {
        // Update existing environment
        const { error: envError } = await supabase
          .from("shared_environments")
          .update({
            environment_name: environmentName,
            description: description || null,
          })
          .eq("id", id);

        if (envError) throw envError;

        toast.success("Ambiente atualizado com sucesso!");
        navigate(`/environment/${id}`);
      }
    } catch (error: any) {
      console.error("Error saving environment:", error);
      toast.error("Erro ao salvar ambiente");
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || (id !== "new" && loading)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar minimal />
      <div className="container mx-auto px-6 py-8 max-w-4xl">
        <h1 className="text-3xl font-bold text-foreground mb-8">
          {id === "new" ? "Novo Ambiente" : "Editar Ambiente"}
        </h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informações do Ambiente</CardTitle>
              <CardDescription>
                Defina as informações básicas do ambiente compartilhado
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome do Ambiente *</Label>
                <Input
                  id="name"
                  value={environmentName}
                  onChange={(e) => setEnvironmentName(e.target.value)}
                  placeholder="Ex: Projeto TCC, Marketing Q1"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descreva o propósito deste ambiente..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Membros e Permissões</CardTitle>
              <CardDescription>
                Adicione membros e defina suas permissões
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <Label>Adicionar Membro</Label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Input
                      type="email"
                      value={newMemberEmail}
                      onChange={(e) => setNewMemberEmail(e.target.value)}
                      placeholder="email@exemplo.com"
                    />
                  </div>
                  <Button type="button" onClick={handleAddMember}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>

                <div className="flex flex-wrap gap-4">
                  {availablePermissions.map((perm) => (
                    <div key={perm.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={`perm-${perm.value}`}
                        checked={newMemberPermissions.includes(perm.value)}
                        onCheckedChange={() => handlePermissionToggle(perm.value)}
                      />
                      <Label htmlFor={`perm-${perm.value}`} className="cursor-pointer">
                        {perm.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {members.length > 0 && (
                <div className="space-y-3">
                  <Label>Membros Adicionados</Label>
                  {members.map((member) => (
                    <div
                      key={member.email}
                      className="flex items-center justify-between p-3 bg-muted rounded-lg"
                    >
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">{member.email}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1">
                          {member.permissions.map((perm) => (
                            <Badge key={perm} variant="secondary" className="text-xs">
                              {availablePermissions.find(p => p.value === perm)?.label}
                            </Badge>
                          ))}
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveMember(member.email)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex gap-4 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/shared-environments")}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Salvando..." : id === "new" ? "Criar Ambiente" : "Salvar Alterações"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EnvironmentForm;
