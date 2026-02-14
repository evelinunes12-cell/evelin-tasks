import { Home, BookOpen, Settings, ListChecks, Users, BarChart3, Archive, NotebookPen, ShieldCheck, Image } from "lucide-react";
import { NavLink } from "react-router-dom";
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

export function AppSidebar() {
  const { open, setOpenMobile } = useSidebar();
  const isMobile = useIsMobile();
  const { isAdmin } = useAdminRole();

  const allMenuItems = [
    ...menuItems,
    ...(isAdmin
      ? [
          { title: "Admin", url: "/admin", icon: ShieldCheck, description: "Painel administrativo de gestão" },
          { title: "Banners", url: "/admin/banners", icon: Image, description: "Gerenciar banners da Dashboard" },
        ]
      : []),
  ];

  const handleLinkClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

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
                {allMenuItems.map((item) => (
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
                ))}
              </TooltipProvider>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
