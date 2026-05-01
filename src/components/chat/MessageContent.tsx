import { memo, useMemo } from "react";
import { cn } from "@/lib/utils";
import { resolveUsername } from "@/lib/username";

export interface MentionLookupUser {
  user_id: string;
  full_name?: string | null;
  username?: string | null;
  email?: string | null;
}

interface Props {
  content: string;
  members: MentionLookupUser[];
  currentUserId?: string | null;
  isMe?: boolean;
}

const MENTION_REGEX = /@([a-z0-9_]{3,20})/gi;

const MessageContent = memo(function MessageContent({
  content,
  members,
  currentUserId,
  isMe,
}: Props) {
  const usernameMap = useMemo(() => {
    const map = new Map<string, MentionLookupUser>();
    members.forEach((m) => {
      const u = resolveUsername({
        username: m.username,
        fullName: m.full_name,
        email: m.email,
        fallbackId: m.user_id,
      });
      if (u) map.set(u.toLowerCase(), m);
    });
    return map;
  }, [members]);

  const parts = useMemo(() => {
    const out: Array<{ text: string; mentioned?: MentionLookupUser; isSelf?: boolean }> = [];
    let lastIdx = 0;
    let match: RegExpExecArray | null;
    const regex = new RegExp(MENTION_REGEX);
    while ((match = regex.exec(content)) !== null) {
      const start = match.index;
      const end = start + match[0].length;
      if (start > lastIdx) out.push({ text: content.slice(lastIdx, start) });
      const handle = match[1].toLowerCase();
      const mentioned = usernameMap.get(handle);
      out.push({
        text: match[0],
        mentioned,
        isSelf: !!mentioned && mentioned.user_id === currentUserId,
      });
      lastIdx = end;
    }
    if (lastIdx < content.length) out.push({ text: content.slice(lastIdx) });
    return out;
  }, [content, usernameMap, currentUserId]);

  return (
    <>
      {parts.map((p, i) =>
        p.mentioned ? (
          <span
            key={i}
            className={cn(
              "font-semibold rounded px-0.5",
              p.isSelf
                ? "bg-warning/30 text-warning-foreground"
                : isMe
                ? "underline decoration-primary-foreground/60"
                : "text-primary",
            )}
          >
            {p.text}
          </span>
        ) : (
          <span key={i}>{p.text}</span>
        ),
      )}
    </>
  );
});

export default MessageContent;
