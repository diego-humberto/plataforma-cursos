import { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import api from "@/lib/api";
import useApiUrl from "./useApiUrl";

export type DailyReading = { name: string; path: string };

type DailyReadingsContextType = {
  readings: DailyReading[];
  isInReadings: (path: string) => boolean;
  add: (path: string, name?: string) => Promise<void>;
  remove: (path: string) => Promise<void>;
  refresh: () => void;
};

const DailyReadingsContext = createContext<DailyReadingsContextType>({
  readings: [],
  isInReadings: () => false,
  add: async () => {},
  remove: async () => {},
  refresh: () => {},
});

/** Normaliza path para comparação (Windows: case-insensitive, barras uniformes). */
function normalizePath(path: string): string {
  return path.replace(/\//g, "\\").toLowerCase();
}

export function DailyReadingsProvider({ children }: { children: React.ReactNode }) {
  const { apiUrl } = useApiUrl();
  const [readings, setReadings] = useState<DailyReading[]>([]);

  const refresh = useCallback(() => {
    api
      .get<DailyReading[]>(`${apiUrl}/api/daily-readings`)
      .then((res) => setReadings(res.data))
      .catch(() => {});
  }, [apiUrl]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const pathSet = useMemo(
    () => new Set(readings.map((r) => normalizePath(r.path))),
    [readings]
  );

  const isInReadings = useCallback(
    (path: string) => pathSet.has(normalizePath(path)),
    [pathSet]
  );

  const add = useCallback(
    async (path: string, name?: string) => {
      const res = await api.post<DailyReading>(`${apiUrl}/api/daily-readings`, {
        path,
        name: name || "",
      });
      setReadings((prev) => [...prev, res.data]);
    },
    [apiUrl]
  );

  const remove = useCallback(
    async (path: string) => {
      await api.delete(`${apiUrl}/api/daily-readings`, { data: { path } });
      setReadings((prev) => prev.filter((r) => normalizePath(r.path) !== normalizePath(path)));
    },
    [apiUrl]
  );

  const value = useMemo(
    () => ({ readings, isInReadings, add, remove, refresh }),
    [readings, isInReadings, add, remove, refresh]
  );

  return (
    <DailyReadingsContext.Provider value={value}>
      {children}
    </DailyReadingsContext.Provider>
  );
}

export default function useDailyReadings() {
  return useContext(DailyReadingsContext);
}
