import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { BookOpen, LogOut, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Navbar = () => {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();

  return (
    <nav className="border-b bg-card shadow-sm">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/dashboard")}>
          <div className="p-2 rounded-lg bg-primary/10">
            <BookOpen className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Organizador Universitário</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => navigate("/task/new")} className="gap-2">
            <Plus className="w-4 h-4" />
            Nova Tarefa
          </Button>
          <Button variant="outline" onClick={signOut} className="gap-2">
            <LogOut className="w-4 h-4" />
            Sair
          </Button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
