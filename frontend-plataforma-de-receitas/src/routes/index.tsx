import Header from "@/components/header";
import CoursePage from "@/pages/course";

import HomeScreen from "@/pages/home";

import SettingsPage from "@/pages/settings";
import FocusPage from "@/pages/focus";
import NotesPopupPage from "@/pages/notes-popup";
import { ThemeProvider } from "@/components/theme-provider";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { Toaster } from "sonner";
import CoursesPage from "@/pages/courses";
import Footer from "@/components/footer";
import { ScanProgressProvider } from "@/hooks/useScanProgress";
import ErrorBoundary from "@/components/error-boundary";
import { FocusMiniWidget } from "@/components/focus/focus-mini-widget";

function AppContent() {
  const location = useLocation();
  const isPopup = location.pathname === "/notas-popup";

  if (isPopup) {
    return (
      <>
        <Toaster position="bottom-right" richColors expand={false} visibleToasts={1} />
        <Routes>
          <Route path="/notas-popup" element={<NotesPopupPage />} />
        </Routes>
      </>
    );
  }

  return (
    <>
      <Header />
      <Toaster position="bottom-right" richColors expand={false} visibleToasts={1} />
      <main className="p-6">
        <ErrorBoundary>
          <Routes>
            <Route path="/" element={<HomeScreen />} />
            <Route path="/cursos/:courseId" element={<ErrorBoundary><CoursePage /></ErrorBoundary>} />
            <Route path="/configuracoes" element={<SettingsPage />} />
            <Route path="/cursos" element={<CoursesPage />} />
            <Route path="/foco" element={<FocusPage />} />
          </Routes>
        </ErrorBoundary>
        <FocusMiniWidget />
      </main>
      <Footer />
    </>
  );
}

export default function Router() {
  return (
    <BrowserRouter>
      <ScanProgressProvider>
      <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
        <AppContent />
      </ThemeProvider>
      </ScanProgressProvider>
    </BrowserRouter>
  );
}
