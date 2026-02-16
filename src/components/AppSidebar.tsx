import { useState } from "react";
import { Home, BookOpen, Settings, ListChecks, Users, BarChart3, Archive, NotebookPen, ShieldCheck, Image, ChevronDown, LayoutDashboard, Bell } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { useAdminRole } from "@/hooks/useAdminRole";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useIsMobile } from "@/hooks/use-mobile";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const menuItems = [
  { title: "Início", url: "/dashboard", icon: Home, description: "Painel principal com suas tarefas" },
  { title: "Planner", url: "/planner", icon: NotebookPen, description: "Planeje metas e anotações" },
  { title: "Grupos de Trabalho", url: "/shared-environments", icon: Users, description: "Colabore com colegas em tarefas compartilhadas" },
  { title: "Relatórios", url: "/reports", icon: BarChart3, description: "Veja estatísticas e sua constância" },
  { title: "Arquivadas", url: "/archived", icon: Archive, description: "Tarefas que foram arquivadas" },
  { title: "Disciplinas", url: "/subjects", icon: BookOpen, description: "Gerencie suas disciplinas/matérias" },
  { title: "Status", url: "/task-statuses", icon: ListChecks, description: "Personalize os status das tarefas" },
  { title: "Configurações", url: "/settings", icon: Settings, description: "Perfil, tema e preferências" },
];

const adminSubItems = [
  { title: "Visão Geral", url: "/admin", icon: LayoutDashboard, description: "Métricas e estatísticas do sistema" },
  { title: "Usuários", url: "/admin/users", icon: Users, description: "Gerenciar usuários da plataforma" },
  { title: "Banners", url: "/admin/banners", icon: Image, description: "Gerenciar banners da Dashboard" },
  { title: "Notificações", url: "/admin/notifications", icon: Bell, description: "Enviar notificações aos usuários" },
];

export function AppSidebar() {
  const { open, setOpenMobile } = useSidebar();
  const isMobile = useIsMobile();
  const { isAdmin } = useAdminRole();
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith("/admin");
  const [adminOpen, setAdminOpen] = useState(isAdminRoute);

  const handleLinkClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  const renderMenuItem = (item: typeof menuItems[0]) => (
    <SidebarMenuItem key={item.title}>
      <Tooltip>
        <TooltipTrigger asChild>
          <SidebarMenuButton asChild>
            <NavLink
              to={item.url}
              onClick={handleLinkClick}
              className={({ isActive }) =>
                isActive
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-accent/50"
              }
            >
              <item.icon className="h-4 w-4" />
              {open && <span>{item.title}</span>}
            </NavLink>
          </SidebarMenuButton>
        </TooltipTrigger>
        {!open && (
          <TooltipContent side="right">
            <p className="font-medium">{item.title}</p>
            <p className="text-xs text-muted-foreground">{item.description}</p>
          </TooltipContent>
        )}
      </Tooltip>
    </SidebarMenuItem>
  );

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <div className="p-4 flex justify-end border-b">
          <SidebarTrigger className="hover:bg-accent transition-colors" />
        </div>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <TooltipProvider delayDuration={300}>
                {menuItems.map(renderMenuItem)}
              </TooltipProvider>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isAdmin && (
          <SidebarGroup>
            <Collapsible open={adminOpen} onOpenChange={setAdminOpen}>
              <CollapsibleTrigger className="w-full">
                <SidebarGroupLabel className="cursor-pointer flex items-center justify-between pr-2">
                  <span className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4" />
                    {open && "Admin"}
                  </span>
                  {open && (
                    <ChevronDown className={`h-4 w-4 transition-transform ${adminOpen ? "rotate-180" : ""}`} />
                  )}
                </SidebarGroupLabel>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <TooltipProvider delayDuration={300}>
                      {adminSubItems.map(renderMenuItem)}
                    </TooltipProvider>
                  </SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </Collapsible>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
