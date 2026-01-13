import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { ThemeProvider } from "next-themes";
import { AppSidebar } from "@/components/AppSidebar";
import { ConfettiProvider } from "@/hooks/useConfetti";
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
import NotFound from "./pages/NotFound";
import Onboarding from "./pages/Onboarding";

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
    <QueryClientProvider client={queryClient}>
      <ConfettiProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route
              path="/dashboard"
              element={
                <SidebarProvider>
                  <div className="flex min-h-screen w-full">
                    <AppSidebar />
                    <Dashboard />
                  </div>
                </SidebarProvider>
              }
            />
            <Route
              path="/subjects"
              element={
                <SidebarProvider>
                  <div className="flex min-h-screen w-full">
                    <AppSidebar />
                    <Subjects />
                  </div>
                </SidebarProvider>
              }
            />
            <Route
              path="/task-statuses"
              element={
                <SidebarProvider>
                  <div className="flex min-h-screen w-full">
                    <AppSidebar />
                    <TaskStatuses />
                  </div>
                </SidebarProvider>
              }
            />
            <Route
              path="/settings"
              element={
                <SidebarProvider>
                  <div className="flex min-h-screen w-full">
                    <AppSidebar />
                    <Settings />
                  </div>
                </SidebarProvider>
              }
            />
            <Route
              path="/shared-environments"
              element={
                <SidebarProvider>
                  <div className="flex min-h-screen w-full">
                    <AppSidebar />
                    <SharedEnvironments />
                  </div>
                </SidebarProvider>
              }
            />
            <Route path="/environment/new" element={<EnvironmentForm />} />
            <Route path="/environment/:id/edit" element={<EnvironmentForm />} />
            <Route
              path="/environment/:id"
              element={
                <SidebarProvider>
                  <div className="flex min-h-screen w-full">
                    <AppSidebar />
                    <div className="flex-1">
                      <EnvironmentDetail />
                    </div>
                  </div>
                </SidebarProvider>
              }
            />
            <Route
              path="/task/new"
              element={
                <SidebarProvider>
                  <div className="flex min-h-screen w-full">
                    <AppSidebar />
                    <div className="flex-1">
                      <TaskForm />
                    </div>
                  </div>
                </SidebarProvider>
              }
            />
            <Route
              path="/task/edit/:id"
              element={
                <SidebarProvider>
                  <div className="flex min-h-screen w-full">
                    <AppSidebar />
                    <div className="flex-1">
                      <TaskForm />
                    </div>
                  </div>
                </SidebarProvider>
              }
            />
            <Route path="/task/:id" element={<TaskDetail />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ConfettiProvider>
  </QueryClientProvider>
</ThemeProvider>
);

export default App;
