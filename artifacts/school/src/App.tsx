import "./lib/auth";
import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PwaInstallPrompt } from "@/components/pwa-install-prompt";
import { OfflineBanner } from "@/components/offline-banner";
import { isAuthenticated } from "@/lib/auth";

import { AcademicYearProvider } from "@/contexts/AcademicYearContext";
import LoginPage from "@/pages/login";
import RegisterPage from "@/pages/register";
import AuditLogsPage from "@/pages/audit-logs";
import AdminUsersPage from "@/pages/admin-users";
import AnnouncementsPage from "@/pages/announcements";
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
      retry: false,
      staleTime: 60 * 1000,
      networkMode: "always",
    },
    mutations: {
      networkMode: "always",
    },
  },
});

function Router() {
  if (!isAuthenticated()) {
    return (
      <Switch>
        <Route path="/login" component={LoginPage} />
        <Route path="/register" component={RegisterPage} />
        <Route>
          <Redirect to="/login" />
        </Route>
      </Switch>
    );
  }

  return (
    <Switch>
      <Route path="/login">
        <Redirect to="/dashboard" />
      </Route>
      <Route path="/register" component={RegisterPage} />
      <Route path="/dashboard" component={DashboardPage} />
      <Route path="/students/:id" component={StudentDetailPage} />
      <Route path="/students" component={StudentsPage} />
      <Route path="/teachers/:id" component={TeacherDetailPage} />
      <Route path="/teachers" component={TeachersPage} />
      <Route path="/classes/:id" component={ClassDetailPage} />
      <Route path="/classes" component={ClassesPage} />
      <Route path="/subjects" component={SubjectsPage} />
      <Route path="/attendance" component={AttendancePage} />
      <Route path="/grades" component={GradesPage} />
      <Route path="/audit-logs" component={AuditLogsPage} />
      <Route path="/announcements" component={AnnouncementsPage} />
      <Route path="/users" component={AdminUsersPage} />
      <Route path="/" component={DashboardPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AcademicYearProvider>
        <TooltipProvider>
          <OfflineBanner />
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
          <PwaInstallPrompt />
        </TooltipProvider>
      </AcademicYearProvider>
    </QueryClientProvider>
  );
}

export default App;
