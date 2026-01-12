import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Bell, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
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
import { toast } from "sonner";

interface Notification {
  id: string;
  title: string;
  message: string | null;
  link: string | null;
  read: boolean;
  created_at: string;
}

export const NotificationBell = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);

  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications", user?.id],
    enabled: !!user,
    refetchInterval: 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data as Notification[];
    },
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAsReadMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("notifications").update({ read: true }).eq("id", id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("notifications").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("Notificação removida");
    },
    onError: () => {
      toast.error("Erro ao remover notificação");
    },
  });

  const deleteAllNotificationsMutation = useMutation({
    mutationFn: async () => {
      if (!user) return;
      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("Todas as notificações foram removidas");
      setIsOpen(false);
    },
    onError: () => {
      toast.error("Erro ao remover notificações");
    },
  });

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      markAsReadMutation.mutate(notification.id);
    }
    setIsOpen(false);
    if (notification.link) {
      navigate(notification.link);
    }
  };

  const handleDeleteNotification = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    deleteNotificationMutation.mutate(id);
  };

  const markAllRead = async () => {
    const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
    if (unreadIds.length === 0) return;

    await supabase
      .from("notifications")
      .update({ read: true })
      .in("id", unreadIds);
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h4 className="font-semibold">Notificações</h4>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" onClick={markAllRead}>
                Marcar lidas
              </Button>
            )}
            {notifications.length > 0 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Limpar notificações</AlertDialogTitle>
                    <AlertDialogDescription>
                      Tem certeza que deseja remover todas as notificações? Esta ação não pode ser desfeita.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => deleteAllNotificationsMutation.mutate()}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Remover todas
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>
        <ScrollArea className="h-80">
          {notifications.length === 0 ? (
            <div className="flex items-center justify-center h-20 text-muted-foreground">
              Nenhuma notificação.
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`flex items-start gap-2 p-4 hover:bg-muted/50 transition-colors ${
                    !notification.read ? "bg-muted/20" : ""
                  }`}
                >
                  <button
                    onClick={() => handleNotificationClick(notification)}
                    className="flex flex-col items-start gap-1 text-left flex-1 min-w-0"
                  >
                    <div className="flex items-center gap-2 w-full">
                      <span className="font-medium text-sm flex-1 truncate">
                        {notification.title}
                      </span>
                      {!notification.read && (
                        <div className="h-2 w-2 rounded-full bg-primary shrink-0" />
                      )}
                    </div>
                    {notification.message && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {notification.message}
                      </p>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(notification.created_at), {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                    </span>
                  </button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={(e) => handleDeleteNotification(e, notification.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};
