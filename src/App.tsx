import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { ThemeProvider } from "next-themes";
import { AppSidebar } from "@/components/AppSidebar";
import { SwipeToOpenSidebar } from "@/components/SwipeToOpenSidebar";
import { ConfettiProvider } from "@/hooks/useConfetti";
import { FocusTimerProvider } from "@/contexts/FocusTimerContext";
import { lazy, Suspense, useState, useCallback } from "react";
import PageTransition from "./components/PageTransition";
import PageLoadingFallback from "./components/PageLoadingFallback";
import SplashScreen from "./components/SplashScreen";

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

const RankingPage = lazy(() => import("./pages/RankingPage"));
import ZenitCommand from "./components/ZenitCommand";
import { AdminRoute } from "./components/AdminRoute";
import { ProtectedRoute } from "./components/ProtectedRoute";
import PWAInstallPrompt from "./components/PWAInstallPrompt";

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
    pathname === "/ranking" ||
    pathname === "/task/new" ||
    pathname === "/estudos/pomodoro" ||
    pathname === "/estudos/ciclo" ||
    pathname === "/estudos/desempenho" ||
    
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
        <SwipeToOpenSidebar />
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
          <PWAInstallPrompt />
          <BrowserRouter>
            <ZenitCommand />
            <FocusTimerProvider>
              <Suspense fallback={<PageLoadingFallback />}>
                <SidebarShell>
                  <Routes>
                    <Route path="/" element={<Navigate to="/auth" replace />} />
                    <Route path="/auth" element={<PageTransition><Auth /></PageTransition>} />
                    <Route path="/onboarding" element={<ProtectedRoute><PageTransition><Onboarding /></PageTransition></ProtectedRoute>} />
                    <Route path="/invite/:token" element={<PageTransition><InvitePage /></PageTransition>} />
                    {/* Protected routes */}
                    <Route path="/dashboard" element={<ProtectedRoute><PageTransition><Dashboard /></PageTransition></ProtectedRoute>} />
                    <Route path="/subjects" element={<ProtectedRoute><PageTransition><Subjects /></PageTransition></ProtectedRoute>} />
                    <Route path="/task-statuses" element={<ProtectedRoute><PageTransition><TaskStatuses /></PageTransition></ProtectedRoute>} />
                    <Route path="/settings" element={<ProtectedRoute><PageTransition><Settings /></PageTransition></ProtectedRoute>} />
                    <Route path="/shared-environments" element={<ProtectedRoute><PageTransition><SharedEnvironments /></PageTransition></ProtectedRoute>} />
                    <Route path="/reports" element={<ProtectedRoute><PageTransition><Reports /></PageTransition></ProtectedRoute>} />
                    <Route path="/archived" element={<ProtectedRoute><PageTransition><ArchivedTasks /></PageTransition></ProtectedRoute>} />
                    <Route path="/planner" element={<ProtectedRoute><PageTransition><Planner /></PageTransition></ProtectedRoute>} />
                    <Route path="/ranking" element={<ProtectedRoute><PageTransition><RankingPage /></PageTransition></ProtectedRoute>} />
                    <Route path="/environment/new" element={<ProtectedRoute><PageTransition><EnvironmentForm /></PageTransition></ProtectedRoute>} />
                    <Route path="/environment/:id/edit" element={<ProtectedRoute><PageTransition><EnvironmentForm /></PageTransition></ProtectedRoute>} />
                    <Route path="/environment/:id" element={<ProtectedRoute><PageTransition><EnvironmentDetail /></PageTransition></ProtectedRoute>} />
                    <Route path="/task/new" element={<ProtectedRoute><PageTransition><TaskForm /></PageTransition></ProtectedRoute>} />
                    <Route path="/task/edit/:id" element={<ProtectedRoute><PageTransition><TaskForm /></PageTransition></ProtectedRoute>} />
                    <Route path="/task/:id" element={<ProtectedRoute><PageTransition><TaskDetail /></PageTransition></ProtectedRoute>} />
                    <Route path="/estudos/pomodoro" element={<ProtectedRoute><PageTransition><PomodoroPage /></PageTransition></ProtectedRoute>} />
                    <Route path="/estudos/ciclo" element={<ProtectedRoute><PageTransition><StudyCyclePage /></PageTransition></ProtectedRoute>} />
                    <Route path="/estudos/desempenho" element={<ProtectedRoute><PageTransition><StudyAnalyticsPage /></PageTransition></ProtectedRoute>} />
                    
                    {/* Admin routes */}
                    <Route path="/admin" element={<AdminRoute><PageTransition><AdminDashboard /></PageTransition></AdminRoute>} />
                    <Route path="/admin/users" element={<AdminRoute><PageTransition><AdminUsers /></PageTransition></AdminRoute>} />
                    <Route path="/admin/banners" element={<AdminRoute><PageTransition><AdminBanners /></PageTransition></AdminRoute>} />
                    <Route path="/admin/notifications" element={<AdminRoute><PageTransition><AdminNotifications /></PageTransition></AdminRoute>} />
                    {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                    <Route path="*" element={<PageTransition><NotFound /></PageTransition>} />
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
