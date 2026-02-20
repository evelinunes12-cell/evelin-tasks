import { useEffect, useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTheme } from "next-themes";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import {
  Home,
  Plus,
  Settings,
  Moon,
  Sun,
  Users,
  BookOpen,
  Tags,
  FolderOpen,
  NotebookPen,
  Timer,
  Repeat,
} from "lucide-react";

const ZenitCommand = () => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, setTheme } = useTheme();

  const runCommand = useCallback((command: () => void) => {
    setOpen(false);
    command();
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [theme, setTheme]);

  // Listen for Ctrl+K or Cmd+K and other shortcuts
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input/textarea
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      // Command palette: Ctrl/Cmd + K
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }

      // Quick navigation shortcuts (only when palette is closed)
      if (!open && (e.metaKey || e.ctrlKey)) {
        switch (e.key) {
          case "d":
            e.preventDefault();
            navigate("/dashboard");
            break;
          case "e":
            e.preventDefault();
            navigate("/shared-environments");
            break;
          case "n":
            e.preventDefault();
            navigate("/task/new");
            break;
          case ",":
            e.preventDefault();
            navigate("/settings");
            break;
          case "t":
            e.preventDefault();
            toggleTheme();
            break;
        }
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [open, navigate, toggleTheme]);

  // Don't show on auth page
  if (location.pathname === "/auth" || location.pathname === "/onboarding") {
    return null;
  }

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Pesquisar comandos..." />
      <CommandList>
        <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>
        
        {/* Navigation Group */}
        <CommandGroup heading="Navegação">
          <CommandItem onSelect={() => runCommand(() => navigate("/dashboard"))}>
            <Home className="mr-2 h-4 w-4" />
            <span>Ir para Dashboard</span>
            <CommandShortcut>⌘D</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate("/shared-environments"))}>
            <FolderOpen className="mr-2 h-4 w-4" />
            <span>Ir para Ambientes</span>
            <CommandShortcut>⌘E</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate("/planner"))}>
            <NotebookPen className="mr-2 h-4 w-4" />
            <span>Ir para Planner</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate("/subjects"))}>
            <BookOpen className="mr-2 h-4 w-4" />
            <span>Ir para Disciplinas</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate("/task-statuses"))}>
            <Tags className="mr-2 h-4 w-4" />
            <span>Ir para Status</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate("/settings"))}>
            <Settings className="mr-2 h-4 w-4" />
            <span>Ir para Configurações</span>
            <CommandShortcut>⌘,</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate("/estudos/pomodoro"))}>
            <Timer className="mr-2 h-4 w-4" />
            <span>Ir para Pomodoro</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate("/estudos/ciclo"))}>
            <Repeat className="mr-2 h-4 w-4" />
            <span>Ir para Ciclo de Estudos</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        {/* Actions Group */}
        <CommandGroup heading="Ações Rápidas">
          <CommandItem onSelect={() => runCommand(() => navigate("/task/new"))}>
            <Plus className="mr-2 h-4 w-4" />
            <span>Criar Nova Tarefa</span>
            <CommandShortcut>⌘N</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate("/environment/new"))}>
            <Users className="mr-2 h-4 w-4" />
            <span>Criar Novo Ambiente</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(toggleTheme)}>
            {theme === "dark" ? (
              <Sun className="mr-2 h-4 w-4" />
            ) : (
              <Moon className="mr-2 h-4 w-4" />
            )}
            <span>Alternar Tema ({theme === "dark" ? "Claro" : "Escuro"})</span>
            <CommandShortcut>⌘T</CommandShortcut>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
};

export default ZenitCommand;
