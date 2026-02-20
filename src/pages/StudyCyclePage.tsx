import Navbar from "@/components/Navbar";
import { Repeat, BookOpen } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const StudyCyclePage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar minimal />
      <div className="flex flex-col items-center justify-center px-4 py-20">
        <div className="p-4 rounded-2xl bg-primary/10 mb-6">
          <Repeat className="h-10 w-10 text-primary" />
        </div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Meu Ciclo de Estudos</h1>
        <p className="text-muted-foreground mb-10 text-center max-w-md">
          Configure seu ciclo ideal em breve. Organize suas matérias, defina tempos e estude de forma inteligente.
        </p>

        <div className="w-full max-w-lg space-y-4">
          <div className="flex items-center gap-4 rounded-xl border bg-card p-4 shadow-sm">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-8 w-16 rounded-md" />
          </div>
          <div className="flex items-center gap-4 rounded-xl border bg-card p-4 shadow-sm">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/3" />
            </div>
            <Skeleton className="h-8 w-16 rounded-md" />
          </div>
          <div className="flex items-center gap-4 rounded-xl border bg-card p-4 shadow-sm">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-3 w-2/5" />
            </div>
            <Skeleton className="h-8 w-16 rounded-md" />
          </div>
        </div>

        <div className="mt-8 flex items-center gap-2 text-sm text-muted-foreground">
          <BookOpen className="h-4 w-4" />
          <span>Em breve você poderá montar seu ciclo com suas disciplinas.</span>
        </div>
      </div>
    </div>
  );
};

export default StudyCyclePage;
