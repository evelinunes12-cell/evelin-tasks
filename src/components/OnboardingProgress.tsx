import { useState, useEffect, useRef } from "react";
import { useOnboardingStatus } from "@/hooks/useOnboardingStatus";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Circle, ChevronDown, ChevronUp, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useConfetti } from "@/hooks/useConfetti";
import { useAchievements } from "@/hooks/useAchievements";
import { useAuth } from "@/hooks/useAuth";
import { AchievementShareCard } from "./AchievementShareCard";
import { supabase } from "@/integrations/supabase/client";

const PIONEIRO_TITLE = "Pioneiro";

export const OnboardingProgress = () => {
  const { data, isLoading } = useOnboardingStatus();
  const [isOpen, setIsOpen] = useState(true);
  const navigate = useNavigate();
  const { triggerConfetti } = useConfetti();
  const { achievements, unlocked, unlock } = useAchievements();
  const { user } = useAuth();
  const hasTriggeredReward = useRef(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [userName, setUserName] = useState("");
  const [pioneiroAchievement, setPioneiroAchievement] = useState<typeof achievements[0] | null>(null);

  useEffect(() => {
    const savedState = localStorage.getItem("onboarding_open");
    if (savedState !== null) {
      setIsOpen(savedState === "true");
    }
  }, []);

  // Unlock Pioneiro badge + confetti when all steps completed
  useEffect(() => {
    if (
      !data || data.progress !== 100 ||
      hasTriggeredReward.current ||
      !achievements.length ||
      !user
    ) return;

    hasTriggeredReward.current = true;

    const pioneiro = achievements.find(a => a.title === PIONEIRO_TITLE);
    const alreadyUnlocked = pioneiro && unlocked.some(u => u.achievement_id === pioneiro.id);

    const doReward = async () => {
      // Always mark onboarding as completed in DB (persistent)
      await supabase
        .from("profiles")
        .update({ onboarding_completed: true })
        .eq("id", user.id);

      // Unlock Pioneiro if not already unlocked
      if (pioneiro && !alreadyUnlocked) {
        await unlock(pioneiro.id);
      }

      // Get user name for share card
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .maybeSingle();
      setUserName(profile?.full_name || "Estudante");

      localStorage.setItem("quick_start_celebrated", "true");
      triggerConfetti();

      if (pioneiro) {
        setPioneiroAchievement(pioneiro);
        setShareOpen(true);
      }
    };

    doReward();
  }, [data?.progress, achievements, unlocked, unlock, user, triggerConfetti]);

  const toggleOpen = () => {
    const newState = !isOpen;
    setIsOpen(newState);
    localStorage.setItem("onboarding_open", String(newState));
  };

  if (isLoading || !data) return null;

  // If user already completed the guide once, never show it again
  const alreadyCelebrated = localStorage.getItem("quick_start_celebrated");
  if (alreadyCelebrated) return null;

  // If completed everything and minimized, hide
  if (data.progress === 100 && !isOpen) return null;

  return (
    <>
      <Card className="mb-6 border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CardHeader className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 flex-1">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-primary/10">
                    <Rocket className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base">
                      {data.progress === 100 ? "Você completou o Guia! 🎉" : "Guia de Início Rápido"}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {data.completedCount}/{data.total} missões concluídas
                    </p>
                  </div>
                </div>
                <Progress value={data.progress} className="flex-1 max-w-xs hidden sm:block" />
              </div>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" onClick={toggleOpen}>
                  {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
            </div>
            <Progress value={data.progress} className="mt-2 sm:hidden" />
          </CardHeader>

          <CollapsibleContent>
            <CardContent className="pt-0 pb-4">
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {data.steps.map((step) => (
                  <div
                    key={step.id}
                    onClick={() => !step.completed && navigate(step.link)}
                    className={cn(
                      "flex items-center gap-2 p-3 rounded-lg text-sm transition-colors",
                      step.completed
                        ? "text-muted-foreground bg-muted/50 cursor-default"
                        : "text-foreground hover:bg-background cursor-pointer border border-transparent hover:border-border"
                    )}
                  >
                    {step.completed ? (
                      <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
                    ) : (
                      <Circle className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    )}
                    <span className={step.completed ? "line-through" : ""}>
                      {step.label}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      <AchievementShareCard
        open={shareOpen}
        onOpenChange={setShareOpen}
        achievement={pioneiroAchievement}
        userName={userName}
      />
    </>
  );
};
