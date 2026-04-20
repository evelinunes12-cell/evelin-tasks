import { GraduationCap, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SidebarTrigger } from "@/components/ui/sidebar";

export default function StudyGroupsComingSoon() {
  return (
    <div className="min-h-screen">
      <header className="border-b p-3 flex items-center gap-3 bg-card">
        <SidebarTrigger />
        <h1 className="font-semibold">Grupos de Estudo</h1>
        <Badge variant="secondary" className="ml-2">
          <Sparkles className="h-3 w-3 mr-1" />
          Em breve
        </Badge>
      </header>

      <div className="container mx-auto p-6 max-w-2xl">
        <Card>
          <CardContent className="p-8 text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <GraduationCap className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-xl font-semibold">Estamos preparando algo especial</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Os Grupos de Estudo estão em desenvolvimento. Em breve você poderá
              estudar junto com colegas, ver quem está focado em tempo real,
              conversar no chat do grupo e competir no ranking semanal.
            </p>
            <p className="text-xs text-muted-foreground">
              Voltaremos com tudo pronto: convites, gerenciamento de membros,
              privacidade e presença ao vivo.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
