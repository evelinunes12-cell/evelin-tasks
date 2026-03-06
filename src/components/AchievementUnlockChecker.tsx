import { useEffect, useRef, useState } from "react";
import { useAchievements, Achievement } from "@/hooks/useAchievements";
import { useUserStreak } from "@/hooks/useUserStreak";
import { useAuth } from "@/hooks/useAuth";
import { AchievementShareCard } from "./AchievementShareCard";
import { supabase } from "@/integrations/supabase/client";
import { useConfetti } from "@/hooks/useConfetti";

const SESSION_KEY = "achievement_checked_session";

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

    // Already shown this session
    const shownRaw = sessionStorage.getItem(SESSION_KEY);
    const shownIds: string[] = shownRaw ? JSON.parse(shownRaw) : [];
    const shownSet = new Set(shownIds);

    // Find achievements that should be unlocked but aren't yet
    const toUnlock = achievements.filter(
      (a) => a.required_value <= currentStreak && !unlockedIds.has(a.id)
    );

    if (toUnlock.length === 0) return;

    const unlockAll = async () => {
      for (const a of toUnlock) {
        await unlock(a.id);
      }

      // Only show popup for ones not already shown this session
      const toShow = toUnlock.filter((a) => !shownSet.has(a.id));
      if (toShow.length > 0) {
        const highest = toShow[toShow.length - 1];
        setNewlyUnlocked(highest);
        setShareOpen(true);
        triggerConfetti();

        // Mark all as shown this session
        const updated = [...shownIds, ...toUnlock.map((a) => a.id)];
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(updated));
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
