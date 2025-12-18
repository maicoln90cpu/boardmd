import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { UndoProvider } from "@/hooks/useUndoStack";
import { BulkSelectionProvider } from "@/hooks/useBulkSelection";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Auth } from "@/components/Auth";
import { OnlineStatusIndicator } from "@/components/OnlineStatusIndicator";
import { useForegroundPushHandler } from "@/hooks/useForegroundPushHandler";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Notes from "./pages/Notes";
import Calendar from "./pages/Calendar";
import Settings from "./pages/Settings";
import Config from "./pages/Config";
import Landing from "./pages/Landing";
import NotFound from "./pages/NotFound";
import NotificationsDashboard from "./pages/NotificationsDashboard";
import Pomodoro from "./pages/Pomodoro";

const queryClient = new QueryClient();

function AppContent() {
  useForegroundPushHandler();
  
  return (
    <BrowserRouter>
            <Routes>
              <Route path="/landing" element={<Landing />} />
              <Route path="/auth" element={<Auth />} />
              <Route 
                path="/" 
                element={
                  <ProtectedRoute>
                    <Index />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/dashboard" 
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/notes" 
                element={
                  <ProtectedRoute>
                    <Notes />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/calendar" 
                element={
                  <ProtectedRoute>
                    <Calendar />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/settings" 
                element={
                  <ProtectedRoute>
                    <Settings />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/config" 
                element={
                  <ProtectedRoute>
                    <Config />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/notifications" 
                element={
                  <ProtectedRoute>
                    <NotificationsDashboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/pomodoro" 
                element={
                  <ProtectedRoute>
                    <Pomodoro />
                  </ProtectedRoute>
                } 
              />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <ThemeProvider>
          <UndoProvider>
            <BulkSelectionProvider>
              <Toaster />
              <Sonner />
              <OnlineStatusIndicator />
              <AppContent />
            </BulkSelectionProvider>
          </UndoProvider>
        </ThemeProvider>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
