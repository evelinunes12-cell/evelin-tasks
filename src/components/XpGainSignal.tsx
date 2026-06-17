import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";

/**
 * Escuta o evento global "xp-gained" e exibe uma sinalização rápida e simples
 * de que o usuário ganhou XP. O toast é clicável e leva direto ao ranking.
 * Não informa a quantidade de XP — apenas que houve ganho.
 */
const XpGainSignal = () => {
  const navigate = useNavigate();
  const cooldownRef = useRef(false);

  useEffect(() => {
    const handleXpGained = () => {
      // Debounce: evita spam quando vários ganhos acontecem em sequência
      if (cooldownRef.current) return;
      cooldownRef.current = true;
      setTimeout(() => {
        cooldownRef.current = false;
      }, 2500);

      toast.success("XP ganho!", {
        id: "xp-gained",
        icon: <Sparkles className="h-4 w-4 text-warning" />,
        description: "Toque para ver o ranking",
        duration: 2500,
        action: {
          label: "Ranking",
          onClick: () => navigate("/ranking"),
        },
      });
    };

    window.addEventListener("xp-gained", handleXpGained);
    return () => window.removeEventListener("xp-gained", handleXpGained);
  }, [navigate]);

  return null;
};

export default XpGainSignal;
