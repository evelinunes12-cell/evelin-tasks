import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle, X } from "lucide-react";

export function IncompleteProfileAlert() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showAlert, setShowAlert] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!user?.id) return;

    // Check if user has dismissed the alert in this session
    const dismissedKey = `incomplete-profile-dismissed-${user.id}`;
    if (sessionStorage.getItem(dismissedKey)) {
      setDismissed(true);
      return;
    }

    const checkProfile = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("education_level, city")
        .eq("id", user.id)
        .maybeSingle();

      if (error || !data) return;

      // Show alert if education_level or city is empty
      if (!data.education_level || !data.city) {
        setShowAlert(true);
      }
    };

    checkProfile();
  }, [user?.id]);

  const handleDismiss = () => {
    if (user?.id) {
      sessionStorage.setItem(`incomplete-profile-dismissed-${user.id}`, "true");
    }
    setDismissed(true);
    setShowAlert(false);
  };

  const handleGoToSettings = () => {
    navigate("/settings");
  };

  if (!showAlert || dismissed) return null;

  return (
    <Alert className="mb-4 border-primary/50 bg-primary/5">
      <AlertCircle className="h-4 w-4 text-primary" />
      <div className="flex-1">
        <AlertTitle className="text-primary">Complete seu cadastro</AlertTitle>
        <AlertDescription className="text-muted-foreground">
          Olá! Atualizamos o Zenit. Por favor, complete seu cadastro nas configurações para melhorar sua experiência.
        </AlertDescription>
        <div className="mt-3 flex gap-2">
          <Button size="sm" onClick={handleGoToSettings}>
            Ir para Configurações
          </Button>
          <Button size="sm" variant="ghost" onClick={handleDismiss}>
            Depois
          </Button>
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="absolute right-2 top-2 h-6 w-6"
        onClick={handleDismiss}
      >
        <X className="h-4 w-4" />
      </Button>
    </Alert>
  );
}
