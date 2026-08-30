import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Sidebar } from '@/components/Sidebar';
import { TopBar } from '@/components/TopBar';
import { MobileNav } from '@/components/MobileNav';
import { ToastContainer } from '@/components/Toast';
import { HomePage } from '@/pages/HomePage';
import { TasksPage } from '@/pages/TasksPage';
import { HistoryPage } from '@/pages/HistoryPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { useTheme } from '@/hooks/useTheme';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useStore } from '@/store';
import { api } from '@/utils/api';

function AppShell() {
  useTheme();
  useWebSocket();
  const setSettings = useStore((s) => s.setSettings);
  const setSystem = useStore((s) => s.setSystem);
  const setStats = useStore((s) => s.setStats);
  const upsertTask = useStore((s) => s.upsertTask);

  useEffect(() => {
    // Initial sync
    api.settings().then(setSettings).catch(() => {});
    api.system().then(setSystem).catch(() => {});
    api.stats().then(setStats).catch(() => {});
    api.listTasks().then((tasks) => tasks.forEach((t) => upsertTask(t))).catch(() => {});
  }, []);

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main className="flex-1 pb-20 lg:pb-6">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/tasks" element={<TasksPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<HomePage />} />
          </Routes>
        </main>
        <MobileNav />
        <ToastContainer />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
}