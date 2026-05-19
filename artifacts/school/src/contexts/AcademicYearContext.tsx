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
  /** The year the user has selected in the UI (persisted in localStorage) */
  selectedYear: string;
  setSelectedYear: (year: string) => void;
  /** The school's officially set "current" year (from DB) */
  currentYear: string;
  /** All 80 year entities (2020-2021 … 2099-2100), sorted by startYear asc */
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
  const { data: rawYears = [], isLoading } = useListAcademicYears();

  const allYears = rawYears as AcademicYearEntity[];
  const currentYear = allYears.find((y) => y.isCurrent)?.label ?? DEFAULT_YEAR;

  const [selectedYear, setSelectedYearState] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEY) ?? DEFAULT_YEAR;
  });

  // When years first load and nothing is persisted, default to the school's current year
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

export function useAcademicYear() {
  return useContext(AcademicYearContext);
}
