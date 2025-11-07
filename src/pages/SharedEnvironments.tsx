import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Users, Crown } from "lucide-react";
import { toast } from "sonner";

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
      
      // Fetch environments where user is owner or member
      const { data: envData, error } = await supabase
        .from("shared_environments")
        .select(`
          id,
          environment_name,
          description,
          owner_id,
          created_at
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Get member counts for each environment
      const environmentsWithCounts = await Promise.all(
        (envData || []).map(async (env) => {
          const { count } = await supabase
            .from("environment_members")
            .select("*", { count: "exact", head: true })
            .eq("environment_id", env.id);

          return {
            ...env,
            is_owner: env.owner_id === user?.id,
            member_count: (count || 0) + 1, // +1 for owner
          };
        })
      );

      setEnvironments(environmentsWithCounts);
    } catch (error: any) {
      console.error("Error fetching environments:", error);
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
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-6 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Ambientes Compartilhados</h1>
            <p className="text-muted-foreground mt-2">
              Colabore com sua equipe em espaços de trabalho compartilhados
            </p>
          </div>
          <Button onClick={() => navigate("/environment/new")} size="lg" className="gap-2">
            <Plus className="w-5 h-5" />
            Novo Ambiente
          </Button>
        </div>

        {environments.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Users className="w-16 h-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">Nenhum ambiente encontrado</h3>
              <p className="text-muted-foreground mb-6 text-center">
                Crie seu primeiro ambiente compartilhado para começar a colaborar
              </p>
              <Button onClick={() => navigate("/environment/new")}>
                <Plus className="w-4 h-4 mr-2" />
                Criar Ambiente
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {environments.map((env) => (
              <Card
                key={env.id}
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => navigate(`/environment/${env.id}`)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-xl">{env.environment_name}</CardTitle>
                    {env.is_owner && (
                      <Badge variant="secondary" className="gap-1">
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
      </div>
    </div>
  );
};

export default SharedEnvironments;
