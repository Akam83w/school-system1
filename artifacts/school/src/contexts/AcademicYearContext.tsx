import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { useListAcademicYears } from "@workspace/api-client-react";

export interface AcademicYearEntity {
  id: number;
  startYear: number;
  endYear: number;
  label: string;
  isCurrent: boolean;
}

interface AcademicYearContextValue {
  selectedYear: string;
  setSelectedYear: (year: string) => void;
  currentYear: string;
  allYears: AcademicYearEntity[];
  isLoading: boolean;
}

const DEFAULT_YEAR = "2024-2025";
const STORAGE_KEY = "school_selected_year";

const AcademicYearContext = createContext<AcademicYearContextValue>({
  selectedYear: DEFAULT_YEAR,
  setSelectedYear: () => {},
  currentYear: DEFAULT_YEAR,
  allYears: [],
  isLoading: false,
});

export function AcademicYearProvider({ children }: { children: ReactNode }) {
  const { data: rawYears, isLoading } = useListAcademicYears();

  // تعديل دفاعي: نضمن دائماً أن تكون allYears مصفوفة، حتى لو كانت البيانات فارغة أو غير موجودة
  const allYears = Array.isArray(rawYears) ? (rawYears as AcademicYearEntity[]) : [];
  
  // تعديل دفاعي: استخدام Optional Chaining لتجنب الانهيار إذا لم توجد السنة الحالية
  const currentYear = allYears.find((y) => y.isCurrent)?.label ?? DEFAULT_YEAR;

  const [selectedYear, setSelectedYearState] = useState<string>(() => {
    // محاولة استرجاع السنة من المتصفح، أو استخدام السنة الافتراضية
    return localStorage.getItem(STORAGE_KEY) ?? currentYear ?? DEFAULT_YEAR;
  });

  // عند تحميل البيانات لأول مرة، نحدث السنة المختارة إذا لم يقم المستخدم بتغييرها
  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY) && currentYear) {
      setSelectedYearState(currentYear);
    }
  }, [currentYear]);

  function setSelectedYear(year: string) {
    setSelectedYearState(year);
    localStorage.setItem(STORAGE_KEY, year);
  }

  return (
    <AcademicYearContext.Provider
      value={{ selectedYear, setSelectedYear, currentYear, allYears, isLoading }}
    >
      {children}
    </AcademicYearContext.Provider>
  );
}

export const useAcademicYear = () => useContext(AcademicYearContext);
