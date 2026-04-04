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

  // Fetch user name once
  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (data?.full_name) setUserName(data.full_name);
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

    // Find achievements that should be unlocked but aren't yet
    const toUnlock = achievements.filter(
      (a) => a.required_value <= currentStreak && !unlockedIds.has(a.id)
    );

    if (toUnlock.length === 0) return;

    const unlockAll = async () => {
      for (const a of toUnlock) {
        await unlock(a.id);
      }

      // Only show popup for ones never seen before
      const toShow = toUnlock.filter((a) => !seenSet.has(a.id));
      if (toShow.length > 0) {
        const highest = toShow[toShow.length - 1];
        setNewlyUnlocked(highest);
        setShareOpen(true);
        triggerConfetti();

        // Persist as seen permanently
        const updated = [...seenIds, ...toUnlock.map((a) => a.id)];
        localStorage.setItem(storageKey, JSON.stringify(updated));
      }
    };

    unlockAll();
  }, [user, streakData, achievements, unlocked, unlock, triggerConfetti]);

  useEffect(() => {
    if (!user || !streakData || achievements.length === 0 || unlocked.length === 0) return;

    const currentStreak = streakData.streak;
    const unlockedIds = new Set(unlocked.map((u) => u.achievement_id));
    const shouldRemoveIds = achievements
      .filter(
        (achievement) =>
          achievement.title !== "Pioneiro" &&
          achievement.required_value > currentStreak &&
          unlockedIds.has(achievement.id)
      )
      .map((achievement) => achievement.id);

    if (shouldRemoveIds.length === 0) return;

    supabase
      .from("user_achievements")
      .delete()
      .eq("user_id", user.id)
      .in("achievement_id", shouldRemoveIds)
      .then(({ error }) => {
        if (!error) {
          queryClient.invalidateQueries({ queryKey: ["user-achievements"] });
          const storageKey = getStorageKey(user.id);
          const seenRaw = localStorage.getItem(storageKey);
          const seenIds: string[] = seenRaw ? JSON.parse(seenRaw) : [];
          const filtered = seenIds.filter((id) => !shouldRemoveIds.includes(id));
          localStorage.setItem(storageKey, JSON.stringify(filtered));
        }
      });
  }, [user, streakData, achievements, unlocked, queryClient]);

  return (
    <AchievementShareCard
      open={shareOpen}
      onOpenChange={setShareOpen}
      achievement={newlyUnlocked}
      userName={userName}
    />
  );
};
