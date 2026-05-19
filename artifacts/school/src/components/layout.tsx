import { Link, useLocation } from "wouter";
import { useLogout, useGetMe } from "@workspace/api-client-react";
import { clearToken } from "@/lib/auth";
import { useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

const DashboardIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-[18px] h-[18px]">
    <rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" />
    <rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" />
  </svg>
);
const StudentsIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-[18px] h-[18px]">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);
const TeachersIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-[18px] h-[18px]">
    <path d="M22 10v6M2 10l10-5 10 5-10 5-10-5z" />
    <path d="M6 12v5c3 3 9 3 12 0v-5" />
  </svg>
);
const ClassesIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-[18px] h-[18px]">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);
const SubjectsIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-[18px] h-[18px]">
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
  </svg>
);
const AttendanceIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-[18px] h-[18px]">
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" /><path d="M9 16l2 2 4-4" />
  </svg>
);
const GradesIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-[18px] h-[18px]">
    <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
    <rect x="9" y="3" width="6" height="4" rx="1" />
    <line x1="9" y1="12" x2="15" y2="12" /><line x1="9" y1="16" x2="13" y2="16" />
  </svg>
);
const AuditIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-[18px] h-[18px]">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);
const LogoutIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-[18px] h-[18px]">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);
const MenuIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
    <line x1="4" y1="6" x2="20" y2="6" /><line x1="4" y1="12" x2="20" y2="12" /><line x1="4" y1="18" x2="20" y2="18" />
  </svg>
);
const CloseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const navItems = [
  { href: "/dashboard", label: "لوحة التحكم", Icon: DashboardIcon, roles: ["admin", "teacher", "student"] },
  { href: "/students", label: "الطلاب", Icon: StudentsIcon, roles: ["admin", "teacher"] },
  { href: "/teachers", label: "المعلمون", Icon: TeachersIcon, roles: ["admin", "teacher"] },
  { href: "/classes", label: "الصفوف الدراسية", Icon: ClassesIcon, roles: ["admin", "teacher", "student"] },
  { href: "/subjects", label: "المواد الدراسية", Icon: SubjectsIcon, roles: ["admin", "teacher", "student"] },
  { href: "/attendance", label: "الحضور والغياب", Icon: AttendanceIcon, roles: ["admin", "teacher", "student"] },
  { href: "/grades", label: "سجل الدرجات", Icon: GradesIcon, roles: ["admin", "teacher", "student"] },
  { href: "/audit-logs", label: "سجل الأحداث", Icon: AuditIcon, roles: ["admin"] },
];

const ROLE_META: Record<string, { label: string; bg: string; text: string }> = {
  admin: { label: "مدير النظام", bg: "bg-amber-500/15", text: "text-amber-300" },
  teacher: { label: "معلم", bg: "bg-blue-500/15", text: "text-blue-300" },
  student: { label: "طالب", bg: "bg-emerald-500/15", text: "text-emerald-300" },
};

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "لوحة التحكم",
  "/students": "الطلاب",
  "/teachers": "المعلمون",
  "/classes": "الصفوف الدراسية",
  "/subjects": "المواد الدراسية",
  "/attendance": "الحضور والغياب",
  "/grades": "سجل الدرجات",
  "/audit-logs": "سجل الأحداث",
};

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const queryClient = useQueryClient();
  const logoutMutation = useLogout();
  const { data: me } = useGetMe();

  const currentRole = (me as any)?.role ?? "";
  const currentName = (me as any)?.name ?? "";
  const roleMeta = ROLE_META[currentRole];

  // Get initials (first two words)
  const initials = currentName
    ? currentName.split(" ").slice(0, 2).map((w: string) => w[0]).join("")
    : "م";

  useEffect(() => { setMobileOpen(false); }, [location]);

  function handleLogout() {
    logoutMutation.mutate();
    clearToken();
    queryClient.clear();
    window.location.href = "/login";
  }

  const visibleNav = navItems.filter(item => item.roles.includes(currentRole));

  // Find current page title
  const pageTitle = Object.entries(PAGE_TITLES).find(([path]) =>
    location.startsWith(path)
  )?.[1] ?? "النظام";

  return (
    <div className="flex min-h-screen bg-background font-sans" dir="rtl">

      {/* ── SIDEBAR ── */}
      <aside
        className={cn(
          "fixed inset-y-0 right-0 z-50 w-[260px] bg-sidebar flex flex-col transition-transform duration-300 ease-in-out",
          "shadow-[−2px_0_20px_rgba(0,0,0,0.3)]",
          mobileOpen ? "translate-x-0" : "translate-x-full md:translate-x-0"
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-sidebar-border/60">
          <div className="w-9 h-9 rounded-xl bg-sidebar-primary/20 flex items-center justify-center flex-shrink-0">
            <svg viewBox="0 0 32 32" className="w-5 h-5" fill="none">
              <rect x="4" y="16" width="24" height="14" rx="2" fill="hsl(213 94% 68%)" opacity="0.9"/>
              <polygon points="16,4 2,16 30,16" fill="hsl(213 94% 68%)"/>
              <rect x="13" y="22" width="6" height="8" rx="1" fill="hsl(224 47% 13%)"/>
              <rect x="6" y="19" width="5" height="4" rx="0.5" fill="white" opacity="0.5"/>
              <rect x="21" y="19" width="5" height="4" rx="0.5" fill="white" opacity="0.5"/>
            </svg>
          </div>
          <div className="min-w-0">
            <p className="text-sidebar-foreground font-bold text-sm leading-tight">نظام إدارة</p>
            <p className="text-sidebar-primary font-bold text-sm leading-tight">المدرسة</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-0.5">
          <p className="text-xs font-semibold text-sidebar-foreground/30 px-3 mb-3 uppercase tracking-widest select-none">
            القائمة الرئيسية
          </p>
          {visibleNav.map(({ href, label, Icon }) => {
            const active = location.startsWith(href);
            return (
              <Link key={href} href={href}>
                <div
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-150 text-sm font-medium group relative",
                    active
                      ? "bg-sidebar-primary/15 text-sidebar-primary"
                      : "text-sidebar-foreground/60 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground"
                  )}
                >
                  {active && (
                    <span className="absolute right-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-sidebar-primary rounded-l-full" />
                  )}
                  <span className={cn("flex-shrink-0 transition-colors", active ? "text-sidebar-primary" : "group-hover:text-sidebar-foreground")}>
                    <Icon />
                  </span>
                  <span className="truncate">{label}</span>
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Footer: user + logout */}
        <div className="px-3 py-4 border-t border-sidebar-border/60 space-y-1.5">
          {currentName && (
            <div className="px-3 py-2.5 rounded-xl bg-sidebar-accent/40 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-sidebar-primary/20 flex items-center justify-center flex-shrink-0 text-sidebar-primary font-bold text-xs">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-sidebar-foreground/90 truncate">{currentName}</p>
                {roleMeta && (
                  <span className={cn("inline-block text-[10px] font-medium px-1.5 py-0.5 rounded mt-0.5", roleMeta.bg, roleMeta.text)}>
                    {roleMeta.label}
                  </span>
                )}
              </div>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-sidebar-foreground/50 hover:bg-red-500/10 hover:text-red-400 transition-all duration-150"
          >
            <LogoutIcon />
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── MAIN ── */}
      <div className="flex-1 md:mr-[260px] flex flex-col min-h-screen">

        {/* Topbar */}
        <header className="sticky top-0 z-30 bg-white border-b border-border px-4 md:px-6 h-14 flex items-center justify-between shadow-sm">
          {/* Left side: hamburger (mobile) + page title */}
          <div className="flex items-center gap-3">
            <button
              className="md:hidden p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="فتح القائمة"
            >
              {mobileOpen ? <CloseIcon /> : <MenuIcon />}
            </button>
            <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{pageTitle}</span>
            </div>
          </div>

          {/* Right side: academic year + user */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/8 border border-primary/15">
              <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 text-primary" fill="currentColor">
                <path d="M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5zM1 4v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4H1z"/>
              </svg>
              <span className="text-xs font-semibold text-primary">2024-2025</span>
            </div>

            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                {initials}
              </div>
              <div className="hidden sm:block">
                <p className="text-xs font-semibold text-foreground leading-tight">{currentName || "مستخدم"}</p>
                {roleMeta && <p className={cn("text-[10px] font-medium", roleMeta.text.replace("text-", "text-").replace("-300", "-600"))}>{roleMeta.label}</p>}
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 md:p-6 max-w-screen-2xl w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
