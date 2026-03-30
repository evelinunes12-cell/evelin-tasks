import { Zap, Brain } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";

type CycleMode = "simple" | "advanced";

interface StudyCycleModeSelectorProps {
  onSelect: (mode: CycleMode) => void;
}

const modes = [
  {
    key: "simple" as CycleMode,
    icon: Zap,
    title: "Ciclo Simples",
    description: "Criação manual rápida. Escolhe as disciplinas e o tempo de cada uma.",
    gradient: "from-primary/10 to-primary/5",
    iconColor: "text-primary",
  },
  {
    key: "advanced" as CycleMode,
    icon: Brain,
    title: "Ciclo Avançado (Inteligente)",
    description: "O Zenit calcula o ciclo ideal com base na tua carga horária e pesos das disciplinas.",
    gradient: "from-accent/20 to-accent/5",
    iconColor: "text-accent-foreground",
  },
];

const StudyCycleModeSelector = ({ onSelect }: StudyCycleModeSelectorProps) => {
  return (
    <div className="grid gap-4 py-4">
      {modes.map((mode, i) => (
        <motion.div
          key={mode.key}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1, duration: 0.3 }}
        >
          <Card
            className={`cursor-pointer border-2 border-transparent hover:border-primary/40 transition-all duration-200 bg-gradient-to-br ${mode.gradient}`}
            onClick={() => onSelect(mode.key)}
          >
            <CardContent className="flex items-start gap-4 p-5">
              <div className={`rounded-xl bg-background p-3 shadow-sm ${mode.iconColor}`}>
                <mode.icon className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h3 className="font-semibold text-foreground">{mode.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{mode.description}</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
};

export default StudyCycleModeSelector;
