import { create } from 'zustand';
import type { DownloadTask, StatsData, SettingsData, SystemInfo, Toast, FileItem } from '@/types';

interface StoreState {
  // data
  tasks: DownloadTask[];
  stats: StatsData | null;
  settings: SettingsData | null;
  system: SystemInfo | null;
  files: FileItem[];
  // ui
  toasts: Toast[];
  theme: 'light' | 'dark' | 'system';
  wsConnected: boolean;
  // actions
  setTasks: (tasks: DownloadTask[]) => void;
  upsertTask: (task: DownloadTask | Partial<DownloadTask> & { id: string }) => void;
  removeTask: (id: string) => void;
  updateTaskProgress: (id: string, patch: Partial<DownloadTask>) => void;
  setStats: (stats: StatsData) => void;
  setSettings: (s: SettingsData) => void;
  setSystem: (s: SystemInfo) => void;
  setFiles: (f: FileItem[]) => void;
  setTheme: (t: 'light' | 'dark' | 'system') => void;
  setWsConnected: (b: boolean) => void;
  pushToast: (t: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

export const useStore = create<StoreState>((set) => ({
  tasks: [],
  stats: null,
  settings: null,
  system: null,
  files: [],
  toasts: [],
  theme: (localStorage.getItem('vdm-theme') as any) || 'system',
  wsConnected: false,

  setTasks: (tasks) => set({ tasks }),
  upsertTask: (task) =>
    set((state) => {
      const i = state.tasks.findIndex((t) => t.id === task.id);
      if (i === -1) return { tasks: [task as DownloadTask, ...state.tasks] };
      const next = state.tasks.slice();
      next[i] = { ...next[i], ...(task as Partial<DownloadTask>) } as DownloadTask;
      return { tasks: next };
    }),
  removeTask: (id) => set((state) => ({ tasks: state.tasks.filter((t) => t.id !== id) })),
  updateTaskProgress: (id, patch) =>
    set((state) => {
      const i = state.tasks.findIndex((t) => t.id === id);
      if (i === -1) return state;
      const next = state.tasks.slice();
      next[i] = { ...next[i], ...patch } as DownloadTask;
      return { tasks: next };
    }),
  setStats: (stats) => set({ stats }),
  setSettings: (s) => set({ settings: s }),
  setSystem: (s) => set({ system: s }),
  setFiles: (f) => set({ files: f }),
  setTheme: (t) => {
    localStorage.setItem('vdm-theme', t);
    set({ theme: t });
  },
  setWsConnected: (b) => set({ wsConnected: b }),
  pushToast: (t) => {
    const id = Math.random().toString(36).slice(2);
    set((state) => ({ toasts: [...state.toasts, { id, ...t }] }));
    const ms = t.duration || 3500;
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((x) => x.id !== id) }));
    }, ms);
  },
  removeToast: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));