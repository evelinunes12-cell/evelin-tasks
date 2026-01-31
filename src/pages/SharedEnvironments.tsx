import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Users, Crown } from "lucide-react";
import { toast } from "sonner";
import { logError } from "@/lib/logger";
import { SidebarTrigger } from "@/components/ui/sidebar";

interface Environment {
  id: string;
  environment_name: string;
  description: string | null;
  owner_id: string;
  created_at: string;
  is_owner: boolean;
  member_count?: number;
}

const SharedEnvironments = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchEnvironments();
    }
  }, [user]);

  const fetchEnvironments = async () => {
    try {
      setLoading(true);
      
      // 1. Busca todos os ambientes
      const { data: envData, error } = await supabase
        .from("shared_environments")
        .select("id, environment_name, description, owner_id, created_at")
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (!envData || envData.length === 0) {
        setEnvironments([]);
        return;
      }

      // 2. Extrai os IDs dos ambientes encontrados
      const envIds = envData.map(e => e.id);

      // 3. Busca membros de TODOS esses ambientes em UMA única chamada
      const { data: allMembers } = await supabase
        .from("environment_members")
        .select("environment_id")
        .in("environment_id", envIds);

      // 4. Faz a contagem na memória (Javascript) sem gastar banco de dados
      const environmentsWithCounts = envData.map((env) => {
        const count = allMembers?.filter(m => m.environment_id === env.id).length || 0;
        return {
          ...env,
          is_owner: env.owner_id === user?.id,
          member_count: count + 1, // +1 para incluir o dono
        };
      });

      setEnvironments(environmentsWithCounts);
    } catch (error) {
      logError("Error fetching environments", error);
      toast.error("Erro ao carregar ambientes");
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex-1">
      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div className="flex items-center gap-4">
            <SidebarTrigger className="md:hidden" />
            <div>
              <h1 className="text-3xl font-bold text-foreground">Grupos de Trabalho</h1>
              <p className="text-muted-foreground mt-2">
                Gerencie seus grupos de estudo e projetos em equipe
              </p>
            </div>
          </div>
          <Button onClick={() => navigate("/environment/new")} size="lg" className="gap-2">
            <Plus className="w-5 h-5" />
            Novo Grupo
          </Button>
        </div>

        {environments.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Users className="w-16 h-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">Nenhum grupo encontrado</h3>
              <p className="text-muted-foreground text-center max-w-md">
                Crie seu primeiro grupo de trabalho para começar a colaborar com sua equipe
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {environments.map((env) => (
              <Card
                key={env.id}
                className="cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02]"
                onClick={() => navigate(`/environment/${env.id}`)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-xl line-clamp-1">{env.environment_name}</CardTitle>
                    {env.is_owner && (
                      <Badge variant="secondary" className="gap-1 shrink-0">
                        <Crown className="w-3 h-3" />
                        Proprietário
                      </Badge>
                    )}
                  </div>
                  {env.description && (
                    <CardDescription className="line-clamp-2">
                      {env.description}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="w-4 h-4" />
                    <span>{env.member_count} {env.member_count === 1 ? 'membro' : 'membros'}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default SharedEnvironments;
