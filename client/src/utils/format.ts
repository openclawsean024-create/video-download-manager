export function formatBytes(bytes: number, decimals = 1): string {
  if (!bytes || bytes < 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let v = bytes / 1024;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(decimals)} ${units[i]}`;
}

export function formatSpeed(bytesPerSec: number): string {
  if (!bytesPerSec || bytesPerSec <= 0) return '—';
  return `${formatBytes(bytesPerSec)}/s`;
}

export function formatTime(seconds: number): string {
  if (!seconds || seconds < 0 || !Number.isFinite(seconds)) return '—';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function formatDuration(seconds: number): string {
  if (!seconds || seconds < 0) return '—';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function formatDate(ts: number | undefined): string {
  if (!ts) return '—';
  const d = new Date(ts);
  const now = new Date();
  const diff = (now.getTime() - d.getTime()) / 1000;
  if (diff < 60) return '刚刚';
  if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)} 天前`;
  return d.toLocaleString('zh-CN', { hour12: false });
}

export function formatDateFull(ts: number | undefined): string {
  if (!ts) return '—';
  return new Date(ts).toLocaleString('zh-CN', { hour12: false });
}

export function platformLabel(p: string): string {
  const map: Record<string, string> = {
    youtube: 'YouTube',
    bilibili: 'Bilibili',
    vimeo: 'Vimeo',
    x: 'X',
    tiktok: 'TikTok',
    instagram: 'Instagram',
    unknown: 'Unknown',
  };
  return map[p] || p;
}

export function platformColor(p: string): string {
  const map: Record<string, string> = {
    youtube: '#FF0000',
    bilibili: '#FB7299',
    vimeo: '#1AB7EA',
    x: '#0f172a',
    tiktok: '#0f172a',
    instagram: '#E1306C',
    unknown: '#71717a',
  };
  return map[p] || '#71717a';
}

export function statusLabel(s: string): string {
  const map: Record<string, string> = {
    waiting: '等待中',
    parsing: '解析中',
    downloading: '下载中',
    paused: '已暂停',
    completed: '已完成',
    failed: '失败',
    cancelled: '已取消',
  };
  return map[s] || s;
}

export function statusTone(s: string): { bg: string; text: string; dot: string } {
  const map: Record<string, { bg: string; text: string; dot: string }> = {
    waiting: { bg: 'bg-zinc-100 dark:bg-zinc-800', text: 'text-zinc-700 dark:text-zinc-300', dot: 'bg-zinc-400' },
    parsing: { bg: 'bg-amber-50 dark:bg-amber-500/10', text: 'text-amber-700 dark:text-amber-300', dot: 'bg-amber-500' },
    downloading: { bg: 'bg-brand-50 dark:bg-brand-500/10', text: 'text-brand-700 dark:text-brand-300', dot: 'bg-brand-500 animate-pulse' },
    paused: { bg: 'bg-orange-50 dark:bg-orange-500/10', text: 'text-orange-700 dark:text-orange-300', dot: 'bg-orange-500' },
    completed: { bg: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-700 dark:text-emerald-300', dot: 'bg-emerald-500' },
    failed: { bg: 'bg-red-50 dark:bg-red-500/10', text: 'text-red-700 dark:text-red-300', dot: 'bg-red-500' },
    cancelled: { bg: 'bg-zinc-100 dark:bg-zinc-800', text: 'text-zinc-500 dark:text-zinc-400', dot: 'bg-zinc-400' },
  };
  return map[s] || map.waiting;
}