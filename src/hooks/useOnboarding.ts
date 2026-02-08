import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./useAuth";
import { supabase } from "@/integrations/supabase/client";

const CACHE_KEY = "zenit_onboarding_completed";

export const useOnboarding = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [isOnboardingCompleted, setIsOnboardingCompleted] = useState<boolean | null>(null);
  const [shouldRedirect, setShouldRedirect] = useState(false);

  // Load from cache first, then sync with DB
  useEffect(() => {
    if (loading) return;
    if (!user) {
      setIsOnboardingCompleted(null);
      return;
    }

    // Read cache immediately for fast UX
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached === "true") {
      setIsOnboardingCompleted(true);
    }

    // Then fetch from DB as source of truth
    const fetchFromDb = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("onboarding_completed")
        .eq("id", user.id)
        .maybeSingle();

      if (error || !data) return;

      const dbValue = data.onboarding_completed ?? false;
      setIsOnboardingCompleted(dbValue);

      // Sync cache with DB
      if (dbValue) {
        localStorage.setItem(CACHE_KEY, "true");
      } else {
        localStorage.removeItem(CACHE_KEY);
        setShouldRedirect(true);
      }
    };

    fetchFromDb();
  }, [user, loading]);

  // Handle redirect
  useEffect(() => {
    if (shouldRedirect && isOnboardingCompleted === false) {
      navigate("/onboarding");
    }
  }, [shouldRedirect, isOnboardingCompleted, navigate]);

  const completeOnboarding = useCallback(async () => {
    // Update cache immediately for instant feedback
    localStorage.setItem(CACHE_KEY, "true");
    setIsOnboardingCompleted(true);

    // Persist to DB
    if (user) {
      await supabase
        .from("profiles")
        .update({ onboarding_completed: true })
        .eq("id", user.id);
    }
  }, [user]);

  const resetOnboarding = useCallback(async () => {
    localStorage.removeItem(CACHE_KEY);
    setIsOnboardingCompleted(false);

    if (user) {
      await supabase
        .from("profiles")
        .update({ onboarding_completed: false })
        .eq("id", user.id);
    }
  }, [user]);

  return {
    isOnboardingCompleted: isOnboardingCompleted === true,
    resetOnboarding,
    completeOnboarding,
  };
};
