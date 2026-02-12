import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { ThemeProvider } from "next-themes";
import { AppSidebar } from "@/components/AppSidebar";
import { ConfettiProvider } from "@/hooks/useConfetti";
import { FocusTimerProvider } from "@/contexts/FocusTimerContext";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import TaskForm from "./pages/TaskForm";
import TaskDetail from "./pages/TaskDetail";
import Subjects from "./pages/Subjects";
import TaskStatuses from "./pages/TaskStatuses";
import Settings from "./pages/Settings";
import SharedEnvironments from "./pages/SharedEnvironments";
import EnvironmentForm from "./pages/EnvironmentForm";
import EnvironmentDetail from "./pages/EnvironmentDetail";
import Reports from "./pages/Reports";
import ArchivedTasks from "./pages/ArchivedTasks";
import Planner from "./pages/Planner";
import NotFound from "./pages/NotFound";
import Onboarding from "./pages/Onboarding";
import InvitePage from "./pages/InvitePage";
import ZenitCommand from "./components/ZenitCommand";

const queryClient = new QueryClient();

const SidebarShell = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const pathname = location.pathname;

  // Keep behavior consistent with the previous routing setup:
  // only show the sidebar on the routes that previously rendered <AppSidebar />.
  const showSidebar =
    pathname === "/" ||
    pathname === "/dashboard" ||
    pathname === "/subjects" ||
    pathname === "/task-statuses" ||
    pathname === "/settings" ||
    pathname === "/shared-environments" ||
    pathname === "/reports" ||
    pathname === "/archived" ||
    pathname === "/planner" ||
    pathname === "/task/new" ||
    /^\/task\/edit\/.+/.test(pathname) ||
    /^\/environment\/[^/]+$/.test(pathname);

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        {showSidebar ? <AppSidebar /> : null}
        <div className="flex-1">{children}</div>
      </div>
    </SidebarProvider>
  );
};

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
    <QueryClientProvider client={queryClient}>
      <ConfettiProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <ZenitCommand />
            <FocusTimerProvider>
              <SidebarShell>
                <Routes>
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/onboarding" element={<Onboarding />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/subjects" element={<Subjects />} />
                  <Route path="/task-statuses" element={<TaskStatuses />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/shared-environments" element={<SharedEnvironments />} />
                  <Route path="/reports" element={<Reports />} />
                  <Route path="/archived" element={<ArchivedTasks />} />
                  <Route path="/planner" element={<Planner />} />
                  <Route path="/environment/new" element={<EnvironmentForm />} />
                  <Route path="/environment/:id/edit" element={<EnvironmentForm />} />
                  <Route path="/environment/:id" element={<EnvironmentDetail />} />
                  <Route path="/task/new" element={<TaskForm />} />
                  <Route path="/task/edit/:id" element={<TaskForm />} />
                  <Route path="/task/:id" element={<TaskDetail />} />
                  <Route path="/invite/:token" element={<InvitePage />} />
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </SidebarShell>
            </FocusTimerProvider>
          </BrowserRouter>
        </TooltipProvider>
      </ConfettiProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
