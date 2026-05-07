import { useRef, useState } from "react";
import { Paperclip, X, Loader2, FileText, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const MAX_SIZE = 15 * 1024 * 1024; // 15MB
const ALLOWED = [
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "text/csv",
  "application/zip",
];

export interface PendingChatAttachment {
  url: string; // storage path (private bucket)
  previewUrl?: string | null; // short-lived signed URL for local preview
  path: string;
  name: string;
  size: number;
  type: string;
}

interface Props {
  scope: "environments" | "groups";
  parentId: string; // environment_id OR group_id
  userId: string;
  pending: PendingChatAttachment | null;
  onPendingChange: (a: PendingChatAttachment | null) => void;
  disabled?: boolean;
}

export default function ChatAttachmentButton({
  scope,
  parentId,
  userId,
  pending,
  onPendingChange,
  disabled,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File) => {
    if (file.size > MAX_SIZE) {
      toast.error("Arquivo muito grande. Máximo 15 MB.");
      return;
    }
    if (file.type && !ALLOWED.includes(file.type)) {
      toast.error("Tipo de arquivo não permitido.");
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "bin";
      const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const path = `${scope}/${parentId}/${userId}/${safeName}`;
      const { error } = await supabase.storage
        .from("chat-attachments")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (error) throw error;
      // Bucket is private — store the path. Signed URLs are generated on display.
      const { data: signed } = await supabase.storage
        .from("chat-attachments")
        .createSignedUrl(path, 3600);
      onPendingChange({
        url: path,
        previewUrl: signed?.signedUrl ?? null,
        path,
        name: file.name,
        size: file.size,
        type: file.type,
      });
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao enviar arquivo");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleRemove = async () => {
    if (!pending) return;
    const path = pending.path;
    onPendingChange(null);
    // best-effort delete; ignore errors
    supabase.storage.from("chat-attachments").remove([path]).catch(() => {});
  };

  const isImage = pending?.type?.startsWith("image/");

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED.join(",")}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
        }}
      />
      <Button
        type="button"
        size="icon"
        variant="ghost"
        disabled={disabled || uploading || !!pending}
        onClick={() => inputRef.current?.click()}
        title="Anexar arquivo"
        aria-label="Anexar arquivo"
      >
        {uploading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <Paperclip className="h-5 w-5" />
        )}
      </Button>

      {pending && (
        <div className="absolute bottom-full left-0 right-0 mx-3 mb-1 bg-muted/80 border rounded-lg p-2 flex items-center gap-2">
          <div className="h-9 w-9 rounded bg-background flex items-center justify-center shrink-0 overflow-hidden">
            {isImage ? (
              <img src={pending.previewUrl ?? undefined} alt="" className="h-full w-full object-cover" />
            ) : (
              <FileText className="h-4 w-4" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium truncate">{pending.name}</div>
            <div className="text-[10px] text-muted-foreground">
              {(pending.size / 1024).toFixed(1)} KB
            </div>
          </div>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-7 w-7 shrink-0"
            onClick={handleRemove}
            title="Remover"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
    </>
  );
}
