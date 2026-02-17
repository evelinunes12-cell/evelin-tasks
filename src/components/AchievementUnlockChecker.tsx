import { useEffect, useRef, useState } from "react";
import { useAchievements, Achievement } from "@/hooks/useAchievements";
import { useUserStreak } from "@/hooks/useUserStreak";
import { useAuth } from "@/hooks/useAuth";
import { AchievementShareCard } from "./AchievementShareCard";
import { supabase } from "@/integrations/supabase/client";
import { useConfetti } from "@/hooks/useConfetti";

export const AchievementUnlockChecker = () => {
  const { user } = useAuth();
  const { data: streakData } = useUserStreak();
  const { achievements, unlocked, unlock } = useAchievements();
  const { triggerConfetti } = useConfetti();
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

    // Find achievements that should be unlocked but aren't yet
    const toUnlock = achievements.filter(
      (a) => a.required_value <= currentStreak && !unlockedIds.has(a.id)
    );

    if (toUnlock.length === 0) return;

    // Unlock all eligible, show the highest one
    const unlockAll = async () => {
      for (const a of toUnlock) {
        await unlock(a.id);
      }
      // Show the highest newly unlocked
      const highest = toUnlock[toUnlock.length - 1];
      setNewlyUnlocked(highest);
      setShareOpen(true);
      triggerConfetti();
    };

    unlockAll();
  }, [user, streakData, achievements, unlocked, unlock, triggerConfetti]);

  // Reset checker when streak changes
  useEffect(() => {
    checkedRef.current = false;
  }, [streakData?.streak]);

  return (
    <AchievementShareCard
      open={shareOpen}
      onOpenChange={setShareOpen}
      achievement={newlyUnlocked}
      userName={userName}
    />
  );
};
