import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Mountain, LogOut, Plus, ArrowLeft, Sun, Moon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { NotificationBell } from "./NotificationBell";
import ShortcutsHelpDialog from "./ShortcutsHelpDialog";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface NavbarProps {
  minimal?: boolean;
}

const Navbar = ({ minimal = false }: NavbarProps) => {
  const { signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const toggleTheme = () => setTheme(theme === "dark" ? "light" : "dark");
  
  return (
    <>
      <nav className="border-b bg-card shadow-sm w-full">
        <div className="w-full px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {!minimal && <SidebarTrigger className="md:hidden" />}
            
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/dashboard")}>
              {minimal ? (
                <Button variant="ghost" size="sm" className="gap-2">
                  <ArrowLeft className="w-5 h-5" />
                  <span className="hidden sm:inline">Voltar</span>
                </Button>
              ) : (
                <>
                  <div className="p-2 rounded-xl bg-primary/10">
                    <Mountain className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                  </div>
                  <h1 className="text-lg sm:text-xl font-bold text-foreground">Zenit</h1>
                </>
              )}
            </div>
          </div>
          {!minimal && (
            <TooltipProvider delayDuration={300}>
              <div className="flex items-center gap-1.5 sm:gap-3">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div><ShortcutsHelpDialog /></div>
                  </TooltipTrigger>
                  <TooltipContent>Atalhos do teclado</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div><NotificationBell /></div>
                  </TooltipTrigger>
                  <TooltipContent>Notificações de prazos e atualizações</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={toggleTheme}
                      aria-label="Alternar tema"
                      className="rounded-xl"
                    >
                      {theme === "dark" ? <Sun className="w-4 h-4 sm:w-5 sm:h-5" /> : <Moon className="w-4 h-4 sm:w-5 sm:h-5" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Alternar tema claro/escuro</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button onClick={() => navigate("/task/new")} size="sm" className="gap-1.5 sm:gap-2 rounded-xl sm:size-default">
                      <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                      <span className="hidden sm:inline">Nova Tarefa</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Criar uma nova tarefa</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setShowLogoutConfirm(true)}
                      className="rounded-xl sm:size-default sm:px-4 sm:w-auto"
                      aria-label="Sair"
                    >
                      <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
                      <span className="hidden sm:inline ml-2">Sair</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Encerrar sessão</TooltipContent>
                </Tooltip>
              </div>
            </TooltipProvider>
          )}
        </div>
      </nav>

      <AlertDialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Encerrar sessão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja sair da sua conta? Você precisará fazer login novamente para acessar o sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={signOut} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Sair
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default Navbar;
