import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { resolveUsername } from "@/lib/username";

export interface MentionUser {
  user_id: string;
  full_name?: string | null;
  username?: string | null;
  email?: string | null;
  avatar_url?: string | null;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  onSubmit?: () => void;
  members: MentionUser[];
  placeholder?: string;
  disabled?: boolean;
  maxLength?: number;
  currentUserId?: string | null;
}

export interface MentionInputHandle {
  focus: () => void;
  insertAtCursor: (text: string) => void;
}

const MentionInput = forwardRef<MentionInputHandle, Props>(function MentionInput(
  { value, onChange, onBlur, onSubmit, members, placeholder, disabled, maxLength, currentUserId },
  ref,
) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [mentionStart, setMentionStart] = useState<number | null>(null);
  const [activeIdx, setActiveIdx] = useState(0);

  useImperativeHandle(ref, () => ({
    focus: () => inputRef.current?.focus(),
    insertAtCursor: (text: string) => {
      const el = inputRef.current;
      if (!el) {
        onChange(value + text);
        return;
      }
      const start = el.selectionStart ?? value.length;
      const end = el.selectionEnd ?? value.length;
      const next = value.slice(0, start) + text + value.slice(end);
      onChange(next);
      requestAnimationFrame(() => {
        const pos = start + text.length;
        el.focus();
        el.setSelectionRange(pos, pos);
      });
    },
  }));

  const candidates = useMemo(() => {
    const list = members
      .filter((m) => m.user_id && m.user_id !== currentUserId)
      .map((m) => ({
        ...m,
        _username: resolveUsername({
          username: m.username,
          fullName: m.full_name,
          email: m.email,
          fallbackId: m.user_id,
        }),
      }));
    if (!query) return list.slice(0, 6);
    const q = query.toLowerCase();
    return list
      .filter(
        (m) =>
          m._username.toLowerCase().includes(q) ||
          (m.full_name || "").toLowerCase().includes(q),
      )
      .slice(0, 6);
  }, [members, query, currentUserId]);

  useEffect(() => {
    setActiveIdx(0);
  }, [query, open]);

  const detectMention = (newValue: string, caretPos: number) => {
    const upTo = newValue.slice(0, caretPos);
    const match = upTo.match(/(?:^|\s)@([a-zA-Z0-9_]{0,20})$/);
    if (match) {
      setMentionStart(caretPos - match[1].length - 1);
      setQuery(match[1]);
      setOpen(true);
    } else {
      setOpen(false);
      setMentionStart(null);
      setQuery("");
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    const caret = e.target.selectionStart ?? newValue.length;
    detectMention(newValue, caret);
  };

  const insertMention = (m: MentionUser & { _username: string }) => {
    if (mentionStart === null) return;
    const el = inputRef.current;
    const caret = el?.selectionEnd ?? value.length;
    const before = value.slice(0, mentionStart);
    const after = value.slice(caret);
    const insertion = `@${m._username} `;
    const next = before + insertion + after;
    onChange(next);
    setOpen(false);
    setMentionStart(null);
    setQuery("");
    requestAnimationFrame(() => {
      const pos = before.length + insertion.length;
      el?.focus();
      el?.setSelectionRange(pos, pos);
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (open && candidates.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIdx((i) => (i + 1) % candidates.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIdx((i) => (i - 1 + candidates.length) % candidates.length);
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        insertMention(candidates[activeIdx]);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
        return;
      }
    }
    if (e.key === "Enter" && !e.shiftKey && onSubmit) {
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <div className="relative flex-1">
      {open && candidates.length > 0 && (
        <div className="absolute bottom-full left-0 mb-1 w-72 max-w-[90vw] z-50 rounded-md border bg-popover shadow-md overflow-hidden">
          <div className="max-h-56 overflow-y-auto py-1">
            {candidates.map((m, idx) => (
              <button
                type="button"
                key={m.user_id}
                onMouseDown={(e) => {
                  e.preventDefault();
                  insertMention(m);
                }}
                onMouseEnter={() => setActiveIdx(idx)}
                className={cn(
                  "w-full flex items-center gap-2 px-2 py-1.5 text-left text-sm",
                  idx === activeIdx ? "bg-accent text-accent-foreground" : "hover:bg-accent/50",
                )}
              >
                <Avatar className="h-6 w-6 shrink-0">
                  <AvatarImage src={m.avatar_url ?? undefined} />
                  <AvatarFallback className="text-[10px]">
                    {(m.full_name || m._username).charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{m.full_name || m._username}</div>
                  <div className="truncate text-xs text-muted-foreground">@{m._username}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
      <Input
        ref={inputRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          setTimeout(() => setOpen(false), 100);
          onBlur?.();
        }}
        placeholder={placeholder}
        disabled={disabled}
        maxLength={maxLength}
      />
    </div>
  );
});

export default MentionInput;
