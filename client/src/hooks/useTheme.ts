import { useEffect } from 'react';
import { useStore } from '@/store';

function applyTheme(theme: string) {
  const root = document.documentElement;
  const apply = (mode: 'light' | 'dark') => {
    if (mode === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
  };
  if (theme === 'system') {
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    apply(mql.matches ? 'dark' : 'light');
    const handler = (e: MediaQueryListEvent) => apply(e.matches ? 'dark' : 'light');
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }
  apply(theme as 'light' | 'dark');
}

export function useTheme() {
  const theme = useStore((s) => s.theme);
  useEffect(() => {
    const cleanup = applyTheme(theme);
    return cleanup;
  }, [theme]);
}