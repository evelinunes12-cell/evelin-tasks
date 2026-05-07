import { useEffect, useState } from "react";
import { File as FileIcon, Image as ImageIcon, Download, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { AttachmentPreviewModal } from "@/components/AttachmentPreviewModal";
import { supabase } from "@/integrations/supabase/client";

export interface ChatAttachmentData {
  url: string;
  name: string;
  size?: number | null;
  type?: string | null;
}

interface Props {
  attachment: ChatAttachmentData;
  isMe?: boolean;
}

function formatSize(bytes?: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function getKind(type?: string | null, name?: string): "image" | "pdf" | "document" | "other" {
  const t = (type || "").toLowerCase();
  const n = (name || "").toLowerCase();
  if (t.startsWith("image/") || /\.(png|jpe?g|gif|webp|svg)$/i.test(n)) return "image";
  if (t === "application/pdf" || n.endsWith(".pdf")) return "pdf";
  if (
    t.includes("word") ||
    t.includes("excel") ||
    t.includes("spreadsheet") ||
    t.includes("powerpoint") ||
    t.includes("presentation") ||
    /\.(docx?|xlsx?|pptx?)$/i.test(n)
  ) {
    return "document";
  }
  return "other";
}

export default function ChatAttachment({ attachment, isMe }: Props) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const kind = getKind(attachment.type, attachment.name);

  // Resolve storage path -> short-lived signed URL.
  // For backwards compatibility, if attachment.url is already an absolute URL, use it as-is.
  useEffect(() => {
    let cancelled = false;
    const raw = attachment.url;
    if (!raw) return;
    if (/^https?:\/\//i.test(raw)) {
      setSignedUrl(raw);
      return;
    }
    supabase.storage
      .from("chat-attachments")
      .createSignedUrl(raw, 3600)
      .then(({ data }) => {
        if (!cancelled) setSignedUrl(data?.signedUrl ?? null);
      });
    return () => {
      cancelled = true;
    };
  }, [attachment.url]);

  const url = signedUrl ?? "";

  const handleDownload = () => {
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = attachment.name;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  if (kind === "image") {
    return (
      <>
        <button
          type="button"
          onClick={() => setPreviewOpen(true)}
          className="block rounded-lg overflow-hidden mb-1 max-w-[260px]"
        >
          <img
            src={attachment.url}
            alt={attachment.name}
            className="w-full h-auto max-h-[260px] object-cover hover:opacity-90 transition-opacity"
            loading="lazy"
          />
        </button>
        <AttachmentPreviewModal
          isOpen={previewOpen}
          onClose={() => setPreviewOpen(false)}
          url={attachment.url}
          fileName={attachment.name}
          fileType="image"
          onDownload={handleDownload}
        />
      </>
    );
  }

  const canPreview = kind === "pdf" || kind === "document";

  return (
    <>
      <div
        className={cn(
          "flex items-center gap-2 rounded-lg p-2 mb-1 max-w-[280px] border",
          isMe
            ? "bg-primary-foreground/10 border-primary-foreground/20"
            : "bg-background/60 border-border",
        )}
      >
        <div
          className={cn(
            "h-9 w-9 shrink-0 rounded-md flex items-center justify-center",
            isMe ? "bg-primary-foreground/20" : "bg-muted",
          )}
        >
          <FileIcon className="h-4 w-4" />
        </div>
        <button
          type="button"
          onClick={() => (canPreview ? setPreviewOpen(true) : handleDownload())}
          className="flex-1 min-w-0 text-left"
          title={canPreview ? "Visualizar" : "Baixar"}
        >
          <div className="text-xs font-medium truncate">{attachment.name}</div>
          <div className={cn("text-[10px]", isMe ? "opacity-80" : "text-muted-foreground")}>
            {formatSize(attachment.size)}
          </div>
        </button>
        <button
          type="button"
          onClick={handleDownload}
          className={cn(
            "h-7 w-7 shrink-0 rounded-md flex items-center justify-center hover:bg-foreground/10",
          )}
          title="Baixar"
          aria-label="Baixar anexo"
        >
          <Download className="h-3.5 w-3.5" />
        </button>
      </div>
      {canPreview && (
        <AttachmentPreviewModal
          isOpen={previewOpen}
          onClose={() => setPreviewOpen(false)}
          url={attachment.url}
          fileName={attachment.name}
          fileType={kind === "pdf" ? "pdf" : "document"}
          onDownload={handleDownload}
        />
      )}
    </>
  );
}
