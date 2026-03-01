import Navbar from "@/components/Navbar";
import { FocusTimer } from "@/components/FocusTimer";
import { Flame, Target, Zap } from "lucide-react";
import PageBreadcrumb from "@/components/PageBreadcrumb";

const motivationalTips = [
  { icon: Flame, text: "Mantenha o foco por 25 minutos e descanse. Seu cérebro agradece!" },
  { icon: Target, text: "Defina uma meta clara antes de cada sessão de foco." },
  { icon: Zap, text: "Elimine distrações: silencie notificações e feche abas desnecessárias." },
];

const PomodoroPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar minimal />
      <div className="flex flex-col items-center justify-center px-4 py-12 md:py-20">
        <div className="w-full max-w-2xl mb-6">
          <PageBreadcrumb segments={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Modo Foco" },
          ]} />
        </div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Modo Foco</h1>
        <p className="text-muted-foreground mb-10 text-center max-w-md">
          Use o timer Pomodoro para manter a concentração e aumentar sua produtividade.
        </p>

        <div className="mb-12 scale-150">
          <FocusTimer />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl w-full mt-4">
          {motivationalTips.map((tip, i) => (
            <div
              key={i}
              className="flex flex-col items-center gap-3 rounded-xl border bg-card p-5 text-center shadow-sm"
            >
              <div className="p-2 rounded-lg bg-primary/10">
                <tip.icon className="h-5 w-5 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground">{tip.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PomodoroPage;
