import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AchievementIcon } from "./AchievementIcon";
import { AchievementShareCard } from "./AchievementShareCard";
import { useAchievements, Achievement } from "@/hooks/useAchievements";
import { useAuth } from "@/hooks/useAuth";
import { useUserStreak } from "@/hooks/useUserStreak";
import { cn } from "@/lib/utils";
import { Trophy } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface AchievementsListProps {
  userName: string;
}

export const AchievementsList = ({ userName }: AchievementsListProps) => {
  const { achievements, unlocked, isLoading } = useAchievements();
  const { data: streakData } = useUserStreak();
  const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null);
  const [shareOpen, setShareOpen] = useState(false);

  const unlockedIds = new Set(unlocked.map((u) => u.achievement_id));

  const handleClick = (achievement: Achievement) => {
    if (unlockedIds.has(achievement.id)) {
      setSelectedAchievement(achievement);
      setShareOpen(true);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Trophy className="h-5 w-5" /> Conquistas</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-3 gap-4">
          {Array.from({ length: 9 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            Conquistas
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {unlockedIds.size} de {achievements.length} desbloqueadas
            {streakData && ` · Sequência atual: ${streakData.streak} dias`}
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-9 gap-3">
            {achievements.map((a) => {
              const isUnlocked = unlockedIds.has(a.id);
              return (
                <button
                  key={a.id}
                  onClick={() => handleClick(a)}
                  disabled={!isUnlocked}
                  className={cn(
                    "flex flex-col items-center gap-2 p-3 rounded-xl border transition-all text-center",
                    isUnlocked
                      ? "cursor-pointer hover:scale-105 hover:shadow-md border-primary/30"
                      : "opacity-40 grayscale cursor-default border-border"
                  )}
                  style={
                    isUnlocked
                      ? {
                          background: `linear-gradient(160deg, hsl(${a.gradient_from} / 0.15), hsl(${a.gradient_to} / 0.10))`,
                        }
                      : undefined
                  }
                >
                  <div
                    className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center",
                      isUnlocked ? "bg-primary/20" : "bg-muted"
                    )}
                  >
                    <AchievementIcon
                      name={a.icon}
                      className={cn("w-5 h-5", isUnlocked ? "text-primary" : "text-muted-foreground")}
                    />
                  </div>
                  <span className="text-xs font-medium leading-tight">{a.title}</span>
                  <span className="text-[10px] text-muted-foreground">{a.required_value} dias</span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <AchievementShareCard
        open={shareOpen}
        onOpenChange={setShareOpen}
        achievement={selectedAchievement}
        userName={userName}
      />
    </>
  );
};
