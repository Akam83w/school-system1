import "./lib/auth";
import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PwaInstallPrompt } from "@/components/pwa-install-prompt";
import { OfflineBanner } from "@/components/offline-banner";
import { isAuthenticated } from "@/lib/auth";
import { useGetMe } from "@workspace/api-client-react";

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
import PortalPage from "@/pages/portal";
import ParentMessagesPage from "@/pages/messages";
import MessageAuditPage from "@/pages/message-audit";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Retry transient network and server failures; do not retry client errors such as 401/404.
      retry: (failureCount, error: any) => {
        const status = error?.status ?? error?.response?.status;
        return failureCount < 2 && (status == null || status >= 500);
      },
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
  return <AuthenticatedRouter />;
}

function AuthenticatedRouter() {
  const { data: me, isLoading } = useGetMe();
  if (isLoading) return <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">جاري التحقق من الصلاحيات...</div>;
  if (!me) return <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">تعذر التحقق من الحساب. أعد تسجيل الدخول.</div>;
  const role = (me as any)?.role;
  if (role === "student" || role === "parent") {
    return <Switch>
      <Route path="/portal" component={PortalPage} />
      <Route><Redirect to="/portal" /></Route>
    </Switch>;
  }
  return (
    <Switch>
      <Route path="/login">
        <Redirect to="/dashboard" />
      </Route>
      <Route path="/register" component={RegisterPage} />
      <Route path="/dashboard" component={DashboardPage} />
      <Route path="/students/:id">{(params) => <StudentDetailPage id={params.id} />}</Route>
      <Route path="/students" component={StudentsPage} />
      <Route path="/teachers/:id">{(params) => <TeacherDetailPage id={params.id} />}</Route>
      <Route path="/teachers" component={TeachersPage} />
      <Route path="/classes/:id">{(params) => <ClassDetailPage id={params.id} />}</Route>
      <Route path="/classes" component={ClassesPage} />
      <Route path="/subjects" component={SubjectsPage} />
      <Route path="/attendance" component={AttendancePage} />
      <Route path="/grades" component={GradesPage} />
      <Route path="/audit-logs" component={AuditLogsPage} />
      <Route path="/announcements" component={AnnouncementsPage} />
      <Route path="/messages" component={ParentMessagesPage} />
      <Route path="/message-audit" component={MessageAuditPage} />
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
