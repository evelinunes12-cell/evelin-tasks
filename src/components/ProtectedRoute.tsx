import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import LoadingOverlay from "./LoadingOverlay";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [checkingActive, setCheckingActive] = useState(true);
  const [isBlocked, setIsBlocked] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
      return;
    }

    if (!loading && user) {
      supabase
        .from("profiles")
        .select("is_active")
        .eq("id", user.id)
        .single()
        .then(({ data }) => {
          if (data && data.is_active === false) {
            setIsBlocked(true);
            signOut();
          }
          setCheckingActive(false);
        });
    }
  }, [user, loading, navigate, signOut]);

  if (loading || checkingActive) {
    return <LoadingOverlay isLoading={true} message="Verificando autenticação..." />;
  }

  if (isBlocked) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-md">
          <h1 className="text-2xl font-bold text-destructive">Conta Bloqueada</h1>
          <p className="text-muted-foreground">
            Sua conta foi desativada por um administrador. Entre em contato com o suporte para mais informações.
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
};
