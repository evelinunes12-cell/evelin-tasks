import { useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, Calendar, Users, BookOpen, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Início", icon: LayoutDashboard, path: "/dashboard" },
  { label: "Planner", icon: Calendar, path: "/planner" },
  { label: "Grupos", icon: Users, path: "/shared-environments" },
  { label: "Estudos", icon: BookOpen, path: "/estudos/ciclo" },
  { label: "Config", icon: Settings, path: "/settings" },
];

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  const hiddenRoutes = ["/auth", "/onboarding", "/invite"];
  if (hiddenRoutes.some((r) => location.pathname.startsWith(r))) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-card/95 backdrop-blur-sm md:hidden">
      <div className="flex items-center justify-around py-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))]">
        {navItems.map((item) => {
          const isActive =
            location.pathname === item.path ||
            (item.path === "/estudos/ciclo" && location.pathname.startsWith("/estudos")) ||
            (item.path !== "/dashboard" && item.path !== "/estudos/ciclo" && location.pathname.startsWith(item.path));

          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors min-w-[3.5rem]",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <item.icon className={cn("w-5 h-5", isActive && "stroke-[2.5]")} />
              <span className={cn("text-[0.625rem] leading-tight", isActive && "font-semibold")}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
