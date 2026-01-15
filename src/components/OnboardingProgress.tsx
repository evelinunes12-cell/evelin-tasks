import { useState, useEffect } from "react";
import { useOnboardingStatus } from "@/hooks/useOnboardingStatus";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Circle, ChevronDown, ChevronUp, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

export const OnboardingProgress = () => {
  const { data, isLoading } = useOnboardingStatus();
  const [isOpen, setIsOpen] = useState(true);
  const navigate = useNavigate();

  // Recover minimized state from localStorage
  useEffect(() => {
    const savedState = localStorage.getItem("onboarding_open");
    if (savedState !== null) {
      setIsOpen(savedState === "true");
    }
  }, []);

  const toggleOpen = () => {
    const newState = !isOpen;
    setIsOpen(newState);
    localStorage.setItem("onboarding_open", String(newState));
  };

  if (isLoading || !data) return null;

  // If completed everything and minimized, hide
  if (data.progress === 100 && !isOpen) return null;

  return (
    <Card className="mb-6 border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 flex-1">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-primary/10">
                  <Trophy className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base">
                    {data.progress === 100 ? "Você é um mestre do Zenit! 🎉" : "Primeiros Passos"}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {data.completedCount}/{data.total} concluídos
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
  );
};
