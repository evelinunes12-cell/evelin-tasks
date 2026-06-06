import { useEffect, useState, useCallback, useRef } from "react";
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

// Returns true when the user is currently typing in an editable surface,
// so global shortcuts must NOT fire (avoids clashing with bold/italic, etc.).
const isEditableTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (target.isContentEditable) return true;
  if (target.closest('[contenteditable="true"], [role="textbox"]')) return true;
  return false;
};

const ZenitCommand = () => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, setTheme } = useTheme();

  // Leader key ("G") state for sequential navigation shortcuts.
  const leaderRef = useRef(false);
  const leaderTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runCommand = useCallback((command: () => void) => {
    setOpen(false);
    command();
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [theme, setTheme]);

  const clearLeader = useCallback(() => {
    leaderRef.current = false;
    if (leaderTimeout.current) {
      clearTimeout(leaderTimeout.current);
      leaderTimeout.current = null;
    }
  }, []);

  const activateLeader = useCallback(() => {
    leaderRef.current = true;
    if (leaderTimeout.current) clearTimeout(leaderTimeout.current);
    leaderTimeout.current = setTimeout(() => {
      leaderRef.current = false;
    }, 1200);
  }, []);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      // Command palette: Ctrl/Cmd + K — the only modifier-based shortcut.
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        clearLeader();
        setOpen((prev) => !prev);
        return;
      }

      // Don't run app shortcuts while the palette is open.
      if (open) return;

      // Never run shortcuts while typing in an editable field.
      if (isEditableTarget(e.target)) return;

      // App shortcuts use NO system modifiers, so they can't conflict with
      // the browser or the rich-text editor (Ctrl+B, Ctrl+Shift+E, etc.).
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const key = e.key.toLowerCase();

      // Second key of a "G <key>" navigation sequence.
      if (leaderRef.current) {
        let handled = true;
        switch (key) {
          case "d":
            navigate("/dashboard");
            break;
          case "a":
            navigate("/shared-environments");
            break;
          case "p":
            navigate("/planner");
            break;
          case "c":
            navigate("/estudos/ciclo");
            break;
          case "s":
            navigate("/settings");
            break;
          default:
            handled = false;
        }
        if (handled) e.preventDefault();
        clearLeader();
        return;
      }

      // First key.
      switch (key) {
        case "g":
          e.preventDefault();
          activateLeader();
          break;
        case "n":
          e.preventDefault();
          navigate("/task/new");
          break;
        case "t":
          e.preventDefault();
          toggleTheme();
          break;
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [open, navigate, toggleTheme, activateLeader, clearLeader]);

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
            <CommandShortcut>G D</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate("/shared-environments"))}>
            <FolderOpen className="mr-2 h-4 w-4" />
            <span>Ir para Ambientes</span>
            <CommandShortcut>G A</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate("/planner"))}>
            <NotebookPen className="mr-2 h-4 w-4" />
            <span>Ir para Planner</span>
            <CommandShortcut>G P</CommandShortcut>
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
            <CommandShortcut>G S</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate("/estudos/pomodoro"))}>
            <Timer className="mr-2 h-4 w-4" />
            <span>Ir para Pomodoro</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate("/estudos/ciclo"))}>
            <Repeat className="mr-2 h-4 w-4" />
            <span>Ir para Ciclo de Estudos</span>
            <CommandShortcut>G C</CommandShortcut>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        {/* Actions Group */}
        <CommandGroup heading="Ações Rápidas">
          <CommandItem onSelect={() => runCommand(() => navigate("/task/new"))}>
            <Plus className="mr-2 h-4 w-4" />
            <span>Criar Nova Tarefa</span>
            <CommandShortcut>N</CommandShortcut>
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
            <CommandShortcut>T</CommandShortcut>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
};

export default ZenitCommand;
