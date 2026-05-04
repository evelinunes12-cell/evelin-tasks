import { useEffect, useRef, useState, useMemo, memo, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import {
  listEnvironmentMessages,
  sendEnvironmentMessage,
  type EnvironmentMessage,
} from "@/services/environmentMessages";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Send, Smile, Reply, Hash, MessageSquarePlus } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import EmojiPicker, { EmojiStyle, Theme } from "emoji-picker-react";
import { useTheme } from "next-themes";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { formatUsername } from "@/lib/username";
import MentionInput, { type MentionInputHandle } from "@/components/chat/MentionInput";
import MessageContent from "@/components/chat/MessageContent";
import MessageReplyPreview from "@/components/chat/MessageReplyPreview";
import MessageReplyQuote from "@/components/chat/MessageReplyQuote";

export interface EnvChatMember {
  user_id: string | null;
  full_name?: string | null;
  username?: string | null;
  avatar_url?: string | null;
  email?: string;
}

interface TaskOption {
  id: string;
  subject_name: string;
}

interface Props {
  environmentId: string;
  members: EnvChatMember[];
  tasks?: TaskOption[];
}

const TYPING_TIMEOUT_MS = 3000;

const MessageBubble = memo(function MessageBubble({
  msg,
  isMe,
  member,
  members,
  currentUserId,
  repliedMsg,
  repliedAuthorName,
  onReply,
  onJumpTo,
  onStartThread,
}: {
  msg: EnvironmentMessage;
  isMe: boolean;
  member?: EnvChatMember;
  members: EnvChatMember[];
  currentUserId?: string | null;
  repliedMsg?: EnvironmentMessage | null;
  repliedAuthorName?: string;
  onReply: (msg: EnvironmentMessage) => void;
  onJumpTo?: (id: string) => void;
  onStartThread: (msg: EnvironmentMessage) => void;
}) {
  const name = member?.full_name || "Usuário";
  const username = formatUsername(member?.username);
  const lookupMembers = useMemo(
    () =>
      members
        .filter((m) => !!m.user_id)
        .map((m) => ({
          user_id: m.user_id as string,
          full_name: m.full_name,
          username: m.username,
          email: m.email,
        })),
    [members],
  );
  return (
    <div
      id={`env-msg-${msg.id}`}
      className={cn("group flex gap-2 items-end", isMe ? "flex-row-reverse" : "flex-row")}
    >
      {!isMe && (
        <Avatar className="h-8 w-8 mb-5 shrink-0">
          <AvatarImage src={member?.avatar_url ?? undefined} />
          <AvatarFallback>{name.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
      )}
      <div className={cn("max-w-[75%] flex flex-col", isMe ? "items-end" : "items-start")}>
        {!isMe && (
          <span className="text-xs text-muted-foreground mb-0.5 px-1">{username}</span>
        )}
        <div
          className={cn(
            "rounded-2xl px-3 py-2 text-sm break-words whitespace-pre-wrap",
            isMe
              ? "bg-primary text-primary-foreground rounded-br-sm"
              : "bg-muted text-foreground rounded-bl-sm",
          )}
        >
          {repliedMsg && (
            <MessageReplyQuote
              authorName={repliedAuthorName || "Mensagem"}
              content={repliedMsg.content}
              isMe={isMe}
              onClick={() => onJumpTo?.(repliedMsg.id)}
            />
          )}
          <MessageContent
            content={msg.content}
            members={lookupMembers}
            currentUserId={currentUserId}
            isMe={isMe}
          />
        </div>
        <span className="text-[10px] text-muted-foreground mt-0.5 px-1">
          {new Date(msg.created_at).toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </div>
      <div className="flex flex-col gap-1 mb-5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity shrink-0">
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-7 w-7"
          onClick={() => onReply(msg)}
          title="Responder"
          aria-label="Responder mensagem"
        >
          <Reply className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-7 w-7"
          onClick={() => onStartThread(msg)}
          title="Criar tópico"
          aria-label="Criar tópico a partir da mensagem"
        >
          <MessageSquarePlus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
});

function formatDateSeparator(date: Date): string {
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
  if (isSameDay(date, today)) return "Hoje";
  if (isSameDay(date, yesterday)) return "Ontem";
  const diffDays = Math.floor((today.getTime() - date.getTime()) / 86400000);
  if (diffDays < 7) {
    return date.toLocaleDateString("pt-BR", { weekday: "long" });
  }
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: date.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
  });
}

function DateSeparator({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center my-2">
      <span className="text-[11px] font-medium text-muted-foreground bg-muted/60 px-3 py-1 rounded-full capitalize">
        {label}
      </span>
    </div>
  );
}

function TypingIndicator({ names }: { names: string[] }) {
  if (names.length === 0) return null;
  const label =
    names.length === 1
      ? `${names[0]} está digitando`
      : names.length === 2
      ? `${names[0]} e ${names[1]} estão digitando`
      : `${names[0]}, ${names[1]} e mais ${names.length - 2} estão digitando`;
  return (
    <div className="flex items-center gap-2 px-1 text-xs text-muted-foreground">
      <span className="flex gap-0.5">
        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/70 animate-bounce [animation-delay:-0.3s]" />
        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/70 animate-bounce [animation-delay:-0.15s]" />
        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/70 animate-bounce" />
      </span>
      <span className="truncate">{label}…</span>
    </div>
  );
}

export default function EnvironmentChat({ environmentId, members }: Props) {
  const { user } = useAuth();
  const { resolvedTheme } = useTheme();
  const qc = useQueryClient();
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState<EnvironmentMessage | null>(null);
  const [typingUsers, setTypingUsers] = useState<Record<string, number>>({});
  const scrollRef = useRef<HTMLDivElement>(null);
  const typingChannelRef = useRef<RealtimeChannel | null>(null);
  const lastSentTypingRef = useRef<number>(0);
  const localTypingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<MentionInputHandle>(null);

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

  const { data: messages, isLoading } = useQuery({
    queryKey: ["environment-messages", environmentId],
    queryFn: () => listEnvironmentMessages(environmentId),
  });

  const memberMap = useMemo(() => {
    const m = new Map<string, EnvChatMember>();
    members.forEach((mem) => {
      if (mem.user_id) m.set(mem.user_id, mem);
    });
    return m;
  }, [members]);

  const messageMap = useMemo(() => {
    const m = new Map<string, EnvironmentMessage>();
    (messages ?? []).forEach((msg) => m.set(msg.id, msg));
    return m;
  }, [messages]);

  useEffect(() => {
    const channel = supabase
      .channel(`environment-messages-${environmentId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "environment_messages",
          filter: `environment_id=eq.${environmentId}`,
        },
        (payload) => {
          const newMsg = payload.new as EnvironmentMessage;
          qc.setQueryData<EnvironmentMessage[]>(
            ["environment-messages", environmentId],
            (old = []) => {
              if (old.some((m) => m.id === newMsg.id)) return old;
              return [...old, newMsg];
            }
          );
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [environmentId, qc]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase.channel(`environment-typing-${environmentId}`, {
      config: { broadcast: { self: false } },
    });

    channel
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        const userId = payload?.userId as string | undefined;
        if (!userId || userId === user.id) return;
        setTypingUsers((prev) => ({ ...prev, [userId]: Date.now() }));
      })
      .on("broadcast", { event: "stop_typing" }, ({ payload }) => {
        const userId = payload?.userId as string | undefined;
        if (!userId) return;
        setTypingUsers((prev) => {
          if (!(userId in prev)) return prev;
          const next = { ...prev };
          delete next[userId];
          return next;
        });
      })
      .subscribe();

    typingChannelRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
      typingChannelRef.current = null;
    };
  }, [environmentId, user?.id]);

  useEffect(() => {
    if (Object.keys(typingUsers).length === 0) return;
    const interval = setInterval(() => {
      const now = Date.now();
      setTypingUsers((prev) => {
        let changed = false;
        const next: Record<string, number> = {};
        for (const [uid, ts] of Object.entries(prev)) {
          if (now - ts < TYPING_TIMEOUT_MS) {
            next[uid] = ts;
          } else {
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [typingUsers]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, typingUsers]);

  const sendStopTyping = useCallback(() => {
    if (!user || !typingChannelRef.current) return;
    typingChannelRef.current.send({
      type: "broadcast",
      event: "stop_typing",
      payload: { userId: user.id },
    });
    lastSentTypingRef.current = 0;
    if (localTypingTimerRef.current) {
      clearTimeout(localTypingTimerRef.current);
      localTypingTimerRef.current = null;
    }
  }, [user?.id]);

  const handleInputChange = (value: string) => {
    setInput(value);
    if (!user || !typingChannelRef.current) return;

    if (value.trim().length === 0) {
      sendStopTyping();
      return;
    }

    const now = Date.now();
    if (now - lastSentTypingRef.current > 1500) {
      typingChannelRef.current.send({
        type: "broadcast",
        event: "typing",
        payload: { userId: user.id },
      });
      lastSentTypingRef.current = now;
    }

    if (localTypingTimerRef.current) clearTimeout(localTypingTimerRef.current);
    localTypingTimerRef.current = setTimeout(sendStopTyping, TYPING_TIMEOUT_MS);
  };

  useEffect(() => {
    return () => {
      if (localTypingTimerRef.current) clearTimeout(localTypingTimerRef.current);
    };
  }, []);

  const handleReply = useCallback((msg: EnvironmentMessage) => {
    setReplyTo(msg);
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  const handleJumpTo = useCallback((id: string) => {
    const el = document.getElementById(`env-msg-${id}`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add("ring-2", "ring-primary", "rounded-2xl");
    setTimeout(() => el.classList.remove("ring-2", "ring-primary", "rounded-2xl"), 1500);
  }, []);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    setInput("");
    const replyId = replyTo?.id ?? null;
    setReplyTo(null);
    sendStopTyping();
    try {
      await sendEnvironmentMessage(environmentId, text, replyId);
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao enviar");
      setInput(text);
    } finally {
      setSending(false);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  };

  const typingNames = useMemo(() => {
    return Object.keys(typingUsers)
      .map((uid) => {
        const member = memberMap.get(uid);
        return (
          member?.full_name?.split(" ")[0] ||
          formatUsername(member?.username) ||
          "Alguém"
        );
      })
      .filter(Boolean);
  }, [typingUsers, memberMap]);

  const replyAuthorName = useMemo(() => {
    if (!replyTo) return "";
    const m = memberMap.get(replyTo.user_id);
    return m?.full_name || formatUsername(m?.username) || "Usuário";
  }, [replyTo, memberMap]);

  return (
    <div className="flex flex-col h-[600px] min-h-0 border rounded-lg bg-card">
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
          messages.map((m, idx) => {
            const currentDate = new Date(m.created_at);
            const prev = idx > 0 ? messages[idx - 1] : null;
            const showSeparator =
              !prev ||
              new Date(prev.created_at).toDateString() !== currentDate.toDateString();
            const repliedMsg = m.reply_to_id ? messageMap.get(m.reply_to_id) ?? null : null;
            const repliedAuthor = repliedMsg
              ? memberMap.get(repliedMsg.user_id)?.full_name ||
                formatUsername(memberMap.get(repliedMsg.user_id)?.username) ||
                "Usuário"
              : undefined;
            return (
              <div key={m.id} className="space-y-3">
                {showSeparator && <DateSeparator label={formatDateSeparator(currentDate)} />}
                <MessageBubble
                  msg={m}
                  isMe={m.user_id === user?.id}
                  member={memberMap.get(m.user_id)}
                  members={members}
                  currentUserId={user?.id}
                  repliedMsg={repliedMsg}
                  repliedAuthorName={repliedAuthor}
                  onReply={handleReply}
                  onJumpTo={handleJumpTo}
                />
              </div>
            );
          })
        )}
      </div>

      <div className="px-4 h-5 flex items-center">
        <TypingIndicator names={typingNames} />
      </div>

      {replyTo && (
        <MessageReplyPreview
          authorName={replyAuthorName}
          content={replyTo.content}
          onCancel={() => setReplyTo(null)}
        />
      )}

      <form
        className="p-3 border-t flex gap-2 bg-card"
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
              onEmojiClick={(e) => handleInputChange(input + e.emoji)}
              theme={(resolvedTheme === "dark" ? "dark" : "light") as Theme}
              emojiStyle={EmojiStyle.NATIVE}
              lazyLoadEmojis
              width={320}
              height={400}
              previewConfig={{ showPreview: false }}
              searchPlaceHolder="Buscar emoji..."
            />
          </PopoverContent>
        </Popover>
        <MentionInput
          ref={inputRef}
          value={input}
          onChange={handleInputChange}
          onBlur={sendStopTyping}
          onSubmit={handleSend}
          placeholder="Digite uma mensagem... use @ para mencionar"
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
