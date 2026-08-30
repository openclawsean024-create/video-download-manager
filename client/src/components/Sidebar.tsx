import { NavLink } from 'react-router-dom';
import { useStore } from '@/store';
import clsx from 'clsx';

const ITEMS = [
  { to: '/', label: '首页', icon: 'home' },
  { to: '/tasks', label: '下载任务', icon: 'tasks' },
  { to: '/history', label: '历史记录', icon: 'history' },
  { to: '/dashboard', label: '数据', icon: 'dashboard' },
  { to: '/settings', label: '设置', icon: 'settings' },
];

const ICONS: Record<string, JSX.Element> = {
  home: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
      <path d="M3 11l9-8 9 8M5 9.5V21h14V9.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  tasks: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
      <path d="M12 3v12m0 0l-4-4m4 4l4-4M5 21h14" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  history: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
      <path d="M3 12a9 9 0 109-9 9.75 9.75 0 00-6.74 2.74L3 8M3 3v5h5M12 7v5l3 2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  dashboard: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </svg>
  ),
  settings: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z" strokeLinejoin="round" />
    </svg>
  ),
};

export function Sidebar() {
  const tasks = useStore((s) => s.tasks);
  const active = tasks.filter((t) => t.status === 'downloading' || t.status === 'parsing').length;
  return (
    <aside className="hidden w-56 shrink-0 border-r border-zinc-200 bg-white/60 px-4 py-6 dark:border-zinc-800 dark:bg-surface-dark-3/60 lg:block">
      <div className="mb-7 flex items-center gap-2 px-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-glow">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
            <path d="M12 4v12m0 0l-4-4m4 4l4-4M4 20h16" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div>
          <div className="text-sm font-semibold leading-none">视频下载</div>
          <div className="mt-1 text-[11px] text-zinc-500 leading-none">Video Manager</div>
        </div>
      </div>
      <nav className="flex flex-col gap-1">
        {ITEMS.map((it) => (
          <NavLink
            key={it.to}
            to={it.to}
            end={it.to === '/'}
            className={({ isActive }) =>
              clsx(
                'group flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition',
                isActive
                  ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300'
                  : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800',
              )
            }
          >
            {ICONS[it.icon]}
            <span>{it.label}</span>
            {it.to === '/tasks' && active > 0 && (
              <span className="ml-auto rounded-full bg-brand-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                {active}
              </span>
            )}
          </NavLink>
        ))}
      </nav>
      <div className="mt-8 px-2 text-[11px] text-zinc-500 dark:text-zinc-500">
        <div className="flex items-center gap-2">
          <span className={clsx('h-2 w-2 rounded-full', useStore.getState().wsConnected ? 'bg-emerald-500' : 'bg-zinc-400')} />
          <span>{useStore.getState().wsConnected ? '已连接' : '连接中...'}</span>
        </div>
      </div>
    </aside>
  );
}