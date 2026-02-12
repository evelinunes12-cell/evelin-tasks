import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Mountain, LogOut, Plus, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { NotificationBell } from "./NotificationBell";
import { FocusTimer } from "./FocusTimer";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface NavbarProps {
  minimal?: boolean;
}

const Navbar = ({ minimal = false }: NavbarProps) => {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  
  return (
    <nav className="border-b bg-card shadow-sm w-full">
      <div className="w-full px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Botão do menu mobile - só aparece em telas pequenas e quando não está em modo minimal */}
          {!minimal && <SidebarTrigger className="md:hidden" />}
          
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/dashboard")}>
            {minimal ? (
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="w-5 h-5" />
                Voltar
              </Button>
            ) : (
              <>
                <div className="p-2 rounded-xl bg-primary/10">
                  <Mountain className="w-6 h-6 text-primary" />
                </div>
                <h1 className="text-xl font-bold text-foreground">Zenit</h1>
              </>
            )}
          </div>
        </div>
        {!minimal && (
          <TooltipProvider delayDuration={300}>
            <div className="flex items-center gap-3">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div><FocusTimer /></div>
                </TooltipTrigger>
                <TooltipContent>Timer Pomodoro — foque por 25 min e mantenha sua ofensiva 🔥</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div><NotificationBell /></div>
                </TooltipTrigger>
                <TooltipContent>Notificações de prazos e atualizações</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button onClick={() => navigate("/task/new")} size="lg" className="gap-2 rounded-xl">
                    <Plus className="w-5 h-5" />
                    Nova Tarefa
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Criar uma nova tarefa</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="lg" onClick={signOut} className="gap-2 rounded-xl">
                    <LogOut className="w-5 h-5" />
                    Sair
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Encerrar sessão</TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
