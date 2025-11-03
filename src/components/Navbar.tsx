import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { BookOpen, LogOut, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
const Navbar = () => {
  const {
    signOut,
    user
  } = useAuth();
  const navigate = useNavigate();
  return <nav className="border-b bg-card shadow-sm w-full">
      <div className="w-full px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/dashboard")}>
          <div className="p-2 rounded-lg bg-primary/10">
            <BookOpen className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Gerenciador de Tarefas</h1>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={() => navigate("/task/new")} size="lg" className="gap-2">
            <Plus className="w-5 h-5" />
            Nova Tarefa
          </Button>
          <Button variant="outline" size="lg" onClick={signOut} className="gap-2">
            <LogOut className="w-5 h-5" />
            Sair
          </Button>
        </div>
      </div>
    </nav>;
};
export default Navbar;