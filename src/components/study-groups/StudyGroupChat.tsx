import { useEffect, useRef, useState, useMemo, memo, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { listMessages, sendMessage, type StudyGroupMessage, type StudyGroupMember } from "@/services/studyGroups";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Send, Smile } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import EmojiPicker, { EmojiStyle, Theme } from "emoji-picker-react";
import { useTheme } from "next-themes";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { formatUsername } from "@/lib/username";
import MentionInput, { type MentionInputHandle, type MentionUser } from "@/components/chat/MentionInput";
import MessageContent from "@/components/chat/MessageContent";

interface Props {
  groupId: string;
  members: StudyGroupMember[];
}

const TYPING_TIMEOUT_MS = 3000;

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

export default function StudyGroupChat({ groupId, members }: Props) {
  const { user } = useAuth();
  const { resolvedTheme } = useTheme();
  const qc = useQueryClient();
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Record<string, number>>({});
  const scrollRef = useRef<HTMLDivElement>(null);
  const typingChannelRef = useRef<RealtimeChannel | null>(null);
  const lastSentTypingRef = useRef<number>(0);
  const localTypingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: messages, isLoading } = useQuery({
    queryKey: ["study-group-messages", groupId],
    queryFn: () => listMessages(groupId),
  });

  const memberMap = useMemo(() => {
    const m = new Map<string, StudyGroupMember>();
    members.forEach((mem) => m.set(mem.user_id, mem));
    return m;
  }, [members]);

  // Realtime: messages
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

  // Realtime: typing indicator (broadcast)
  useEffect(() => {
    if (!user) return;
    const channel = supabase.channel(`study-group-typing-${groupId}`, {
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
  }, [groupId, user?.id]);

  // Expire stale typing entries
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

  // Auto-scroll
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
    // Throttle: re-send "typing" at most every 1.5s
    if (now - lastSentTypingRef.current > 1500) {
      typingChannelRef.current.send({
        type: "broadcast",
        event: "typing",
        payload: { userId: user.id },
      });
      lastSentTypingRef.current = now;
    }

    // Reset auto-stop timer
    if (localTypingTimerRef.current) clearTimeout(localTypingTimerRef.current);
    localTypingTimerRef.current = setTimeout(sendStopTyping, TYPING_TIMEOUT_MS);
  };

  // Cleanup typing on unmount
  useEffect(() => {
    return () => {
      if (localTypingTimerRef.current) clearTimeout(localTypingTimerRef.current);
    };
  }, []);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    setInput("");
    sendStopTyping();
    try {
      await sendMessage(groupId, text);
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao enviar");
      setInput(text);
    } finally {
      setSending(false);
    }
  };

  const typingNames = useMemo(() => {
    return Object.keys(typingUsers)
      .map((uid) => {
        const member = memberMap.get(uid);
        const profile = member?.profile;
        return (
          profile?.full_name?.split(" ")[0] ||
          formatUsername(profile?.username) ||
          "Alguém"
        );
      })
      .filter(Boolean);
  }, [typingUsers, memberMap]);

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
          messages.map((m, idx) => {
            const currentDate = new Date(m.created_at);
            const prev = idx > 0 ? messages[idx - 1] : null;
            const showSeparator =
              !prev ||
              new Date(prev.created_at).toDateString() !== currentDate.toDateString();
            return (
              <div key={m.id} className="space-y-3">
                {showSeparator && <DateSeparator label={formatDateSeparator(currentDate)} />}
                <MessageBubble
                  msg={m}
                  isMe={m.user_id === user?.id}
                  member={memberMap.get(m.user_id)}
                />
              </div>
            );
          })
        )}
      </div>

      <div className="px-4 h-5 flex items-center">
        <TypingIndicator names={typingNames} />
      </div>

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
        <Input
          value={input}
          onChange={(e) => handleInputChange(e.target.value)}
          onBlur={sendStopTyping}
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
