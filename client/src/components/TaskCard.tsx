import clsx from 'clsx';
import type { DownloadTask } from '@/types';
import { formatBytes, formatSpeed, formatTime, formatDuration, platformLabel, statusLabel, statusTone } from '@/utils/format';
import { ProgressBar } from './ProgressBar';

interface Props {
  task: DownloadTask;
  onPause: (id: string) => void;
  onResume: (id: string) => void;
  onCancel: (id: string, deleteFile: boolean) => void;
  onRetry: (id: string) => void;
  onDelete: (id: string, deleteFile: boolean) => void;
  onOpen: (id: string) => void;
}

export function TaskCard({ task, onPause, onResume, onCancel, onRetry, onDelete, onOpen }: Props) {
  const tone = statusTone(task.status);
  return (
    <div className="card group transition hover:shadow-lg">
      <div className="flex flex-col gap-4 lg:flex-row">
        <div className="relative h-32 w-full shrink-0 overflow-hidden rounded-xl bg-zinc-100 dark:bg-zinc-800 lg:h-24 lg:w-44">
          {task.thumbnail ? (
            <img src={task.thumbnail} alt="" className="h-full w-full object-cover" loading="lazy" />
          ) : (
            <div className="flex h-full items-center justify-center text-zinc-400">
              <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <path d="M10 9l5 3-5 3V9z" fill="currentColor" />
              </svg>
            </div>
          )}
          <div className="absolute bottom-1 right-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-medium text-white">
            {task.quality} · {task.format.toUpperCase()}
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className="rounded-md px-2 py-0.5 text-[11px] font-medium text-white"
                  style={{ background: task.platform === 'x' || task.platform === 'tiktok' ? '#0f172a' : undefined }}
                >
                  {platformLabel(task.platform)}
                </span>
                <span className={clsx('badge', tone.bg, tone.text)}>
                  <span className={clsx('h-1.5 w-1.5 rounded-full', tone.dot)} />
                  {statusLabel(task.status)}
                </span>
                {task.retryCount > 0 && (
                  <span className="badge bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                    重试 {task.retryCount}
                  </span>
                )}
              </div>
              <h3 className="mt-1.5 line-clamp-2 text-base font-semibold text-zinc-900 dark:text-zinc-100">
                {task.title}
              </h3>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400">
                {task.author && <span>{task.author}</span>}
                {task.duration > 0 && <span>时长 {formatDuration(task.duration)}</span>}
                <span>{formatBytes(task.fileSize)}</span>
              </div>
            </div>
          </div>

          <div className="mt-3">
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <span className="tabular text-zinc-600 dark:text-zinc-400">
                {task.status === 'completed'
                  ? '已完成'
                  : task.status === 'failed'
                    ? `失败 · ${task.errorMessage || '未知错误'}`
                    : task.status === 'cancelled'
                      ? '已取消'
                      : `${task.progress.toFixed(1)}%`}
              </span>
              {(task.status === 'downloading' || task.status === 'parsing') && (
                <span className="tabular text-zinc-500 dark:text-zinc-400">
                  {formatSpeed(task.speed)} · 剩余 {formatTime(task.eta)}
                </span>
              )}
            </div>
            <ProgressBar value={task.progress} status={task.status} />
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {(task.status === 'downloading' || task.status === 'parsing') && (
              <button onClick={() => onPause(task.id)} className="btn-ghost text-xs">
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
                暂停
              </button>
            )}
            {task.status === 'paused' && (
              <button onClick={() => onResume(task.id)} className="btn-primary text-xs">
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                继续
              </button>
            )}
            {(task.status === 'failed' || task.status === 'cancelled') && (
              <button onClick={() => onRetry(task.id)} className="btn-secondary text-xs">
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12a9 9 0 0115-6.7L21 8M21 3v5h-5M21 12a9 9 0 01-15 6.7L3 16M3 21v-5h5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                重试
              </button>
            )}
            {['downloading', 'parsing', 'paused', 'waiting'].includes(task.status) && (
              <button onClick={() => onCancel(task.id, false)} className="btn-ghost text-xs">
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="1" /></svg>
                取消
              </button>
            )}
            {task.status === 'completed' && task.filePath && (
              <>
                <button onClick={() => onOpen(task.id)} className="btn-secondary text-xs">
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 7l6 6-6 6M21 7l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  打开文件
                </button>
                <button onClick={() => onDelete(task.id, true)} className="btn-ghost text-xs hover:text-red-600">
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  删除文件
                </button>
              </>
            )}
            <button
              onClick={() => onDelete(task.id, false)}
              className="ml-auto text-xs text-zinc-400 hover:text-red-500"
            >
              移除
            </button>
          </div>
          {task.errorMessage && task.status === 'failed' && (
            <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
              <span className="font-semibold">失败原因：</span> {task.errorMessage}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}