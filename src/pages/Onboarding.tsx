import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useOnboarding } from "@/hooks/useOnboarding";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Mountain, 
  FolderKanban, 
  Users, 
  Clock, 
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Rocket,
  Timer,
  BookOpen,
} from "lucide-react";

const features = [
  {
    icon: FolderKanban,
    title: "Organize suas Tarefas",
    description: "Crie, edite e acompanhe suas tarefas com facilidade. Adicione descrições, datas de entrega, checklists e anexos para manter tudo sob controle.",
    color: "from-primary/20 to-primary/5"
  },
  {
    icon: BookOpen,
    title: "Disciplinas e Grade Horária",
    description: "Cadastre suas disciplinas e monte sua grade horária semanal para ter uma visão completa da sua rotina de estudos.",
    color: "from-emerald-500/20 to-emerald-500/5"
  },
  {
    icon: Users,
    title: "Grupos de Trabalho",
    description: "Crie grupos para colaborar com colegas, dividir tarefas e acompanhar o progresso da equipe.",
    color: "from-blue-500/20 to-blue-500/5"
  },
  {
    icon: Timer,
    title: "Ciclos de Estudo & Foco 🔥",
    description: "Monte ciclos de estudo personalizados e use o Timer Pomodoro para manter o foco. Completar ciclos aumenta sua Ofensiva diária!",
    color: "from-orange-500/20 to-orange-500/5"
  },
  {
    icon: Clock,
    title: "Planner & Anotações",
    description: "Use o Planner para criar anotações vinculadas a tarefas e disciplinas, definir metas e acompanhar seu progresso.",
    color: "from-amber-500/20 to-amber-500/5"
  },
];

const Onboarding = () => {
  const navigate = useNavigate();
  const { completeOnboarding } = useOnboarding();
  const [currentStep, setCurrentStep] = useState(0);
  const totalSteps = features.length + 1;

  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    await completeOnboarding();
    navigate("/dashboard");
  };

  const handleSkip = async () => {
    await completeOnboarding();
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-muted-foreground">
              Passo {currentStep + 1} de {totalSteps}
            </span>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleSkip}
              className="text-muted-foreground hover:text-foreground"
            >
              Pular introdução
            </Button>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-500 ease-out rounded-full"
              style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        {/* Content */}
        <Card className="border-0 shadow-2xl bg-card/80 backdrop-blur">
          <CardContent className="p-8 md:p-12">
            {currentStep === 0 ? (
              <div className="text-center space-y-6 py-8">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-primary/60 text-primary-foreground shadow-lg shadow-primary/25">
                  <Mountain className="w-10 h-10" />
                </div>
                
                <div className="space-y-3">
                  <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                    Bem-vindo(a) ao Zenit!
                  </h1>
                  <p className="text-xl text-muted-foreground max-w-lg mx-auto">
                    Para personalizarmos sua experiência, conte-nos um pouco mais sobre você.
                  </p>
                </div>

                <div className="pt-4 flex items-center justify-center gap-2 text-primary">
                  <Sparkles className="w-5 h-5 animate-pulse" />
                  <span className="font-medium">Vamos conhecer os recursos do Zenit!</span>
                </div>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-8 items-center py-4">
                <div className={`aspect-square rounded-3xl bg-gradient-to-br ${features[currentStep - 1].color} flex items-center justify-center`}>
                  {(() => {
                    const Icon = features[currentStep - 1].icon;
                    return <Icon className="w-24 h-24 text-foreground/80" strokeWidth={1.5} />;
                  })()}
                </div>
                
                <div className="space-y-4">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
                    <span>Recurso {currentStep}</span>
                  </div>
                  <h2 className="text-3xl font-bold text-foreground">
                    {features[currentStep - 1].title}
                  </h2>
                  <p className="text-lg text-muted-foreground leading-relaxed">
                    {features[currentStep - 1].description}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between items-center mt-8">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 0}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Anterior
          </Button>

          <div className="flex gap-2">
            {Array.from({ length: totalSteps }).map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentStep(index)}
                className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                  index === currentStep 
                    ? "bg-primary w-8" 
                    : index < currentStep 
                      ? "bg-primary/50" 
                      : "bg-muted-foreground/30"
                }`}
              />
            ))}
          </div>

          <Button onClick={handleNext} className="gap-2">
            {currentStep === totalSteps - 1 ? (
              <>
                Começar
                <Rocket className="w-4 h-4" />
              </>
            ) : (
              <>
                Próximo
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
