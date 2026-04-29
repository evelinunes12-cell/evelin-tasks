import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Check, Lock, UserPlus, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  fetchAssignableMembers,
  type AssignableMember,
} from "@/services/taskAssignees";
import { logError } from "@/lib/logger";
import { cn } from "@/lib/utils";

interface TaskAssigneesManagerProps {
  environmentId: string;
  selectedUserIds: string[];
  onChange: (userIds: string[]) => void;
  disabled?: boolean;
  restrictedMode?: boolean;
}

const getInitials = (m: AssignableMember) => {
  const n = m.full_name || m.username || m.email || "?";
  return n
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
};

const getDisplayName = (m: AssignableMember) =>
  m.full_name || m.username || m.email || "Usuário";

export default function TaskAssigneesManager({
  environmentId,
  selectedUserIds,
  onChange,
  disabled = false,
  restrictedMode = false,
}: TaskAssigneesManagerProps) {
  const [members, setMembers] = useState<AssignableMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!environmentId) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const data = await fetchAssignableMembers(environmentId);
        if (!cancelled) setMembers(data);
      } catch (e) {
        logError("fetchAssignableMembers", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [environmentId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return members;
    return members.filter((m) =>
      [m.full_name, m.username, m.email]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(q))
    );
  }, [members, search]);

  const selected = useMemo(
    () => members.filter((m) => selectedUserIds.includes(m.user_id)),
    [members, selectedUserIds]
  );

  const toggle = (userId: string) => {
    if (selectedUserIds.includes(userId)) {
      onChange(selectedUserIds.filter((id) => id !== userId));
    } else {
      onChange([...selectedUserIds, userId]);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Users className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-sm font-medium">Membros vinculados</span>
          {restrictedMode && (
            <Badge variant="secondary" className="gap-1">
              <Lock className="h-3 w-3" />
              Modo restrito
            </Badge>
          )}
        </div>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Vincular
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-0" align="end">
            <div className="p-2 border-b">
              <Input
                placeholder="Buscar membro..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8"
              />
            </div>
            <ScrollArea className="max-h-64">
              {loading ? (
                <p className="text-xs text-muted-foreground p-3">Carregando...</p>
              ) : filtered.length === 0 ? (
                <p className="text-xs text-muted-foreground p-3">
                  Nenhum membro encontrado.
                </p>
              ) : (
                <ul className="py-1">
                  {filtered.map((m) => {
                    const isSelected = selectedUserIds.includes(m.user_id);
                    return (
                      <li key={m.user_id}>
                        <button
                          type="button"
                          onClick={() => toggle(m.user_id)}
                          className={cn(
                            "w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-muted text-sm",
                            isSelected && "bg-muted/60"
                          )}
                        >
                          <Avatar className="h-6 w-6 shrink-0">
                            <AvatarImage src={m.avatar_url || undefined} />
                            <AvatarFallback className="text-[10px]">
                              {getInitials(m)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="truncate">{getDisplayName(m)}</p>
                            {m.email && (
                              <p className="truncate text-[11px] text-muted-foreground">
                                {m.email}
                              </p>
                            )}
                          </div>
                          {isSelected && (
                            <Check className="h-4 w-4 text-primary shrink-0" />
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </ScrollArea>
          </PopoverContent>
        </Popover>
      </div>

      {selected.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          {restrictedMode
            ? "Apenas o proprietário e o criador verão este card até que membros sejam vinculados."
            : "Nenhum membro vinculado. Todos com permissão verão este card."}
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {selected.map((m) => (
            <Badge
              key={m.user_id}
              variant="secondary"
              className="gap-2 pl-1 pr-2 py-1"
            >
              <Avatar className="h-5 w-5">
                <AvatarImage src={m.avatar_url || undefined} />
                <AvatarFallback className="text-[9px]">
                  {getInitials(m)}
                </AvatarFallback>
              </Avatar>
              <span className="truncate max-w-[140px]">{getDisplayName(m)}</span>
              <button
                type="button"
                onClick={() => toggle(m.user_id)}
                disabled={disabled}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Remover vínculo"
              >
                ×
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
