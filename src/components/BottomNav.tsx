import { useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, Calendar, BookOpen, GraduationCap, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { prefetchRoute } from "@/lib/routePrefetch";
import { useStudyGroupsUnreadTotal } from "@/hooks/useStudyGroupsUnreadTotal";

const navItems = [
  { label: "Início", icon: LayoutDashboard, path: "/dashboard" },
  { label: "Planner", icon: Calendar, path: "/planner" },
  { label: "Estudos", icon: BookOpen, path: "/estudos/ciclo" },
  { label: "Grupos", icon: GraduationCap, path: "/grupos-de-estudo" },
  { label: "Config", icon: Settings, path: "/settings" },
];

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const studyGroupsUnread = useStudyGroupsUnreadTotal();

  const hiddenRoutes = ["/auth", "/onboarding", "/invite"];
  if (hiddenRoutes.some((r) => location.pathname.startsWith(r))) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-card/95 backdrop-blur-sm md:hidden">
      <div className="flex items-center justify-around py-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))]">
        {navItems.map((item) => {
          const isActive =
            location.pathname === item.path ||
            (item.path === "/estudos/ciclo" && location.pathname.startsWith("/estudos")) ||
            (item.path === "/grupos-de-estudo" && location.pathname.startsWith("/grupos-de-estudo")) ||
            (item.path !== "/dashboard" && item.path !== "/estudos/ciclo" && item.path !== "/grupos-de-estudo" && location.pathname.startsWith(item.path));

          const unread = item.path === "/grupos-de-estudo" ? studyGroupsUnread : 0;

          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              onTouchStart={() => prefetchRoute(item.path)}
              onMouseEnter={() => prefetchRoute(item.path)}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors min-w-[3.5rem]",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <span className="relative inline-flex">
                <item.icon className={cn("w-5 h-5", isActive && "stroke-[2.5]")} />
                {unread > 0 && (
                  <span className="absolute -top-1.5 -right-2 min-w-[1rem] h-4 px-1 rounded-full bg-primary text-primary-foreground text-[0.625rem] font-semibold leading-none flex items-center justify-center ring-2 ring-card">
                    {unread > 99 ? "99+" : unread}
                  </span>
                )}
              </span>
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
