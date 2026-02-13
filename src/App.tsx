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
import { lazy, Suspense } from "react";

const Auth = lazy(() => import("./pages/Auth"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const TaskForm = lazy(() => import("./pages/TaskForm"));
const TaskDetail = lazy(() => import("./pages/TaskDetail"));
const Subjects = lazy(() => import("./pages/Subjects"));
const TaskStatuses = lazy(() => import("./pages/TaskStatuses"));
const Settings = lazy(() => import("./pages/Settings"));
const SharedEnvironments = lazy(() => import("./pages/SharedEnvironments"));
const EnvironmentForm = lazy(() => import("./pages/EnvironmentForm"));
const EnvironmentDetail = lazy(() => import("./pages/EnvironmentDetail"));
const Reports = lazy(() => import("./pages/Reports"));
const ArchivedTasks = lazy(() => import("./pages/ArchivedTasks"));
const Planner = lazy(() => import("./pages/Planner"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const InvitePage = lazy(() => import("./pages/InvitePage"));
const AdminUsers = lazy(() => import("./pages/AdminUsers"));
import ZenitCommand from "./components/ZenitCommand";
import { AdminRoute } from "./components/AdminRoute";

const queryClient = new QueryClient();

const SidebarShell = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const pathname = location.pathname;

  // Keep behavior consistent with the previous routing setup:
  // only show the sidebar on the routes that previously rendered <AppSidebar />.
  const showSidebar =
    pathname === "/dashboard" ||
    pathname === "/subjects" ||
    pathname === "/task-statuses" ||
    pathname === "/settings" ||
    pathname === "/shared-environments" ||
    pathname === "/reports" ||
    pathname === "/archived" ||
    pathname === "/planner" ||
    pathname === "/task/new" ||
    pathname === "/admin" ||
    pathname === "/admin/users" ||
    /^\/task\/edit\/.+/.test(pathname) ||
    /^\/environment\/[^/]+$/.test(pathname);

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        {showSidebar ? <AppSidebar /> : null}
        <main className="flex-1">{children}</main>
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
              <Suspense fallback={<div className="flex min-h-screen w-full" />}>
                <SidebarShell>
                  <Routes>
                    <Route path="/" element={<Navigate to="/auth" replace />} />
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
                    <Route path="/admin" element={<AdminRoute><AdminUsers /></AdminRoute>} />
                    <Route path="/admin/users" element={<AdminRoute><AdminUsers /></AdminRoute>} />
                    {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </SidebarShell>
              </Suspense>
            </FocusTimerProvider>
          </BrowserRouter>
        </TooltipProvider>
      </ConfettiProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
