import { cn } from "@/lib/utils";

interface Props {
  authorName: string;
  content: string;
  isMe?: boolean;
  onClick?: () => void;
}

export default function MessageReplyQuote({ authorName, content, isMe, onClick }: Props) {
  const preview = content.length > 140 ? content.slice(0, 140) + "…" : content;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full text-left rounded-md px-2 py-1 mb-1 border-l-2 transition-opacity hover:opacity-80",
        isMe
          ? "bg-primary-foreground/15 border-primary-foreground/70"
          : "bg-background/60 border-primary",
      )}
    >
      <div
        className={cn(
          "text-[11px] font-semibold truncate",
          isMe ? "text-primary-foreground" : "text-primary",
        )}
      >
        {authorName}
      </div>
      <div
        className={cn(
          "text-xs truncate whitespace-pre-wrap break-words opacity-80",
          isMe ? "text-primary-foreground" : "text-foreground",
        )}
      >
        {preview}
      </div>
    </button>
  );
}
