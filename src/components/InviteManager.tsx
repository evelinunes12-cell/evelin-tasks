import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  createGroupInvite,
  fetchEnvironmentInvites,
  revokeInvite,
  deleteInvite,
  buildInviteLink,
  type Invite,
} from "@/services/invites";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Link2, Copy, Check, Trash2, Ban, Plus, Clock, Users, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { logError } from "@/lib/logger";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface InviteManagerProps {
  environmentId: string;
  isOwner: boolean;
}

const InviteManager = ({ environmentId, isOwner }: InviteManagerProps) => {
  const { user } = useAuth();
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  // Create form state
  const [isUnlimited, setIsUnlimited] = useState(true);
  const [maxUses, setMaxUses] = useState(1);
  const [expiresInDays, setExpiresInDays] = useState(7);

  useEffect(() => {
    if (isOwner) {
      loadInvites();
    }
  }, [environmentId, isOwner]);

  const loadInvites = async () => {
    try {
      setLoading(true);
      const data = await fetchEnvironmentInvites(environmentId);
      setInvites(data);
    } catch (error) {
      logError("Error loading invites", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateInvite = async () => {
    if (!user) return;

    try {
      setCreating(true);
      const invite = await createGroupInvite(environmentId, user.id, {
        maxUses: isUnlimited ? 0 : maxUses,
        expiresInDays,
      });

      setInvites((prev) => [invite, ...prev]);
      setShowCreateDialog(false);
      toast.success("Link de convite criado!");

      // Auto-copy the link
      const link = buildInviteLink(invite.token);
      await navigator.clipboard.writeText(link);
      setCopiedId(invite.id);
      setTimeout(() => setCopiedId(null), 2000);
      toast.success("Link copiado para a área de transferência!");
    } catch (error) {
      logError("Error creating invite", error);
      toast.error("Erro ao criar convite");
    } finally {
      setCreating(false);
    }
  };

  const handleCopyLink = async (invite: Invite) => {
    try {
      const link = buildInviteLink(invite.token);
      await navigator.clipboard.writeText(link);
      setCopiedId(invite.id);
      setTimeout(() => setCopiedId(null), 2000);
      toast.success("Link copiado!");
    } catch {
      toast.error("Erro ao copiar link");
    }
  };

  const handleRevokeInvite = async (inviteId: string) => {
    try {
      await revokeInvite(inviteId);
      setInvites((prev) =>
        prev.map((inv) => (inv.id === inviteId ? { ...inv, revoked: true } : inv))
      );
      toast.success("Convite revogado!");
    } catch (error) {
      logError("Error revoking invite", error);
      toast.error("Erro ao revogar convite");
    }
  };

  const handleDeleteInvite = async (inviteId: string) => {
    try {
      await deleteInvite(inviteId);
      setInvites((prev) => prev.filter((inv) => inv.id !== inviteId));
      toast.success("Convite excluído!");
    } catch (error) {
      logError("Error deleting invite", error);
      toast.error("Erro ao excluir convite");
    }
  };

  const getInviteStatus = (invite: Invite) => {
    if (invite.revoked) return { label: "Revogado", variant: "destructive" as const };
    if (new Date(invite.expires_at) < new Date()) return { label: "Expirado", variant: "secondary" as const };
    if (invite.max_uses > 0 && invite.uses_count >= invite.max_uses)
      return { label: "Esgotado", variant: "secondary" as const };
    return { label: "Ativo", variant: "default" as const };
  };

  const isInviteActive = (invite: Invite) => {
    const status = getInviteStatus(invite);
    return status.label === "Ativo";
  };

  if (!isOwner) return null;

  const activeInvites = invites.filter(isInviteActive);
  const inactiveInvites = invites.filter((inv) => !isInviteActive(inv));

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Link2 className="w-5 h-5" />
          Links de Convite
        </h3>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="w-4 h-4" />
              Gerar Link
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Gerar Link de Convite</DialogTitle>
              <DialogDescription>
                Crie um link para convidar pessoas para este grupo.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Uso ilimitado</Label>
                  <p className="text-xs text-muted-foreground">
                    Permitir que múltiplas pessoas usem o mesmo link
                  </p>
                </div>
                <Switch checked={isUnlimited} onCheckedChange={setIsUnlimited} />
              </div>

              {!isUnlimited && (
                <div className="space-y-2">
                  <Label htmlFor="maxUses">Número máximo de usos</Label>
                  <Input
                    id="maxUses"
                    type="number"
                    min={1}
                    max={100}
                    value={maxUses}
                    onChange={(e) => setMaxUses(Math.max(1, parseInt(e.target.value) || 1))}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="expiresIn">Expira em (dias)</Label>
                <Input
                  id="expiresIn"
                  type="number"
                  min={1}
                  max={90}
                  value={expiresInDays}
                  onChange={(e) => setExpiresInDays(Math.max(1, Math.min(90, parseInt(e.target.value) || 7)))}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreateInvite} disabled={creating}>
                {creating ? "Gerando..." : "Gerar e Copiar Link"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando convites...</p>
      ) : invites.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <Link2 className="w-10 h-10 text-muted-foreground mb-3" />
            <p className="text-muted-foreground text-sm text-center">
              Nenhum link de convite criado.
              <br />
              Gere um link para convidar pessoas ao grupo.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {/* Active invites */}
          {activeInvites.map((invite) => (
            <InviteCard
              key={invite.id}
              invite={invite}
              copiedId={copiedId}
              onCopy={handleCopyLink}
              onRevoke={handleRevokeInvite}
              onDelete={handleDeleteInvite}
            />
          ))}

          {/* Inactive invites (collapsed) */}
          {inactiveInvites.length > 0 && (
            <details className="group">
              <summary className="text-sm text-muted-foreground cursor-pointer hover:text-foreground transition-colors py-2">
                {inactiveInvites.length} convite{inactiveInvites.length !== 1 ? "s" : ""} inativo{inactiveInvites.length !== 1 ? "s" : ""}
              </summary>
              <div className="space-y-3 mt-2">
                {inactiveInvites.map((invite) => (
                  <InviteCard
                    key={invite.id}
                    invite={invite}
                    copiedId={copiedId}
                    onCopy={handleCopyLink}
                    onRevoke={handleRevokeInvite}
                    onDelete={handleDeleteInvite}
                  />
                ))}
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  );
};

interface InviteCardProps {
  invite: Invite;
  copiedId: string | null;
  onCopy: (invite: Invite) => void;
  onRevoke: (id: string) => void;
  onDelete: (id: string) => void;
}

const InviteCard = ({ invite, copiedId, onCopy, onRevoke, onDelete }: InviteCardProps) => {
  const status = getStatusInfo(invite);
  const isActive = status.label === "Ativo";

  return (
    <Card className={!isActive ? "opacity-60" : ""}>
      <CardHeader className="py-3 px-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <Link2 className="w-4 h-4 text-muted-foreground shrink-0" />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-mono text-muted-foreground truncate">
                  ...{invite.token.slice(-8)}
                </span>
                <Badge variant={status.variant}>{status.label}</Badge>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {format(new Date(invite.expires_at), "dd/MM/yyyy", { locale: ptBR })}
                </span>
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {invite.uses_count}{invite.max_uses > 0 ? `/${invite.max_uses}` : "/∞"} usos
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {isActive && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onCopy(invite)}
                className="gap-1"
              >
                {copiedId === invite.id ? (
                  <Check className="w-4 h-4 text-primary" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            )}

            {isActive && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <Ban className="w-4 h-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Revogar convite</AlertDialogTitle>
                    <AlertDialogDescription>
                      Ao revogar, ninguém mais poderá usar este link. Esta ação não pode ser desfeita.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={() => onRevoke(invite.id)}>
                      Revogar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir convite</AlertDialogTitle>
                  <AlertDialogDescription>
                    Tem certeza que deseja excluir este convite permanentemente?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={() => onDelete(invite.id)}>
                    Excluir
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardHeader>
    </Card>
  );
};

function getStatusInfo(invite: Invite) {
  if (invite.revoked) return { label: "Revogado", variant: "destructive" as const };
  if (new Date(invite.expires_at) < new Date()) return { label: "Expirado", variant: "secondary" as const };
  if (invite.max_uses > 0 && invite.uses_count >= invite.max_uses)
    return { label: "Esgotado", variant: "secondary" as const };
  return { label: "Ativo", variant: "default" as const };
}

export default InviteManager;
