import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, Download, ExternalLink } from "lucide-react";

interface AttachmentPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  url: string | null;
  fileName: string;
  fileType: "pdf" | "image" | "document";
  onDownload?: () => void;
}

export const AttachmentPreviewModal = ({
  isOpen,
  onClose,
  url,
  fileName,
  fileType,
  onDownload,
}: AttachmentPreviewModalProps) => {
  if (!url) return null;

  // Para documentos Word/PowerPoint, usa o Google Docs Viewer
  const getViewerUrl = () => {
    if (fileType === "document") {
      return `https://docs.google.com/gview?url=${encodeURIComponent(url)}&embedded=true`;
    }
    return fileType === "pdf" ? `${url}#toolbar=1&navpanes=0` : url;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl w-[95vw] h-[90vh] p-0 gap-0 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b bg-muted/50">
          <h3 className="font-medium text-sm truncate max-w-[60%]">{fileName}</h3>
          <div className="flex items-center gap-2">
            {onDownload && (
              <Button variant="ghost" size="sm" onClick={onDownload}>
                <Download className="h-4 w-4 mr-1" />
                Baixar
              </Button>
            )}
            <Button variant="ghost" size="sm" asChild>
              <a href={url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-1" />
                Nova aba
              </a>
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto bg-muted/20 h-[calc(90vh-60px)]">
          {fileType === "image" ? (
            <div className="flex items-center justify-center h-full p-4">
              <img
                src={url}
                alt={fileName}
                className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
              />
            </div>
          ) : (
            <iframe
              src={getViewerUrl()}
              className="w-full h-full border-0"
              title={fileName}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
