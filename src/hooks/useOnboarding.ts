import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./useAuth";

export const useOnboarding = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [shouldRedirect, setShouldRedirect] = useState(false);

  useEffect(() => {
    if (loading) return;

    if (user) {
      const onboardingCompleted = localStorage.getItem("zenit_onboarding_completed");
      if (!onboardingCompleted) {
        setShouldRedirect(true);
      }
    }
  }, [user, loading]);

  useEffect(() => {
    if (shouldRedirect) {
      navigate("/onboarding");
    }
  }, [shouldRedirect, navigate]);

  const resetOnboarding = () => {
    localStorage.removeItem("zenit_onboarding_completed");
  };

  const completeOnboarding = () => {
    localStorage.setItem("zenit_onboarding_completed", "true");
  };

  return {
    isOnboardingCompleted: localStorage.getItem("zenit_onboarding_completed") === "true",
    resetOnboarding,
    completeOnboarding
  };
};
