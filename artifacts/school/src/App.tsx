import "./lib/auth";
import { useEffect } from "react";
import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PwaInstallPrompt } from "@/components/pwa-install-prompt";
import { OfflineBanner } from "@/components/offline-banner";
import { isAuthenticated } from "@/lib/auth";
import { refreshOfflineCache } from "@/lib/offlineSync";
import LoginPage from "@/pages/login";
import RegisterPage from "@/pages/register";
import AuditLogsPage from "@/pages/audit-logs";
import AdminUsersPage from "@/pages/admin-users";
import DashboardPage from "@/pages/dashboard";
import StudentsPage from "@/pages/students";
import StudentDetailPage from "@/pages/student-detail";
import TeachersPage from "@/pages/teachers";
import TeacherDetailPage from "@/pages/teacher-detail";
import ClassesPage from "@/pages/classes";
import ClassDetailPage from "@/pages/class-detail";
import SubjectsPage from "@/pages/subjects";
import AttendancePage from "@/pages/attendance";
import GradesPage from "@/pages/grades";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount: number) => {
        if (!navigator.onLine) return false;
        return failureCount < 2;
      },
      staleTime: 60 * 1000,
      gcTime: 24 * 60 * 60 * 1000,
      networkMode: "offlineFirst",
    },
    mutations: {
      networkMode: "always",
    },
  },
});

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  if (!isAuthenticated()) return <Redirect to="/login" />;
  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={LoginPage} />
      <Route path="/register" component={RegisterPage} />
      <Route path="/dashboard">
        <ProtectedRoute component={DashboardPage} />
      </Route>
      <Route path="/students/:id">
        {(params) => isAuthenticated() ? <StudentDetailPage id={Number(params.id)} /> : <Redirect to="/login" />}
      </Route>
      <Route path="/students">
        <ProtectedRoute component={StudentsPage} />
      </Route>
      <Route path="/teachers/:id">
        {(params) => isAuthenticated() ? <TeacherDetailPage id={Number(params.id)} /> : <Redirect to="/login" />}
      </Route>
      <Route path="/teachers">
        <ProtectedRoute component={TeachersPage} />
      </Route>
      <Route path="/classes/:id">
        {(params) => isAuthenticated() ? <ClassDetailPage id={Number(params.id)} /> : <Redirect to="/login" />}
      </Route>
      <Route path="/classes">
        <ProtectedRoute component={ClassesPage} />
      </Route>
      <Route path="/subjects">
        <ProtectedRoute component={SubjectsPage} />
      </Route>
      <Route path="/attendance">
        <ProtectedRoute component={AttendancePage} />
      </Route>
      <Route path="/grades">
        <ProtectedRoute component={GradesPage} />
      </Route>
      <Route path="/audit-logs">
        <ProtectedRoute component={AuditLogsPage} />
      </Route>
      <Route path="/users">
        <ProtectedRoute component={AdminUsersPage} />
      </Route>
      <Route path="/">
        {isAuthenticated() ? <Redirect to="/dashboard" /> : <Redirect to="/login" />}
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function CacheRefresher() {
  useEffect(() => {
    if (isAuthenticated()) {
      refreshOfflineCache().catch(() => {});
    }
  }, []);
  return null;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <OfflineBanner />
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <CacheRefresher />
          <Router />
        </WouterRouter>
        <Toaster />
        <PwaInstallPrompt />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
