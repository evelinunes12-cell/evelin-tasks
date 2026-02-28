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
const AdminBanners = lazy(() => import("./pages/AdminBanners"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminNotifications = lazy(() => import("./pages/admin/AdminNotifications"));
const PomodoroPage = lazy(() => import("./pages/PomodoroPage"));
const StudyCyclePage = lazy(() => import("./pages/StudyCyclePage"));
const StudyAnalyticsPage = lazy(() => import("./pages/StudyAnalyticsPage"));
const StudySchedulePage = lazy(() => import("./pages/StudySchedulePage"));
import ZenitCommand from "./components/ZenitCommand";
import { AdminRoute } from "./components/AdminRoute";
import { ProtectedRoute } from "./components/ProtectedRoute";

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
    pathname === "/estudos/pomodoro" ||
    pathname === "/estudos/ciclo" ||
    pathname === "/estudos/desempenho" ||
    pathname === "/estudos/grade" ||
    pathname === "/admin" ||
    pathname === "/admin/users" ||
    pathname === "/admin/banners" ||
    pathname === "/admin/notifications" ||
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
                    <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
                    <Route path="/invite/:token" element={<InvitePage />} />
                    {/* Protected routes */}
                    <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                    <Route path="/subjects" element={<ProtectedRoute><Subjects /></ProtectedRoute>} />
                    <Route path="/task-statuses" element={<ProtectedRoute><TaskStatuses /></ProtectedRoute>} />
                    <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                    <Route path="/shared-environments" element={<ProtectedRoute><SharedEnvironments /></ProtectedRoute>} />
                    <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
                    <Route path="/archived" element={<ProtectedRoute><ArchivedTasks /></ProtectedRoute>} />
                    <Route path="/planner" element={<ProtectedRoute><Planner /></ProtectedRoute>} />
                    <Route path="/environment/new" element={<ProtectedRoute><EnvironmentForm /></ProtectedRoute>} />
                    <Route path="/environment/:id/edit" element={<ProtectedRoute><EnvironmentForm /></ProtectedRoute>} />
                    <Route path="/environment/:id" element={<ProtectedRoute><EnvironmentDetail /></ProtectedRoute>} />
                    <Route path="/task/new" element={<ProtectedRoute><TaskForm /></ProtectedRoute>} />
                    <Route path="/task/edit/:id" element={<ProtectedRoute><TaskForm /></ProtectedRoute>} />
                    <Route path="/task/:id" element={<ProtectedRoute><TaskDetail /></ProtectedRoute>} />
                    <Route path="/estudos/pomodoro" element={<ProtectedRoute><PomodoroPage /></ProtectedRoute>} />
                    <Route path="/estudos/ciclo" element={<ProtectedRoute><StudyCyclePage /></ProtectedRoute>} />
                    <Route path="/estudos/desempenho" element={<ProtectedRoute><StudyAnalyticsPage /></ProtectedRoute>} />
                    <Route path="/estudos/grade" element={<ProtectedRoute><StudySchedulePage /></ProtectedRoute>} />
                    {/* Admin routes */}
                    <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
                    <Route path="/admin/users" element={<AdminRoute><AdminUsers /></AdminRoute>} />
                    <Route path="/admin/banners" element={<AdminRoute><AdminBanners /></AdminRoute>} />
                    <Route path="/admin/notifications" element={<AdminRoute><AdminNotifications /></AdminRoute>} />
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
