import { X, Reply } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  authorName: string;
  content: string;
  onCancel: () => void;
  className?: string;
}

export default function MessageReplyPreview({ authorName, content, onCancel, className }: Props) {
  const preview = content.length > 120 ? content.slice(0, 120) + "…" : content;
  return (
    <div
      className={cn(
        "flex items-start gap-2 px-3 py-2 border-t bg-muted/40",
        className,
      )}
    >
      <Reply className="h-4 w-4 mt-0.5 text-primary shrink-0" />
      <div className="flex-1 min-w-0 border-l-2 border-primary pl-2">
        <div className="text-xs font-semibold text-primary truncate">
          Respondendo a {authorName}
        </div>
        <div className="text-xs text-muted-foreground truncate whitespace-pre-wrap break-words">
          {preview}
        </div>
      </div>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="h-6 w-6 shrink-0"
        onClick={onCancel}
        aria-label="Cancelar resposta"
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
