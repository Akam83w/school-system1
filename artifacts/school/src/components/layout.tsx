import { Link, useLocation } from "wouter";
import { useLogout, useGetMe } from "@workspace/api-client-react";
import { clearToken } from "@/lib/auth";
import { useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "لوحة التحكم", icon: "📊", roles: ["admin", "teacher", "student"] },
  { href: "/students", label: "الطلاب", icon: "🎓", roles: ["admin", "teacher"] },
  { href: "/teachers", label: "المعلمون", icon: "👩‍🏫", roles: ["admin", "teacher"] },
  { href: "/classes", label: "الصفوف", icon: "🏫", roles: ["admin", "teacher", "student"] },
  { href: "/subjects", label: "المواد", icon: "📚", roles: ["admin", "teacher", "student"] },
  { href: "/attendance", label: "الحضور والغياب", icon: "✅", roles: ["admin", "teacher", "student"] },
  { href: "/grades", label: "الدرجات", icon: "📝", roles: ["admin", "teacher", "student"] },
  { href: "/audit-logs", label: "سجل الأحداث", icon: "🔍", roles: ["admin"] },
];

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  admin: { label: "مدير", color: "bg-amber-500/20 text-amber-300" },
  teacher: { label: "معلم", color: "bg-blue-500/20 text-blue-300" },
  student: { label: "طالب", color: "bg-green-500/20 text-green-300" },
};

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const queryClient = useQueryClient();
  const logoutMutation = useLogout();
  const { data: me } = useGetMe();

  const currentRole = (me as any)?.role ?? "";
  const currentName = (me as any)?.name ?? "";
  const roleMeta = ROLE_LABELS[currentRole];

  useEffect(() => {
    setMobileOpen(false);
  }, [location]);

  function handleLogout() {
    logoutMutation.mutate();
    clearToken();
    queryClient.clear();
    window.location.href = "/login";
  }

  const visibleNav = navItems.filter(item => item.roles.includes(currentRole));

  return (
    <div className="flex min-h-screen bg-background font-sans" dir="rtl">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 right-0 z-50 w-64 bg-sidebar text-sidebar-foreground flex flex-col shadow-xl transition-transform duration-300",
          mobileOpen ? "translate-x-0" : "translate-x-full md:translate-x-0"
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-sidebar-border">
          <div className="w-10 h-10 rounded-xl bg-sidebar-primary flex items-center justify-center text-white font-bold text-lg shadow">
            م
          </div>
          <div>
            <p className="font-bold text-sm leading-tight">نظام إدارة</p>
            <p className="font-bold text-sm leading-tight text-sidebar-primary">المدرسة</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          <p className="text-xs font-semibold text-sidebar-foreground/40 px-3 mb-2 uppercase tracking-widest">القائمة الرئيسية</p>
          {visibleNav.map((item) => {
            const active = location.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)}>
                <div
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 cursor-pointer transition-colors text-sm font-medium",
                    active
                      ? "bg-sidebar-accent text-white"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-white"
                  )}
                >
                  <span className="text-base w-6 text-center">{item.icon}</span>
                  <span>{item.label}</span>
                  {active && <div className="mr-auto w-1.5 h-1.5 rounded-full bg-sidebar-primary" />}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-3 py-4 border-t border-sidebar-border space-y-2">
          {currentName && (
            <div className="px-3 py-2 rounded-lg bg-sidebar-accent/20">
              <p className="text-xs font-semibold text-sidebar-foreground/80 truncate">{currentName}</p>
              {roleMeta && (
                <span className={cn("inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium mt-0.5", roleMeta.color)}>
                  {roleMeta.label}
                </span>
              )}
            </div>
          )}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground/70 hover:bg-red-500/20 hover:text-red-400 transition-colors"
          >
            <span className="text-base w-6 text-center">🚪</span>
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Main content */}
      <div className="flex-1 md:mr-64 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-white border-b border-border px-4 md:px-6 h-14 flex items-center justify-between shadow-sm">
          <button
            className="md:hidden p-2 rounded-lg hover:bg-muted transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">العام الدراسي:</span>
            <span className="text-sm font-semibold text-primary">2024-2025</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-sm font-bold">
              {currentName ? currentName.charAt(0) : "م"}
            </div>
            <span className="text-sm font-medium hidden md:inline">{currentName || "مستخدم"}</span>
            {roleMeta && (
              <span className={cn("hidden md:inline-flex items-center px-2 py-0.5 rounded text-xs font-medium", roleMeta.color)}>
                {roleMeta.label}
              </span>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
