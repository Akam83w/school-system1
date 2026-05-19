import { useState } from "react";
import { useAcademicYear, type AcademicYearEntity } from "@/contexts/AcademicYearContext";
import { useSetCurrentAcademicYear } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useGetMe } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export function AcademicYearSelector() {
  const { selectedYear, setSelectedYear, currentYear, allYears, isLoading } =
    useAcademicYear();
  const [open, setOpen] = useState(false);
  const { data: me } = useGetMe();
  const isAdmin = (me as any)?.role === "admin";
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const setCurrentMutation = useSetCurrentAcademicYear({
    mutation: {
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: ["/academic-years"] });
        toast({ title: `تم تعيين ${(data as AcademicYearEntity).label} كعام دراسي للمدرسة` });
        setOpen(false);
      },
      onError: () => {
        toast({ title: "فشل تحديث العام الدراسي", variant: "destructive" });
      },
    },
  });

  const selectedObj = allYears.find((y) => y.label === selectedYear);
  // Show years sorted newest first for the dropdown
  const sortedYears = [...allYears].reverse();

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-primary/8 border border-primary/15 hover:bg-primary/12 transition-colors cursor-pointer group"
        title="تغيير العام الدراسي"
      >
        <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 text-primary flex-shrink-0" fill="currentColor">
          <path d="M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5zM1 4v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4H1z" />
        </svg>
        <span className="text-xs font-semibold text-primary">
          {isLoading ? "..." : selectedYear}
        </span>
        <svg
          viewBox="0 0 24 24"
          className={cn(
            "w-3 h-3 text-primary/60 transition-transform duration-150",
            open && "rotate-180"
          )}
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          {/* Dropdown */}
          <div
            className="absolute left-0 top-full mt-2 z-50 bg-white border border-border rounded-xl shadow-xl overflow-hidden w-56"
            dir="rtl"
          >
            <div className="px-3 py-2.5 border-b border-border bg-muted/30 flex items-center justify-between">
              <p className="text-xs font-bold text-muted-foreground">العام الدراسي</p>
              {selectedYear !== currentYear && (
                <span className="text-[10px] text-amber-600 font-semibold bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full">
                  عرض فقط
                </span>
              )}
            </div>

            <div className="max-h-64 overflow-y-auto py-1">
              {isLoading ? (
                <div className="px-4 py-6 text-center text-xs text-muted-foreground">
                  جاري التحميل...
                </div>
              ) : (
                sortedYears.map((year) => (
                  <button
                    key={year.id}
                    onClick={() => {
                      setSelectedYear(year.label);
                      setOpen(false);
                    }}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2 text-sm text-right hover:bg-muted/50 transition-colors",
                      year.label === selectedYear
                        ? "bg-primary/5 text-primary font-semibold"
                        : "text-foreground"
                    )}
                  >
                    <span>{year.label}</span>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {year.label === selectedYear && (
                        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-primary" fill="none" stroke="currentColor" strokeWidth={2.5}>
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                      {year.isCurrent && (
                        <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full leading-none">
                          الحالي
                        </span>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>

            {/* Admin: set school's official year */}
            {isAdmin && selectedObj && !selectedObj.isCurrent && (
              <div className="px-3 py-2 border-t border-border bg-muted/30">
                <button
                  onClick={() =>
                    setCurrentMutation.mutate({ id: selectedObj.id })
                  }
                  disabled={setCurrentMutation.isPending}
                  className="w-full text-center text-xs font-semibold text-primary hover:text-primary/80 transition-colors py-1 disabled:opacity-50"
                >
                  {setCurrentMutation.isPending
                    ? "جاري التحديث..."
                    : `تعيين ${selectedYear} كعام المدرسة`}
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
