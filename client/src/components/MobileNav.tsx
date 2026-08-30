import { Link, useLocation } from 'react-router-dom';
import clsx from 'clsx';
import { useStore } from '@/store';

export function MobileNav() {
  const loc = useLocation();
  const active = useStore((s) => s.tasks.filter((t) => t.status === 'downloading' || t.status === 'parsing').length);
  const items = [
    { to: '/', label: '首页' },
    { to: '/tasks', label: '任务', badge: active },
    { to: '/history', label: '历史' },
    { to: '/dashboard', label: '数据' },
    { to: '/settings', label: '设置' },
  ];
  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-zinc-200 bg-white/95 backdrop-blur lg:hidden dark:border-zinc-800 dark:bg-surface-dark-3/95">
      <div className="grid grid-cols-5">
        {items.map((it) => {
          const isActive = it.to === '/' ? loc.pathname === '/' : loc.pathname.startsWith(it.to);
          return (
            <Link
              key={it.to}
              to={it.to}
              className={clsx(
                'relative flex flex-col items-center justify-center gap-0.5 py-2.5 text-[11px] font-medium transition',
                isActive ? 'text-brand-600 dark:text-brand-400' : 'text-zinc-500 dark:text-zinc-400',
              )}
            >
              <span>{it.label}</span>
              {!!(it.badge && it.badge > 0) && (
                <span className="absolute right-3 top-1 rounded-full bg-brand-500 px-1 text-[9px] font-bold text-white">
                  {it.badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}