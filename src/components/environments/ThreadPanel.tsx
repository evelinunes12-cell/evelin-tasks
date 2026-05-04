import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Send, Smile, X, Hash, ListChecks } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import EmojiPicker, { EmojiStyle, Theme } from "emoji-picker-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { formatUsername } from "@/lib/username";
import MentionInput, { type MentionInputHandle } from "@/components/chat/MentionInput";
import MessageContent from "@/components/chat/MessageContent";
import {
  getThread,
  listThreadMessages,
  sendThreadMessage,
  type ThreadWithMeta,
} from "@/services/environmentThreads";
import type { EnvironmentMessage } from "@/services/environmentMessages";
import type { EnvChatMember } from "./EnvironmentChat";

interface Props {
  environmentId: string;
  threadId: string;
  members: EnvChatMember[];
  onClose: () => void;
}

export default function ThreadPanel({
  environmentId,
  threadId,
  members,
  onClose,
}: Props) {
  const { user } = useAuth();
  const { resolvedTheme } = useTheme();
  const qc = useQueryClient();
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<MentionInputHandle>(null);

  const { data: thread } = useQuery({
    queryKey: ["env-thread", threadId],
    queryFn: () => getThread(threadId),
  });

  const { data: messages, isLoading } = useQuery({
    queryKey: ["env-thread-messages", threadId],
    queryFn: () => listThreadMessages(threadId),
  });

  const memberMap = useMemo(() => {
    const m = new Map<string, EnvChatMember>();
    members.forEach((mem) => {
      if (mem.user_id) m.set(mem.user_id, mem);
    });
    return m;
  }, [members]);

  const mentionMembers = useMemo(
    () =>
      members
        .filter((m) => !!m.user_id)
        .map((m) => ({
          user_id: m.user_id as string,
          full_name: m.full_name,
          username: m.username,
          email: m.email,
          avatar_url: m.avatar_url,
        })),
    [members],
  );

  useEffect(() => {
    const channel = supabase
      .channel(`env-thread-${threadId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "environment_messages",
          filter: `environment_id=eq.${environmentId}`,
        },
        (payload) => {
          const newMsg = payload.new as any;
          if (newMsg.thread_id !== threadId) return;
          qc.setQueryData<EnvironmentMessage[]>(
            ["env-thread-messages", threadId],
            (old = []) => {
              if (old.some((m) => m.id === newMsg.id)) return old;
              return [...old, newMsg as EnvironmentMessage];
            },
          );
          qc.invalidateQueries({ queryKey: ["env-threads", environmentId] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [environmentId, threadId, qc]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [threadId]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    setInput("");
    try {
      await sendThreadMessage({ environmentId, threadId, content: text });
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao enviar");
      setInput(text);
    } finally {
      setSending(false);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  };

  return (
    <div className="flex flex-col h-[600px] min-h-0 border rounded-lg bg-card">
      <div className="px-3 py-2 border-b flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 text-sm font-semibold min-w-0">
            <Hash className="h-4 w-4 shrink-0 text-primary" />
            <span className="truncate">{thread?.title ?? "Tópico"}</span>
          </div>
          {thread?.source_task_name && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5 min-w-0">
              <ListChecks className="h-3 w-3 shrink-0" />
              <span className="truncate">Vinculado à tarefa: {thread.source_task_name}</span>
            </div>
          )}
        </div>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-7 w-7"
          onClick={onClose}
          title="Fechar tópico"
          aria-label="Fechar tópico"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-10 w-2/3 ml-auto" />
          </div>
        ) : !messages || messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground py-8">
            <Hash className="h-6 w-6 mb-2 opacity-50" />
            <p className="text-sm">Inicie a conversa neste tópico.</p>
          </div>
        ) : (
          messages.map((m) => {
            const isMe = m.user_id === user?.id;
            const member = memberMap.get(m.user_id);
            const name = member?.full_name || "Usuário";
            const username = formatUsername(member?.username);
            return (
              <div
                key={m.id}
                className={cn(
                  "flex gap-2 items-end",
                  isMe ? "flex-row-reverse" : "flex-row",
                )}
              >
                {!isMe && (
                  <Avatar className="h-7 w-7 mb-5 shrink-0">
                    <AvatarImage src={member?.avatar_url ?? undefined} />
                    <AvatarFallback>{name.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                )}
                <div
                  className={cn(
                    "max-w-[80%] flex flex-col",
                    isMe ? "items-end" : "items-start",
                  )}
                >
                  {!isMe && (
                    <span className="text-xs text-muted-foreground mb-0.5 px-1">
                      {username}
                    </span>
                  )}
                  <div
                    className={cn(
                      "rounded-2xl px-3 py-2 text-sm break-words whitespace-pre-wrap",
                      isMe
                        ? "bg-primary text-primary-foreground rounded-br-sm"
                        : "bg-muted text-foreground rounded-bl-sm",
                    )}
                  >
                    <MessageContent
                      content={m.content}
                      members={mentionMembers}
                      currentUserId={user?.id}
                      isMe={isMe}
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground mt-0.5 px-1">
                    {new Date(m.created_at).toLocaleTimeString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      <form
        className="p-2 border-t flex gap-1.5 bg-card"
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
      >
        <Popover>
          <PopoverTrigger asChild>
            <Button type="button" size="icon" variant="ghost" disabled={sending} title="Emojis">
              <Smile className="h-5 w-5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            side="top"
            align="start"
            className="p-0 border-0 bg-transparent shadow-none w-auto"
          >
            <EmojiPicker
              onEmojiClick={(e) => setInput((v) => v + e.emoji)}
              theme={(resolvedTheme === "dark" ? "dark" : "light") as Theme}
              emojiStyle={EmojiStyle.NATIVE}
              lazyLoadEmojis
              width={300}
              height={380}
              previewConfig={{ showPreview: false }}
              searchPlaceHolder="Buscar emoji..."
            />
          </PopoverContent>
        </Popover>
        <MentionInput
          ref={inputRef}
          value={input}
          onChange={setInput}
          onSubmit={handleSend}
          placeholder="Responder no tópico..."
          maxLength={2000}
          disabled={sending}
          currentUserId={user?.id}
          members={mentionMembers}
        />
        <Button type="submit" size="icon" disabled={!input.trim() || sending}>
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
