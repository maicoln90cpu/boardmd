import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { UndoProvider } from "@/hooks/useUndoStack";
import { BulkSelectionProvider } from "@/hooks/useBulkSelection";
import { SwipeProvider } from "@/contexts/SwipeContext";
import { SavingTasksProvider } from "@/contexts/SavingTasksContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Auth } from "@/components/Auth";
import { OnlineStatusIndicator } from "@/components/OnlineStatusIndicator";
import { useForegroundPushHandler } from "@/hooks/useForegroundPushHandler";
import {
  KanbanLoadingSkeleton,
  StatsLoadingSkeleton,
  NotesLoadingSkeleton,
  SettingsLoadingSkeleton,
  PomodoroLoadingSkeleton,
  CalendarLoadingSkeleton,
  PageLoadingSkeleton,
} from "@/components/ui/loading-skeleton";

// Eager-loaded pages (critical path)
import Index from "./pages/Index";
import Landing from "./pages/Landing";
import NotFound from "./pages/NotFound";

// Lazy-loaded pages (code splitting)
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Notes = lazy(() => import("./pages/Notes"));
const Calendar = lazy(() => import("./pages/Calendar"));
const Settings = lazy(() => import("./pages/Settings"));
const Config = lazy(() => import("./pages/Config"));
const NotificationsDashboard = lazy(() => import("./pages/NotificationsDashboard"));
const Pomodoro = lazy(() => import("./pages/Pomodoro"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));

const queryClient = new QueryClient();

function AppContent() {
  useForegroundPushHandler();
  
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/landing" element={<Landing />} />
        <Route path="/auth" element={<Auth />} />
        <Route 
          path="/forgot-password" 
          element={
            <Suspense fallback={<PageLoadingSkeleton />}>
              <ForgotPassword />
            </Suspense>
          } 
        />
        <Route 
          path="/reset-password" 
          element={
            <Suspense fallback={<PageLoadingSkeleton />}>
              <ResetPassword />
            </Suspense>
          } 
        />
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
              <Suspense fallback={<StatsLoadingSkeleton />}>
                <Dashboard />
              </Suspense>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/notes" 
          element={
            <ProtectedRoute>
              <Suspense fallback={<NotesLoadingSkeleton />}>
                <Notes />
              </Suspense>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/calendar" 
          element={
            <ProtectedRoute>
              <Suspense fallback={<CalendarLoadingSkeleton />}>
                <Calendar />
              </Suspense>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/settings" 
          element={
            <ProtectedRoute>
              <Suspense fallback={<SettingsLoadingSkeleton />}>
                <Settings />
              </Suspense>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/config" 
          element={
            <ProtectedRoute>
              <Suspense fallback={<SettingsLoadingSkeleton />}>
                <Config />
              </Suspense>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/notifications" 
          element={
            <ProtectedRoute>
              <Suspense fallback={<PageLoadingSkeleton />}>
                <NotificationsDashboard />
              </Suspense>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/pomodoro" 
          element={
            <ProtectedRoute>
              <Suspense fallback={<PomodoroLoadingSkeleton />}>
                <Pomodoro />
              </Suspense>
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
              <SwipeProvider>
                <SavingTasksProvider>
                  <Toaster />
                  <Sonner />
                  <OnlineStatusIndicator />
                  <AppContent />
                </SavingTasksProvider>
              </SwipeProvider>
            </BulkSelectionProvider>
          </UndoProvider>
        </ThemeProvider>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
