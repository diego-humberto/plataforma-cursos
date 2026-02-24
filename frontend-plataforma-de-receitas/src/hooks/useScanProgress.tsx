import { createContext, useContext, useRef, useState, useCallback, useEffect } from "react";
import useApiUrl from "./useApiUrl";

type ScanProgressEntry = {
  courseId: number;
  total: number;
  processed: number;
  current_file: string;
  percentage: number;
};

type ScanProgressContextType = {
  activeScans: ScanProgressEntry[];
  startScan: (courseId: number) => void;
  onScanComplete?: () => void;
  setOnScanComplete: (cb: (() => void) | undefined) => void;
};

const ScanProgressContext = createContext<ScanProgressContextType>({
  activeScans: [],
  startScan: () => {},
  setOnScanComplete: () => {},
});

export function ScanProgressProvider({ children }: { children: React.ReactNode }) {
  const [activeScans, setActiveScans] = useState<ScanProgressEntry[]>([]);
  const pollRefs = useRef<Map<number, number>>(new Map());
  const onCompleteRef = useRef<(() => void) | undefined>();
  const { apiUrl } = useApiUrl();

  const setOnScanComplete = useCallback((cb: (() => void) | undefined) => {
    onCompleteRef.current = cb;
  }, []);

  const stopPolling = useCallback((courseId: number) => {
    const intervalId = pollRefs.current.get(courseId);
    if (intervalId) {
      clearInterval(intervalId);
      pollRefs.current.delete(courseId);
    }
  }, []);

  const startScan = useCallback((courseId: number) => {
    // Evitar polling duplicado
    stopPolling(courseId);

    setActiveScans((prev) => {
      const existing = prev.find((s) => s.courseId === courseId);
      if (existing) return prev;
      return [...prev, { courseId, total: 0, processed: 0, current_file: "", percentage: 0 }];
    });

    const intervalId = window.setInterval(async () => {
      try {
        const res = await fetch(`${apiUrl}/api/courses/${courseId}/scan-progress`);
        if (!res.ok) return;
        const data = await res.json();
        const percentage = data.total > 0 ? Math.min(Math.round((data.processed / data.total) * 100), 100) : 0;

        setActiveScans((prev) =>
          prev.map((s) =>
            s.courseId === courseId
              ? { ...s, total: data.total, processed: Math.min(data.processed, data.total), current_file: data.current_file, percentage }
              : s
          )
        );

        if (data.done) {
          stopPolling(courseId);
          setActiveScans((prev) => prev.filter((s) => s.courseId !== courseId));
          onCompleteRef.current?.();
        }
      } catch {
        // silenciar erros de rede
      }
    }, 500);

    pollRefs.current.set(courseId, intervalId);
  }, [apiUrl, stopPolling]);

  // Limpar todos os intervalos ao desmontar
  useEffect(() => {
    return () => {
      pollRefs.current.forEach((id) => clearInterval(id));
      pollRefs.current.clear();
    };
  }, []);

  return (
    <ScanProgressContext.Provider value={{ activeScans, startScan, setOnScanComplete }}>
      {children}
    </ScanProgressContext.Provider>
  );
}

export default function useScanProgress() {
  return useContext(ScanProgressContext);
}
