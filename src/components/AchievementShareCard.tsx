import { useRef, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Share2 } from "lucide-react";
import { AchievementIcon } from "./AchievementIcon";
import { Achievement } from "@/hooks/useAchievements";
import { toPng } from "html-to-image";
import { toast } from "sonner";

interface AchievementShareCardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  achievement: Achievement | null;
  userName: string;
}

export const AchievementShareCard = ({
  open,
  onOpenChange,
  achievement,
  userName,
}: AchievementShareCardProps) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  if (!achievement) return null;

  const handleDownload = async () => {
    if (!cardRef.current) return;
    setDownloading(true);
    try {
      const dataUrl = await toPng(cardRef.current, {
        pixelRatio: 3,
        cacheBust: true,
      });
      const link = document.createElement("a");
      link.download = `zenit-${achievement.title.toLowerCase().replace(/\s/g, "-")}.png`;
      link.href = dataUrl;
      link.click();
      toast.success("Imagem salva!");
    } catch {
      toast.error("Erro ao gerar imagem");
    } finally {
      setDownloading(false);
    }
  };

  const handleShare = async () => {
    if (!cardRef.current) return;
    setDownloading(true);
    try {
      const dataUrl = await toPng(cardRef.current, { pixelRatio: 3, cacheBust: true });
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], "conquista-zenit.png", { type: "image/png" });
      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: achievement.title });
      } else {
        handleDownload();
      }
    } catch {
      toast.error("Erro ao compartilhar");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-4 gap-4">
        <DialogTitle className="text-center">Conquista Desbloqueada! 🎉</DialogTitle>

        {/* The shareable card */}
        <div className="flex justify-center">
          <div
            ref={cardRef}
            className="relative w-[270px] h-[480px] rounded-2xl overflow-hidden flex flex-col items-center justify-center text-center p-6"
            style={{
              background: `linear-gradient(160deg, hsl(${achievement.gradient_from}), hsl(${achievement.gradient_to}))`,
            }}
          >
            {/* Decorative circles */}
            <div className="absolute top-6 left-6 w-20 h-20 rounded-full bg-white/10" />
            <div className="absolute bottom-10 right-4 w-32 h-32 rounded-full bg-white/5" />

            {/* Content */}
            <div className="relative z-10 flex flex-col items-center gap-4">
              <div className="w-24 h-24 rounded-full bg-white/20 flex items-center justify-center shadow-lg"
                style={{ boxShadow: "0 0 40px rgba(255,255,255,0.3)" }}>
                <AchievementIcon name={achievement.icon} className="w-12 h-12 text-white" />
              </div>

              <h2 className="text-2xl font-bold text-white leading-tight">
                {achievement.title}
              </h2>

              <p className="text-white/80 text-sm leading-relaxed max-w-[200px]">
                Conquistei {achievement.required_value} dias seguidos de foco no Zenit 🏔️
              </p>

              <div className="mt-2 px-4 py-1.5 rounded-full bg-white/20 text-white text-xs font-medium">
                {userName || "Estudante Zenit"}
              </div>

              <span className="mt-4 text-white/50 text-[10px] tracking-widest uppercase">
                zenit.app
              </span>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          <Button onClick={handleShare} className="flex-1 gap-2" disabled={downloading}>
            <Share2 className="h-4 w-4" />
            Compartilhar
          </Button>
          <Button onClick={handleDownload} variant="outline" className="flex-1 gap-2" disabled={downloading}>
            <Download className="h-4 w-4" />
            Baixar Imagem
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
