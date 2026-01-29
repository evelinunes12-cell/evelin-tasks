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
  const [termsAccepted, setTermsAccepted] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    const checkProfile = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("education_level, city, terms_accepted")
        .eq("id", user.id)
        .maybeSingle();

      if (error || !data) return;

      setTermsAccepted(data.terms_accepted);

      // Show alert if education_level or city is empty OR if terms not accepted
      if (!data.education_level || !data.city || !data.terms_accepted) {
        setShowAlert(true);
        
        // Only restore dismissed state from sessionStorage if terms ARE accepted
        // If terms are not accepted, alert must always show
        if (data.terms_accepted) {
          const dismissedKey = `incomplete-profile-dismissed-${user.id}`;
          if (sessionStorage.getItem(dismissedKey)) {
            setDismissed(true);
          }
        }
      }
    };

    checkProfile();
  }, [user?.id]);

  const handleDismiss = () => {
    // Only allow permanent dismiss if terms are accepted
    if (termsAccepted && user?.id) {
      sessionStorage.setItem(`incomplete-profile-dismissed-${user.id}`, "true");
    }
    setDismissed(true);
    setShowAlert(false);
  };

  const handleGoToSettings = () => {
    navigate("/settings");
  };

  // If terms are not accepted, always show the alert (ignore dismissed state)
  if (!showAlert) return null;
  if (dismissed && termsAccepted) return null;

  return (
    <Alert className="mb-4 border-primary/50 bg-primary/5">
      <AlertCircle className="h-4 w-4 text-primary" />
      <div className="flex-1">
        <AlertTitle className="text-primary">
          {!termsAccepted ? "Aceite os Termos de Uso" : "Complete seu cadastro"}
        </AlertTitle>
        <AlertDescription className="text-muted-foreground">
          {!termsAccepted 
            ? "Para continuar usando o Zenit, você precisa aceitar os Termos de Uso nas configurações."
            : "Olá! Atualizamos o Zenit. Por favor, complete seu cadastro nas configurações para melhorar sua experiência."
          }
        </AlertDescription>
        <div className="mt-3 flex gap-2">
          <Button size="sm" onClick={handleGoToSettings}>
            Ir para Configurações
          </Button>
          {termsAccepted && (
            <Button size="sm" variant="ghost" onClick={handleDismiss}>
              Depois
            </Button>
          )}
        </div>
      </div>
      {termsAccepted && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-2 top-2 h-6 w-6"
          onClick={handleDismiss}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </Alert>
  );
}
