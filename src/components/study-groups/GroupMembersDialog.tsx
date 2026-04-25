import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Crown, UserPlus, X, Users } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { formatUsername } from "@/lib/username";
import {
  listGroupMembers, addMemberByIdentifier, removeMember,
} from "@/services/studyGroups";

interface Props {
  groupId: string;
  groupName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function GroupMembersDialog({ groupId, groupName, open, onOpenChange }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [identifier, setIdentifier] = useState("");

  const { data: members = [], isLoading } = useQuery({
    queryKey: ["study-group-members", groupId],
    queryFn: () => listGroupMembers(groupId),
    enabled: open,
  });

  const myMember = members.find((m) => m.user_id === user?.id);
  const isAdmin = myMember?.role === "admin";

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["study-group-members", groupId] });
    qc.invalidateQueries({ queryKey: ["study-groups"] });
  };

  const inviteMutation = useMutation({
    mutationFn: () => addMemberByIdentifier(groupId, identifier),
    onSuccess: () => {
      toast.success("Membro adicionado!");
      setIdentifier("");
      refresh();
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao adicionar"),
  });

  const removeMutation = useMutation({
    mutationFn: (memberId: string) => removeMember(memberId),
    onSuccess: () => {
      toast.success("Membro removido");
      refresh();
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao remover"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Membros — {groupName}
          </DialogTitle>
          <DialogDescription>
            {members.length} {members.length === 1 ? "membro" : "membros"} no grupo
          </DialogDescription>
        </DialogHeader>

        {isAdmin && (
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (identifier.trim() && !inviteMutation.isPending) inviteMutation.mutate();
            }}
          >
            <Input
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="@username ou email@exemplo.com"
            />
            <Button
              type="submit"
              size="icon"
              disabled={!identifier.trim() || inviteMutation.isPending}
              title="Adicionar membro"
            >
              <UserPlus className="h-4 w-4" />
            </Button>
          </form>
        )}

        <ScrollArea className="max-h-[60vh] pr-2">
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <div className="space-y-1">
              {members.map((m) => {
                const isMe = m.user_id === user?.id;
                const name = m.profile?.full_name || "Usuário";
                return (
                  <div
                    key={m.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/40 transition-colors"
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={m.profile?.avatar_url ?? undefined} />
                      <AvatarFallback>{name.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-medium truncate">
                          {name}
                          {isMe && (
                            <span className="text-xs text-muted-foreground ml-1">(você)</span>
                          )}
                        </p>
                        {m.role === "admin" && (
                          <Crown className="h-3.5 w-3.5 text-warning shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {formatUsername(m.profile?.username)}
                      </p>
                    </div>
                    {isAdmin && !isMe && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            title="Remover membro"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remover {name}?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Essa pessoa perderá acesso ao chat e ao ranking do grupo.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => removeMutation.mutate(m.id)}
                            >
                              Remover
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
