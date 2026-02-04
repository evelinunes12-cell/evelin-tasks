import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Pencil, Trash2, Plus, ChevronDown, ChevronRight, LayoutDashboard, Columns3 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

interface TaskStatus {
  id: string;
  name: string;
  color: string | null;
  is_default: boolean;
  order_index: number;
  parent_id: string | null;
  show_in_dashboard: boolean;
  show_in_kanban: boolean;
  children?: TaskStatus[];
}

export default function TaskStatuses() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [statuses, setStatuses] = useState<TaskStatus[]>([]);
  const [hierarchicalStatuses, setHierarchicalStatuses] = useState<TaskStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStatus, setEditingStatus] = useState<TaskStatus | null>(null);
  const [statusName, setStatusName] = useState("");
  const [statusColor, setStatusColor] = useState("#3b82f6");
  const [parentId, setParentId] = useState<string | null>(null);
  const [showInDashboard, setShowInDashboard] = useState(true);
  const [showInKanban, setShowInKanban] = useState(true);
  const [expandedParents, setExpandedParents] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (user) {
      fetchStatuses();
    }
  }, [user]);

  const fetchStatuses = async () => {
    try {
      const { data, error } = await supabase
        .from("task_statuses")
        .select("*")
        .order("order_index", { ascending: true });

      if (error) throw error;
      
      const allStatuses = (data || []) as TaskStatus[];
      setStatuses(allStatuses);
      
      // Organize into hierarchy
      const parents = allStatuses.filter(s => !s.parent_id);
      const children = allStatuses.filter(s => s.parent_id);
      
      const hierarchical = parents.map(parent => ({
        ...parent,
        children: children.filter(child => child.parent_id === parent.id)
      }));
      
      setHierarchicalStatuses(hierarchical);
      
      // Auto-expand parents that have children
      const parentsWithChildren = new Set(
        hierarchical.filter(p => p.children && p.children.length > 0).map(p => p.id)
      );
      setExpandedParents(parentsWithChildren);
    } catch (error) {
      toast({
        title: "Erro ao carregar status",
        description: "Não foi possível carregar os status.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (status?: TaskStatus, isChild: boolean = false, preselectedParentId?: string) => {
    if (status) {
      setEditingStatus(status);
      setStatusName(status.name);
      setStatusColor(status.color || "#3b82f6");
      setParentId(status.parent_id);
      setShowInDashboard(status.show_in_dashboard);
      setShowInKanban(status.show_in_kanban);
    } else {
      setEditingStatus(null);
      setStatusName("");
      setStatusColor("#3b82f6");
      setParentId(isChild && preselectedParentId ? preselectedParentId : null);
      setShowInDashboard(true);
      setShowInKanban(true);
    }
    setDialogOpen(true);
  };

  const handleSaveStatus = async () => {
    if (!statusName.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "Por favor, insira um nome para o status.",
        variant: "destructive",
      });
      return;
    }

    try {
      if (editingStatus) {
        const updateData: Record<string, unknown> = { 
          name: statusName, 
          color: statusColor,
          parent_id: parentId 
        };
        
        // Only include visibility options for parent statuses
        if (!parentId) {
          updateData.show_in_dashboard = showInDashboard;
          updateData.show_in_kanban = showInKanban;
        }

        const { error } = await supabase
          .from("task_statuses")
          .update(updateData)
          .eq("id", editingStatus.id);

        if (error) throw error;
        toast({
          title: "Status atualizado",
          description: "O status foi atualizado com sucesso.",
        });
      } else {
        const { error } = await supabase
          .from("task_statuses")
          .insert({
            name: statusName, 
            color: statusColor, 
            user_id: user?.id as string,
            parent_id: parentId,
            is_default: !parentId,
            show_in_dashboard: !parentId ? showInDashboard : true,
            show_in_kanban: !parentId ? showInKanban : true,
          });

        if (error) throw error;
        toast({
          title: "Status criado",
          description: "O status foi criado com sucesso.",
        });
      }

      setDialogOpen(false);
      fetchStatuses();
    } catch (error: any) {
      toast({
        title: "Erro ao salvar status",
        description: error.message || "Não foi possível salvar o status.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteStatus = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este status? Os status filhos também serão excluídos.")) return;

    try {
      const { error } = await supabase.from("task_statuses").delete().eq("id", id);

      if (error) throw error;
      toast({
        title: "Status excluído",
        description: "O status foi excluído com sucesso.",
      });
      fetchStatuses();
    } catch (error: any) {
      toast({
        title: "Erro ao excluir status",
        description: error.message || "Não foi possível excluir o status.",
        variant: "destructive",
      });
    }
  };

  const toggleExpand = (parentId: string) => {
    setExpandedParents(prev => {
      const newSet = new Set(prev);
      if (newSet.has(parentId)) {
        newSet.delete(parentId);
      } else {
        newSet.add(parentId);
      }
      return newSet;
    });
  };

  const parentStatuses = statuses.filter(s => !s.parent_id);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container flex h-16 items-center gap-4 px-4">
          <SidebarTrigger className="md:hidden" />
          <h1 className="text-2xl font-bold">Status de Tarefas</h1>
        </div>
      </header>

      <main className="container py-8 px-4">
        <div className="mb-6 flex gap-2 flex-wrap">
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Status Pai
          </Button>
        </div>

        <div className="space-y-4">
          {hierarchicalStatuses.map((status) => (
            <Card key={status.id} className="overflow-hidden">
              <Collapsible
                open={expandedParents.has(status.id)}
                onOpenChange={() => toggleExpand(status.id)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6">
                          {expandedParents.has(status.id) ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </Button>
                      </CollapsibleTrigger>
                      <div
                        className="w-4 h-4 rounded-full shrink-0"
                        style={{ backgroundColor: status.color || "#3b82f6" }}
                      />
                      <CardTitle className="text-lg">{status.name}</CardTitle>
                      {status.is_default && (
                        <Badge variant="secondary" className="text-xs">Padrão</Badge>
                      )}
                      {status.children && status.children.length > 0 && (
                        <Badge variant="outline" className="text-xs">
                          {status.children.length} {status.children.length === 1 ? 'filho' : 'filhos'}
                        </Badge>
                      )}
                      {status.show_in_dashboard && (
                        <Badge variant="outline" className="text-xs flex items-center gap-1">
                          <LayoutDashboard className="h-3 w-3" />
                        </Badge>
                      )}
                      {status.show_in_kanban && (
                        <Badge variant="outline" className="text-xs flex items-center gap-1">
                          <Columns3 className="h-3 w-3" />
                        </Badge>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenDialog(undefined, true, status.id);
                        }}
                        title="Adicionar status filho"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenDialog(status);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {!status.is_default && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteStatus(status.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                
                <CollapsibleContent>
                  <CardContent className="pt-0 pb-4">
                    {status.children && status.children.length > 0 ? (
                      <div className="ml-8 space-y-2">
                        {status.children.map((child) => (
                          <div
                            key={child.id}
                            className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border"
                          >
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-full shrink-0"
                                style={{ backgroundColor: child.color || "#3b82f6" }}
                              />
                              <span className="font-medium">{child.name}</span>
                            </div>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleOpenDialog(child)}
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleDeleteStatus(child.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="ml-8 text-sm text-muted-foreground">
                        Nenhum status filho. Clique em + para adicionar.
                      </p>
                    )}
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          ))}
        </div>

        {hierarchicalStatuses.length === 0 && (
          <p className="text-center text-muted-foreground mt-8">
            Nenhum status cadastrado. Clique em "Novo Status Pai" para começar.
          </p>
        )}
      </main>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingStatus ? "Editar Status" : parentId ? "Novo Status Filho" : "Novo Status Pai"}
            </DialogTitle>
            <DialogDescription>
              {parentId 
                ? "Este status será associado ao status pai selecionado."
                : "Status pai podem ter status filhos associados."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                value={statusName}
                onChange={(e) => setStatusName(e.target.value)}
                placeholder="Nome do status"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="color">Cor</Label>
              <Input
                id="color"
                type="color"
                value={statusColor}
                onChange={(e) => setStatusColor(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="parent">Status Pai (opcional)</Label>
              <Select
                value={parentId || "none"}
                onValueChange={(value) => setParentId(value === "none" ? null : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um status pai" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum (será um status pai)</SelectItem>
                  {parentStatuses
                    .filter(s => s.id !== editingStatus?.id)
                    .map((status) => (
                      <SelectItem key={status.id} value={status.id}>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: status.color || "#3b82f6" }}
                          />
                          {status.name}
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Visibility options - only for parent statuses */}
            {!parentId && (
              <div className="space-y-4 pt-2 border-t">
                <p className="text-sm font-medium text-muted-foreground">Visibilidade</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <LayoutDashboard className="h-4 w-4 text-muted-foreground" />
                    <Label htmlFor="show-dashboard" className="font-normal">
                      Mostrar na Widget do Dashboard
                    </Label>
                  </div>
                  <Switch
                    id="show-dashboard"
                    checked={showInDashboard}
                    onCheckedChange={setShowInDashboard}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Columns3 className="h-4 w-4 text-muted-foreground" />
                    <Label htmlFor="show-kanban" className="font-normal">
                      Mostrar na Visão Kanban
                    </Label>
                  </div>
                  <Switch
                    id="show-kanban"
                    checked={showInKanban}
                    onCheckedChange={setShowInKanban}
                  />
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveStatus}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}