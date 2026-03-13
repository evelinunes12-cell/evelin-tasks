import { Loader2 } from "lucide-react";

const PageLoadingFallback = () => (
  <div className="flex min-h-screen w-full items-center justify-center bg-background">
    <div className="flex flex-col items-center gap-3 animate-fade-in">
      <Loader2 className="h-8 w-8 text-primary animate-spin" />
      <p className="text-sm text-muted-foreground">Carregando...</p>
    </div>
  </div>
);

export default PageLoadingFallback;
