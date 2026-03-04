import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Navbar from "@/components/Navbar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Crown, Sparkles } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface LeaderboardEntry {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  total_xp: number;
}

const fetchLeaderboard = async (period: string): Promise<LeaderboardEntry[]> => {
  const { data, error } = await supabase.rpc("get_leaderboard", {
    period_type: period,
  } as any);
  if (error) throw error;
  return (data as any) || [];
};

function getInitials(name: string | null) {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

const podiumStyles = [
  {
    border: "border-yellow-400",
    bg: "bg-gradient-to-br from-yellow-400/10 to-yellow-500/5",
    shadow: "shadow-yellow-400/20 shadow-lg",
    badge: "bg-yellow-400 text-yellow-950",
    icon: Crown,
    size: "h-20 w-20",
    ring: "ring-4 ring-yellow-400/50",
  },
  {
    border: "border-gray-300",
    bg: "bg-gradient-to-br from-gray-200/20 to-gray-300/10",
    shadow: "shadow-gray-300/20 shadow-md",
    badge: "bg-gray-300 text-gray-800",
    icon: Medal,
    size: "h-16 w-16",
    ring: "ring-4 ring-gray-300/50",
  },
  {
    border: "border-amber-600",
    bg: "bg-gradient-to-br from-amber-600/10 to-amber-700/5",
    shadow: "shadow-amber-600/20 shadow-md",
    badge: "bg-amber-600 text-white",
    icon: Medal,
    size: "h-16 w-16",
    ring: "ring-4 ring-amber-600/50",
  },
];

function PodiumCard({
  entry,
  rank,
  isCurrentUser,
}: {
  entry: LeaderboardEntry;
  rank: number;
  isCurrentUser: boolean;
}) {
  const style = podiumStyles[rank];
  const Icon = style.icon;

  return (
    <Card
      className={cn(
        "flex flex-col items-center p-4 sm:p-6 border-2 transition-all duration-300",
        style.border,
        style.bg,
        style.shadow,
        isCurrentUser && "ring-2 ring-primary",
        rank === 0 ? "order-2 scale-105 sm:scale-110" : rank === 1 ? "order-1" : "order-3"
      )}
    >
      <div className="relative mb-3">
        <Avatar className={cn(style.size, style.ring)}>
          <AvatarImage src={entry.avatar_url || undefined} />
          <AvatarFallback className="text-lg font-bold">
            {getInitials(entry.full_name)}
          </AvatarFallback>
        </Avatar>
        <div
          className={cn(
            "absolute -top-2 -right-2 rounded-full p-1",
            style.badge
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
      </div>

      <p className="font-semibold text-sm text-center line-clamp-1">
        {entry.full_name || "Anônimo"}
      </p>
      {isCurrentUser && (
        <Badge variant="secondary" className="text-[10px] mt-1">
          Você
        </Badge>
      )}

      <div className="mt-2 flex items-center gap-1">
        <Sparkles className="h-4 w-4 text-primary" />
        <span className="font-bold text-lg text-primary">
          {entry.total_xp.toLocaleString("pt-BR")}
        </span>
        <span className="text-xs text-muted-foreground">XP</span>
      </div>
    </Card>
  );
}

function ListItem({
  entry,
  rank,
  isCurrentUser,
}: {
  entry: LeaderboardEntry;
  rank: number;
  isCurrentUser: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 sm:gap-4 px-3 sm:px-4 py-3 rounded-lg transition-colors",
        isCurrentUser
          ? "bg-primary/10 border border-primary/30"
          : "hover:bg-muted/50"
      )}
    >
      <span className="w-8 text-center font-bold text-muted-foreground">
        {rank}º
      </span>
      <Avatar className="h-9 w-9">
        <AvatarImage src={entry.avatar_url || undefined} />
        <AvatarFallback className="text-xs">
          {getInitials(entry.full_name)}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">
          {entry.full_name || "Anônimo"}
          {isCurrentUser && (
            <Badge variant="secondary" className="text-[10px] ml-2">
              Você
            </Badge>
          )}
        </p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <Sparkles className="h-3.5 w-3.5 text-primary" />
        <span className="font-bold text-sm text-primary">
          {entry.total_xp.toLocaleString("pt-BR")}
        </span>
      </div>
    </div>
  );
}

function RankingContent() {
  const { user } = useAuth();
  const [period, setPeriod] = useState<string>("weekly");

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["leaderboard", period],
    queryFn: () => fetchLeaderboard(period),
    staleTime: 60_000,
  });

  const top3 = entries.slice(0, 3);
  const rest = entries.slice(3, 20);

  return (
    <>
      <Navbar />
      <div className="container max-w-2xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Trophy className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">Ranking de XP</h1>
          </div>
          <Tabs value={period} onValueChange={setPeriod}>
            <TabsList>
              <TabsTrigger value="weekly">Semanal</TabsTrigger>
              <TabsTrigger value="monthly">Mensal</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-48 rounded-lg" />
              ))}
            </div>
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-14 rounded-lg" />
            ))}
          </div>
        )}

        {/* Empty */}
        {!isLoading && entries.length === 0 && (
          <Card className="p-10 text-center">
            <Trophy className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground font-medium">
              Nenhum XP registrado neste período.
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Complete tarefas, Pomodoros e metas para aparecer no ranking!
            </p>
          </Card>
        )}

        {/* Podium */}
        {!isLoading && top3.length > 0 && (
          <div className="grid grid-cols-3 gap-2 sm:gap-4 items-end">
            {top3.map((entry, i) => (
              <PodiumCard
                key={entry.user_id}
                entry={entry}
                rank={i}
                isCurrentUser={entry.user_id === user?.id}
              />
            ))}
          </div>
        )}

        {/* List */}
        {!isLoading && rest.length > 0 && (
          <Card className="divide-y divide-border overflow-hidden">
            {rest.map((entry, i) => (
              <ListItem
                key={entry.user_id}
                entry={entry}
                rank={i + 4}
                isCurrentUser={entry.user_id === user?.id}
              />
            ))}
          </Card>
        )}
      </div>
    </>
  );
}

export default function RankingPage() {
  return (
    <ProtectedRoute>
      <RankingContent />
    </ProtectedRoute>
  );
}
