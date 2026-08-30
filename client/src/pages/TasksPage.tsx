import { useEffect, useState } from 'react';
import { api } from '@/utils/api';
import { useStore } from '@/store';
import { TaskCard } from '@/components/TaskCard';
import clsx from 'clsx';
import type { DownloadTask, TaskStatus } from '@/types';

const TABS: Array<{ key: string; label: string; status?: TaskStatus }> = [
  { key: 'all', label: '全部' },
  { key: 'active', label: '进行中', status: 'downloading' },
  { key: 'parsing', label: '解析中', status: 'parsing' },
  { key: 'waiting', label: '等待', status: 'waiting' },
  { key: 'paused', label: '暂停', status: 'paused' },
  { key: 'completed', label: '已完成', status: 'completed' },
  { key: 'failed', label: '失败', status: 'failed' },
];

export function TasksPage() {
  const tasks = useStore((s) => s.tasks);
  const pushToast = useStore((s) => s.pushToast);
  const removeTask = useStore((s) => s.removeTask);
  const upsertTask = useStore((s) => s.upsertTask);
  const [tab, setTab] = useState('all');
  const [autoScroll, setAutoScroll] = useState(true);

  // Initial fetch (in case WS missed something)
  useEffect(() => {
    let alive = true;
    api.listTasks().then((data) => {
      if (!alive) return;
      for (const t of data) upsertTask(t);
    }).catch(() => {});
    return () => { alive = false; };
  }, [upsertTask]);

  const filtered = tasks.filter((t) => {
    if (tab === 'all') return true;
    if (tab === 'active') return t.status === 'downloading';
    const wanted = TABS.find((x) => x.key === tab)?.status;
    return wanted ? t.status === wanted : true;
  });

  const counts: Record<string, number> = {
    all: tasks.length,
    active: tasks.filter((t) => t.status === 'downloading').length,
    parsing: tasks.filter((t) => t.status === 'parsing').length,
    waiting: tasks.filter((t) => t.status === 'waiting').length,
    paused: tasks.filter((t) => t.status === 'paused').length,
    completed: tasks.filter((t) => t.status === 'completed').length,
    failed: tasks.filter((t) => t.status === 'failed').length,
  };

  const handlePause = async (id: string) => {
    try { await api.pauseTask(id); pushToast({ type: 'info', title: '任务已暂停' }); } catch (e: any) { pushToast({ type: 'error', title: '暂停失败', message: e.message }); }
  };
  const handleResume = async (id: string) => {
    try { await api.resumeTask(id); pushToast({ type: 'success', title: '任务已继续' }); } catch (e: any) { pushToast({ type: 'error', title: '继续失败', message: e.message }); }
  };
  const handleCancel = async (id: string, deleteFile: boolean) => {
    try { await api.cancelTask(id, deleteFile); pushToast({ type: 'info', title: deleteFile ? '已取消并删除文件' : '任务已取消' }); } catch (e: any) { pushToast({ type: 'error', title: '取消失败', message: e.message }); }
  };
  const handleRetry = async (id: string) => {
    try { await api.retryTask(id); pushToast({ type: 'success', title: '正在重试' }); } catch (e: any) { pushToast({ type: 'error', title: '重试失败', message: e.message }); }
  };
  const handleDelete = async (id: string, deleteFile: boolean) => {
    try { 
      if (deleteFile) await api.deleteTask(id, true);
      else await api.deleteTask(id, false);
      removeTask(id);
      pushToast({ type: 'info', title: '已移除', message: deleteFile ? '文件也已删除' : undefined });
    } catch (e: any) { pushToast({ type: 'error', title: '删除失败', message: e.message }); }
  };
  const handleOpen = async (id: string) => {
    const t = tasks.find((x) => x.id === id);
    if (!t?.filePath) return;
    try {
      const r = await api.openFile(t.filePath);
      pushToast({ type: 'success', title: '已找到文件', message: r.path });
    } catch (e: any) {
      pushToast({ type: 'info', title: '文件路径', message: t.filePath });
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">下载任务</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            实时显示下载进度 · 自动恢复中断任务
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
              className="h-4 w-4 rounded border-zinc-300 text-brand-600 focus:ring-brand-500"
            />
            跟随新任务
          </label>
        </div>
      </div>

      <div className="mb-4 flex gap-1 overflow-x-auto scroll-thin">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={clsx(
              'inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition',
              tab === t.key
                ? 'bg-brand-100 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300'
                : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800',
            )}
          >
            {t.label}
            <span
              className={clsx(
                'rounded px-1 text-[10px] font-bold',
                tab === t.key ? 'bg-brand-500 text-white' : 'bg-zinc-200 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300',
              )}
            >
              {counts[t.key] ?? 0}
            </span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-zinc-200 bg-white px-6 py-16 text-center dark:border-zinc-800 dark:bg-surface-dark-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 text-zinc-400 dark:bg-zinc-800">
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M12 4v12m0 0l-4-4m4 4l4-4M4 20h16" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
            {tab === 'all' ? '暂无任务，去首页粘贴视频链接开始吧' : '此分类下没有任务'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((t) => (
            <TaskCard
              key={t.id}
              task={t}
              onPause={handlePause}
              onResume={handleResume}
              onCancel={handleCancel}
              onRetry={handleRetry}
              onDelete={handleDelete}
              onOpen={handleOpen}
            />
          ))}
        </div>
      )}
    </div>
  );
}