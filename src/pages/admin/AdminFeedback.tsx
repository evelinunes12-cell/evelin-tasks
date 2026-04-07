import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { MessageSquarePlus, Trash2, Lightbulb, Bug, HelpCircle, MessageCircle, RefreshCw, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface FeedbackItem {
  id: string;
  user_id: string;
  type: string;
  message: string;
  created_at: string;
  user_name: string | null;
  user_email: string;
}

const typeConfig: Record<string, { label: string; icon: React.ElementType; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  suggestion: { label: "Sugestão", icon: Lightbulb, variant: "default" },
  bug: { label: "Problema", icon: Bug, variant: "destructive" },
  help: { label: "Ajuda", icon: HelpCircle, variant: "secondary" },
  other: { label: "Outro", icon: MessageCircle, variant: "outline" },
};

const AdminFeedback = () => {
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("all");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchFeedbacks = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("feedback" as any)
        .select("*")
        .order("created_at", { ascending: false });

      if (typeFilter !== "all") {
        query = query.eq("type", typeFilter);
      }

      const { data, error } = await query;
      if (error) throw error;

      const items = (data || []) as any[];
      const userIds = [...new Set(items.map((f: any) => f.user_id))];

      // Fetch profiles for names/emails
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", userIds);

      const profileMap = new Map((profiles || []).map((p) => [p.id, p]));

      const enriched: FeedbackItem[] = items.map((f: any) => {
        const profile = profileMap.get(f.user_id);
        return {
          ...f,
          user_name: profile?.full_name || null,
          user_email: profile?.email || f.user_id,
        };
      });

      setFeedbacks(enriched);
    } catch {
      toast.error("Erro ao carregar feedbacks.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedbacks();
  }, [typeFilter]);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const { error } = await supabase.from("feedback" as any).delete().eq("id", deleteId);
      if (error) throw error;
      setFeedbacks((prev) => prev.filter((f) => f.id !== deleteId));
      toast.success("Feedback removido.");
    } catch {
      toast.error("Erro ao remover feedback.");
    } finally {
      setDeleteId(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card shadow-sm px-4 sm:px-6 py-3 sm:py-4 flex items-center gap-3">
        <SidebarTrigger className="md:hidden" />
        <MessageSquarePlus className="w-5 h-5 text-primary" />
        <h1 className="text-lg sm:text-xl font-bold text-foreground">Feedbacks</h1>
        <Badge variant="secondary" className="ml-auto">{feedbacks.length}</Badge>
      </div>

      <main className="container mx-auto px-4 py-6 max-w-[1200px] space-y-6">
        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filtrar por tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              <SelectItem value="suggestion">Sugestões</SelectItem>
              <SelectItem value="bug">Problemas</SelectItem>
              <SelectItem value="help">Ajuda</SelectItem>
              <SelectItem value="other">Outros</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={fetchFeedbacks} className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Atualizar
          </Button>
        </div>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Feedbacks Recebidos</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : feedbacks.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhum feedback encontrado.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[120px]">Tipo</TableHead>
                      <TableHead className="w-[180px]">Usuário</TableHead>
                      <TableHead>Mensagem</TableHead>
                      <TableHead className="w-[140px]">Data</TableHead>
                      <TableHead className="w-[60px]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {feedbacks.map((fb) => {
                      const config = typeConfig[fb.type] || typeConfig.other;
                      const Icon = config.icon;
                      return (
                        <TableRow key={fb.id}>
                          <TableCell>
                            <Badge variant={config.variant} className="gap-1">
                              <Icon className="w-3 h-3" />
                              {config.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-0.5">
                              <p className="text-sm font-medium text-foreground truncate max-w-[160px]">
                                {fb.user_name || "Sem nome"}
                              </p>
                              <p className="text-xs text-muted-foreground truncate max-w-[160px]">
                                {fb.user_email}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <p className="text-sm text-foreground whitespace-pre-wrap break-words max-w-[400px]">
                              {fb.message}
                            </p>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">
                              {format(new Date(fb.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteId(fb.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover feedback</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover este feedback? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminFeedback;
