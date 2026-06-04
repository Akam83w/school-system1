import { Link, useLocation } from "wouter";
import { AcademicYearSelector } from "./academic-year-selector";
import { useLogout, useGetMe } from "@workspace/api-client-react";
import { clearToken } from "@/lib/auth";
import { useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";

const DashboardIcon = () => ( <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-[18px] h-[18px]"><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg> );
const StudentsIcon = () => ( <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-[18px] h-[18px]"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg> );
const TeachersIcon = () => ( <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-[18px] h-[18px]"><path d="M22 10v6M2 10l10-5 10 5-10 5-10-5z" /><path d="M6 12v5c3 3 9 3 12 0v-5" /></svg> );
const ClassesIcon = () => ( <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-[18px] h-[18px]"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg> );
const SubjectsIcon = () => ( <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-[18px] h-[18px]"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></svg> );
const AttendanceIcon = () => ( <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-[18px] h-[18px]"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /><path d="M9 16l2 2 4-4" /></svg> );
const GradesIcon = () => ( <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-[18px] h-[18px]"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" /><rect x="9" y="3" width="6" height="4" rx="1" /><line x1="9" y1="12" x2="15" y2="12" /><line x1="9" y1="16" x2="13" y2="16" /></svg> );
const AuditIcon = () => ( <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-[18px] h-[18px]"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg> );
const UsersIcon = () => ( <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-[18px] h-[18px]"><circle cx="12" cy="7" r="4" /><path d="M5.5 21a8.38 8.38 0 0 1 13 0" /><circle cx="19" cy="7" r="2.5" /><path d="M21.5 18a5.5 5.5 0 0 0-4-1.3" /><circle cx="5" cy="7" r="2.5" /><path d="M2.5 18a5.5 5.5 0 0 1 4-1.3" /></svg> );
const AnnouncementsIcon = () => ( <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-[18px] h-[18px]"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg> );
const LogoutIcon = () => ( <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-[18px] h-[18px]"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg> );
const MenuIcon = () => ( <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5"><line x1="4" y1="6" x2="20" y2="6" /><line x1="4" y1="12" x2="20" y2="12" /><line x1="4" y1="18" x2="20" y2="18" /></svg> );
const CloseIcon = () => ( <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg> );

const navItems = [
  { href: "/dashboard", label: "لوحة التحكم", Icon: DashboardIcon },
  { href: "/students", label: "الطلاب", Icon: StudentsIcon },
  { href: "/teachers", label: "المعلمون", Icon: TeachersIcon },
  { href: "/classes", label: "الصفوف الدراسية", Icon: ClassesIcon },
  { href: "/subjects", label: "المواد الدراسية", Icon: SubjectsIcon },
  { href: "/attendance", label: "الحضور والغياب", Icon: AttendanceIcon },
  { href: "/grades", label: "سجل الدرجات", Icon: GradesIcon },
  { href: "/announcements", label: "الإعلانات", Icon: AnnouncementsIcon },
  { href: "/audit-logs", label: "سجل الأحداث", Icon: AuditIcon },
  { href: "/users", label: "إدارة المستخدمين", Icon: UsersIcon },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const queryClient = useQueryClient();
  const logoutMutation = useLogout();
  const { data: me } = useGetMe();
  const { isOnline, pendingCount, isSyncing } = useNetworkStatus();

  // إجبار النظام على التعامل كـ "مدير" لعرض كل شيء
  const currentName = (me as any)?.name ?? "مدير النظام";
  const initials = "مد";

  function handleLogout() {
    logoutMutation.mutate();
    clearToken();
    queryClient.clear();
    window.location.href = "/login";
  }

  return (
    <div className="flex min-h-screen bg-background font-sans" dir="rtl">
      <aside className="fixed inset-y-0 right-0 z-50 w-[260px] bg-sidebar flex flex-col shadow-[2px_0_20px_rgba(0,0,0,0.1)]">
        <div className="flex items-center gap-3 px-5 py-5 border-b border-sidebar-border">
          <p className="text-sidebar-foreground font-bold text-sm">نظام إدارة المدرسة</p>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(({ href, label, Icon }) => (
            <Link key={href} href={href}>
              <div className={cn("flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all", location.startsWith(href) ? "bg-primary/10 text-primary" : "text-sidebar-foreground/60 hover:bg-sidebar-accent")}>
                <Icon />
                <span>{label}</span>
              </div>
            </Link>
          ))}
        </nav>
        <div className="px-3 py-4 border-t">
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-sidebar-foreground/60 hover:bg-red-50 hover:text-red-600">
            <LogoutIcon /> <span>تسجيل الخروج</span>
          </button>
        </div>
      </aside>
      <div className="flex-1 md:mr-[260px] flex flex-col min-h-screen">
        <header className="sticky top-0 z-30 bg-white border-b px-6 h-14 flex items-center justify-between">
           <span className="font-bold">لوحة التحكم</span>
           <div className="flex gap-4 items-center">
              <AcademicYearSelector />
              <span>{currentName}</span>
           </div>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
