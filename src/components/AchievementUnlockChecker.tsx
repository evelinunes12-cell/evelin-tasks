import { useEffect, useRef, useState } from "react";
import { useAchievements, Achievement } from "@/hooks/useAchievements";
import { useUserStreak } from "@/hooks/useUserStreak";
import { useAuth } from "@/hooks/useAuth";
import { AchievementShareCard } from "./AchievementShareCard";
import { supabase } from "@/integrations/supabase/client";
import { useConfetti } from "@/hooks/useConfetti";
import { useQueryClient } from "@tanstack/react-query";

const getStorageKey = (userId: string) => `zenit_achievement_seen_${userId}`;

export const AchievementUnlockChecker = () => {
  const { user } = useAuth();
  const { data: streakData } = useUserStreak();
  const { achievements, unlocked, unlock } = useAchievements();
  const { triggerConfetti } = useConfetti();
  const queryClient = useQueryClient();
  const [newlyUnlocked, setNewlyUnlocked] = useState<Achievement | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [userName, setUserName] = useState("");
  const checkedRef = useRef(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("username")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (data?.username) setUserName(data.username);
      });
  }, [user]);

  useEffect(() => {
    if (!user || !streakData || achievements.length === 0 || checkedRef.current) return;
    checkedRef.current = true;

    const currentStreak = streakData.streak;
    const unlockedIds = new Set(unlocked.map((u) => u.achievement_id));

    const storageKey = getStorageKey(user.id);
    const seenRaw = localStorage.getItem(storageKey);
    const seenIds: string[] = seenRaw ? JSON.parse(seenRaw) : [];
    const seenSet = new Set(seenIds);

    const toUnlock = achievements.filter(
      (a) => a.required_value <= currentStreak && !unlockedIds.has(a.id)
    );

    if (toUnlock.length === 0) return;

    const unlockAll = async () => {
      for (const a of toUnlock) {
        try {
          await unlock(a.id);
        } catch {
          // Server-side validation may reject if criteria not met
        }
      }

      const toShow = toUnlock.filter((a) => !seenSet.has(a.id));
      if (toShow.length > 0) {
        const highest = toShow[toShow.length - 1];
        setNewlyUnlocked(highest);
        setShareOpen(true);
        triggerConfetti();

        const updated = [...seenIds, ...toUnlock.map((a) => a.id)];
        localStorage.setItem(storageKey, JSON.stringify(updated));
      }
    };

    unlockAll();
  }, [user, streakData, achievements, unlocked, unlock, triggerConfetti]);

  return (
    <AchievementShareCard
      open={shareOpen}
      onOpenChange={setShareOpen}
      achievement={newlyUnlocked}
      userName={userName}
    />
  );
};
