import { ClipboardList, Users, FolderOpen, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface EmptyStateProps {
  type: "tasks" | "filtered" | "environments" | "search";
  onClearFilters?: () => void;
}

const emptyStateConfig = {
  tasks: {
    icon: ClipboardList,
    title: "Nenhuma tarefa ainda",
    description: "Comece criando sua primeira tarefa para organizar seus estudos",
    actionLabel: "Criar Primeira Tarefa",
    actionPath: "/task/new",
  },
  filtered: {
    icon: Search,
    title: "Nenhuma tarefa encontrada",
    description: "Nenhuma tarefa corresponde aos filtros aplicados",
    actionLabel: "Limpar Filtros",
    actionPath: null,
  },
  environments: {
    icon: Users,
    title: "Nenhum grupo ainda",
    description: "Você ainda não tem grupos. Que tal criar um para estudar com amigos?",
    actionLabel: "Criar Primeiro Grupo",
    actionPath: "/environments/new",
  },
  search: {
    icon: FolderOpen,
    title: "Nenhum resultado",
    description: "Tente ajustar sua busca ou verificar a ortografia",
    actionLabel: null,
    actionPath: null,
  },
};

export const EmptyState = ({ type, onClearFilters }: EmptyStateProps) => {
  const navigate = useNavigate();
  const config = emptyStateConfig[type];
  const Icon = config.icon;

  const handleAction = () => {
    if (type === "filtered" && onClearFilters) {
      onClearFilters();
    } else if (config.actionPath) {
      navigate(config.actionPath);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-6">
        <Icon className="w-10 h-10 text-muted-foreground" />
      </div>
      <h3 className="text-xl font-semibold text-foreground mb-2">{config.title}</h3>
      <p className="text-muted-foreground max-w-sm mb-6">{config.description}</p>
      {config.actionLabel && (
        <Button onClick={handleAction} size="lg" className="gap-2">
          {type === "tasks" || type === "environments" ? (
            <ClipboardList className="w-4 h-4" />
          ) : null}
          {config.actionLabel}
        </Button>
      )}
    </div>
  );
};

export default EmptyState;
