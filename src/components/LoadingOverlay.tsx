import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingOverlayProps {
  isLoading: boolean;
  message?: string;
  fullScreen?: boolean;
}

const LoadingOverlay = ({ isLoading, message = "Carregando...", fullScreen = true }: LoadingOverlayProps) => {
  if (!isLoading) return null;

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4 bg-background/80 backdrop-blur-sm z-50",
        fullScreen ? "fixed inset-0" : "absolute inset-0 rounded-lg"
      )}
    >
      <div className="relative">
        <div className="w-16 h-16 rounded-full border-4 border-muted animate-pulse" />
        <Loader2 className="w-8 h-8 text-primary animate-spin absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
      </div>
      <p className="text-muted-foreground font-medium animate-pulse">{message}</p>
    </div>
  );
};

export default LoadingOverlay;
