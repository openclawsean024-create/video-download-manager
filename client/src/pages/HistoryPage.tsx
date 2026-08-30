import { useEffect, useMemo, useState } from 'react';
import { api } from '@/utils/api';
import { useStore } from '@/store';
import { formatBytes, formatDateFull, platformLabel, statusLabel, statusTone } from '@/utils/format';
import { Modal } from '@/components/Modal';
import clsx from 'clsx';

const PLATFORMS = ['all', 'youtube', 'bilibili', 'vimeo', 'x', 'tiktok', 'instagram'];
const STATUSES = ['all', 'completed', 'failed', 'cancelled', 'paused'];

export function HistoryPage() {
  const tasks = useStore((s) => s.tasks);
  const setTasks = useStore((s) => s.setTasks);
  const pushToast = useStore((s) => s.pushToast);
  const removeTask = useStore((s) => s.removeTask);
  const upsertTask = useStore((s) => s.upsertTask);
  const [search, setSearch] = useState('');
  const [platform, setPlatform] = useState('all');
  const [status, setStatus] = useState('all');
  const [sortBy, setSortBy] = useState<'time' | 'size'>('time');
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; title: string } | null>(null);

  useEffect(() => {
    api.listTasks().then((data) => setTasks(data)).catch(() => {});
  }, [setTasks]);

  const filtered = useMemo(() => {
    let list = tasks.slice();
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (t) => t.title.toLowerCase().includes(q) || t.author?.toLowerCase().includes(q) || t.url.toLowerCase().includes(q),
      );
    }
    if (platform !== 'all') list = list.filter((t) => t.platform === platform);
    if (status !== 'all') list = list.filter((t) => t.status === status);
    list.sort((a, b) => (sortBy === 'time' ? b.createdAt - a.createdAt : b.fileSize - a.fileSize));
    return list;
  }, [tasks, search, platform, status, sortBy]);

  const handleDelete = async (id: string) => {
    try {
      await api.deleteTask(id, false);
      removeTask(id);
      pushToast({ type: 'info', title: '已从历史中移除' });
    } catch (e: any) {
      pushToast({ type: 'error', title: '删除失败', message: e.message });
    }
  };

  const handleDeleteWithFile = async (id: string) => {
    const t = tasks.find((x) => x.id === id);
    try {
      await api.deleteTask(id, true);
      removeTask(id);
      pushToast({ type: 'info', title: '已删除任务与文件' });
    } catch (e: any) {
      pushToast({ type: 'error', title: '删除失败', message: e.message });
    }
  };

  const handleRetry = async (id: string) => {
    try { await api.retryTask(id); pushToast({ type: 'success', title: '已重新加入队列' }); } catch (e: any) { pushToast({ type: 'error', title: '重试失败', message: e.message }); }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">下载历史</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">查看所有下载记录，支持搜索、筛选与排序</p>
        </div>
      </div>

      <div className="card mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 21l-4.35-4.35M11 19a8 8 0 110-16 8 8 0 010 16z" strokeLinecap="round" strokeLinejoin="round" /></svg>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索标题、作者或链接"
              className="input pl-9"
            />
          </div>
        </div>
        <select value={platform} onChange={(e) => setPlatform(e.target.value)} className="input">
          {PLATFORMS.map((p) => (
            <option key={p} value={p}>{p === 'all' ? '全部平台' : platformLabel(p)}</option>
          ))}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="input">
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s === 'all' ? '全部状态' : statusLabel(s)}</option>
          ))}
        </select>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} className="input">
          <option value="time">按时间排序</option>
          <option value="size">按大小排序</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-zinc-200 bg-white px-6 py-16 text-center dark:border-zinc-800 dark:bg-surface-dark-3">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">暂无记录</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-surface-dark-3">
          <div className="hidden border-b border-zinc-200 bg-zinc-50 px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-zinc-500 lg:grid lg:grid-cols-[1fr_120px_120px_90px_120px_120px_60px] lg:gap-3 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-400">
            <div>视频</div>
            <div>平台</div>
            <div>状态</div>
            <div>大小</div>
            <div>时间</div>
            <div>路径</div>
            <div></div>
          </div>
          {filtered.map((t) => {
            const tone = statusTone(t.status);
            return (
              <div key={t.id} className="border-b border-zinc-100 px-4 py-3 last:border-b-0 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900/30">
                <div className="flex flex-col gap-3 lg:grid lg:grid-cols-[1fr_120px_120px_90px_120px_120px_60px] lg:items-center lg:gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="h-12 w-20 shrink-0 overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800">
                      {t.thumbnail ? (
                        <img src={t.thumbnail} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-zinc-400">
                          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="5" width="18" height="14" rx="2" /></svg>
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="line-clamp-1 text-sm font-medium">{t.title}</div>
                      <div className="line-clamp-1 text-xs text-zinc-500 dark:text-zinc-400">
                        {t.quality} · {t.format.toUpperCase()}
                      </div>
                    </div>
                  </div>
                  <div className="text-sm">{platformLabel(t.platform)}</div>
                  <div>
                    <span className={clsx('badge', tone.bg, tone.text)}>
                      <span className={clsx('h-1.5 w-1.5 rounded-full', tone.dot)} />
                      {statusLabel(t.status)}
                    </span>
                  </div>
                  <div className="text-sm tabular text-zinc-600 dark:text-zinc-300">{formatBytes(t.fileSize)}</div>
                  <div className="text-xs text-zinc-500 dark:text-zinc-400">{formatDateFull(t.completedAt || t.updatedAt)}</div>
                  <div className="line-clamp-1 text-xs text-zinc-400" title={t.filePath || ''}>
                    {t.filePath ? t.filePath.split('/').pop() : '—'}
                  </div>
                  <div className="flex items-center justify-end gap-1">
                    {(t.status === 'failed' || t.status === 'cancelled') && (
                      <button onClick={() => handleRetry(t.id)} className="rounded p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-brand-600 dark:hover:bg-zinc-800" title="重试">
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12a9 9 0 0115-6.7L21 8M21 3v5h-5M21 12a9 9 0 01-15 6.7L3 16M3 21v-5h5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      </button>
                    )}
                    <button
                      onClick={() => setConfirmDelete({ id: t.id, title: t.title })}
                      className="rounded p-1.5 text-zinc-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
                      title="删除"
                    >
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="删除任务"
        footer={
          <>
            <button onClick={() => setConfirmDelete(null)} className="btn-ghost">取消</button>
            <button
              onClick={() => {
                if (confirmDelete) {
                  handleDelete(confirmDelete.id);
                  setConfirmDelete(null);
                }
              }}
              className="btn-secondary"
            >
              仅删除记录
            </button>
            <button
              onClick={() => {
                if (confirmDelete) {
                  handleDeleteWithFile(confirmDelete.id);
                  setConfirmDelete(null);
                }
              }}
              className="btn-danger"
            >
              同时删除文件
            </button>
          </>
        }
      >
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          你可以选择仅删除历史记录（保留已下载的文件），或同时删除视频文件。
        </p>
        <div className="mt-3 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800/50">
          {confirmDelete?.title}
        </div>
      </Modal>
    </div>
  );
}