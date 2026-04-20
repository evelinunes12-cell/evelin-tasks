import { useEffect, useRef, useState, useMemo, memo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { listMessages, sendMessage, type StudyGroupMessage, type StudyGroupMember } from "@/services/studyGroups";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Send } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { formatUsername } from "@/lib/username";

interface Props {
  groupId: string;
  members: StudyGroupMember[];
}

const MessageBubble = memo(function MessageBubble({
  msg,
  isMe,
  member,
}: {
  msg: StudyGroupMessage;
  isMe: boolean;
  member?: StudyGroupMember;
}) {
  const name = member?.profile?.full_name || "Usuário";
  const username = formatUsername(member?.profile?.username);
  return (
    <div className={cn("flex gap-2", isMe ? "flex-row-reverse" : "flex-row")}>
      {!isMe && (
        <Avatar className="h-8 w-8 mt-1 shrink-0">
          <AvatarImage src={member?.profile?.avatar_url ?? undefined} />
          <AvatarFallback>{name.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
      )}
      <div className={cn("max-w-[75%] flex flex-col", isMe ? "items-end" : "items-start")}>
        {!isMe && (
          <span className="text-xs text-muted-foreground mb-0.5 px-1">{username}</span>
        )}
        <div
          className={cn(
            "rounded-2xl px-3 py-2 text-sm break-words",
            isMe
              ? "bg-primary text-primary-foreground rounded-br-sm"
              : "bg-muted text-foreground rounded-bl-sm"
          )}
        >
          {msg.content}
        </div>
        <span className="text-[10px] text-muted-foreground mt-0.5 px-1">
          {new Date(msg.created_at).toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </div>
    </div>
  );
});

export default function StudyGroupChat({ groupId, members }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: messages, isLoading } = useQuery({
    queryKey: ["study-group-messages", groupId],
    queryFn: () => listMessages(groupId),
  });

  const memberMap = useMemo(() => {
    const m = new Map<string, StudyGroupMember>();
    members.forEach((mem) => m.set(mem.user_id, mem));
    return m;
  }, [members]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`study-group-messages-${groupId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "study_group_messages", filter: `group_id=eq.${groupId}` },
        (payload) => {
          const newMsg = payload.new as StudyGroupMessage;
          qc.setQueryData<StudyGroupMessage[]>(["study-group-messages", groupId], (old = []) => {
            if (old.some((m) => m.id === newMsg.id)) return old;
            return [...old, newMsg];
          });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [groupId, qc]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    setInput("");
    try {
      await sendMessage(groupId, text);
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao enviar");
      setInput(text);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-12 w-3/4" />
            <Skeleton className="h-12 w-2/3 ml-auto" />
            <Skeleton className="h-12 w-3/4" />
          </div>
        ) : !messages || messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground py-12">
            <Send className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-sm">Nenhuma mensagem ainda. Quebre o gelo!</p>
          </div>
        ) : (
          messages.map((m) => (
            <MessageBubble
              key={m.id}
              msg={m}
              isMe={m.user_id === user?.id}
              member={memberMap.get(m.user_id)}
            />
          ))
        )}
      </div>

      <form
        className="p-3 border-t flex gap-2 bg-card"
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
      >
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Digite uma mensagem..."
          maxLength={2000}
          disabled={sending}
        />
        <Button type="submit" size="icon" disabled={!input.trim() || sending}>
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
