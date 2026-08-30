import { useEffect, useState } from 'react';
import { api } from '@/utils/api';
import { useStore } from '@/store';
import { formatBytes, formatDate, platformColor, platformLabel, statusLabel, statusTone } from '@/utils/format';
import { TaskCard } from '@/components/TaskCard';
import clsx from 'clsx';
import type { StatsData } from '@/types';

export function DashboardPage() {
  const stats = useStore((s) => s.stats);
  const setStats = useStore((s) => s.setStats);
  const pushToast = useStore((s) => s.pushToast);
  const removeTask = useStore((s) => s.removeTask);
  const upsertTask = useStore((s) => s.upsertTask);

  const refresh = async () => {
    try {
      const data = await api.stats();
      setStats(data);
    } catch (e) {
      // ignore
    }
  };

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 4000);
    return () => clearInterval(t);
  }, []);

  const handlePause = async (id: string) => { try { await api.pauseTask(id); } catch (e: any) { pushToast({ type: 'error', title: '暂停失败', message: e.message }); } };
  const handleResume = async (id: string) => { try { await api.resumeTask(id); } catch (e: any) { pushToast({ type: 'error', title: '继续失败', message: e.message }); } };
  const handleCancel = async (id: string, deleteFile: boolean) => { try { await api.cancelTask(id, deleteFile); } catch (e: any) { pushToast({ type: 'error', title: '取消失败', message: e.message }); } };
  const handleRetry = async (id: string) => { try { await api.retryTask(id); } catch (e: any) { pushToast({ type: 'error', title: '重试失败', message: e.message }); } };
  const handleDelete = async (id: string, deleteFile: boolean) => {
    try { await api.deleteTask(id, deleteFile); removeTask(id); } catch (e: any) { pushToast({ type: 'error', title: '删除失败', message: e.message }); }
  };
  const handleOpen = async (id: string) => {
    const t = stats?.recentTasks.find((x) => x.id === id);
    if (!t?.filePath) return;
    pushToast({ type: 'info', title: '文件路径', message: t.filePath });
  };

  const data: StatsData | null = stats;
  const platforms = Object.entries(data?.platformDistribution || {});
  const platformTotal = platforms.reduce((sum, [, n]) => sum + n, 0);
  const maxDaily = Math.max(1, ...(data?.dailyDownloads || []).map((d) => d.count));

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-5">
        <h1 className="text-2xl font-bold tracking-tight">数据看板</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">所有下载活动的实时统计</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="今日任务" value={data?.todayTasks ?? 0} accent="text-brand-600 dark:text-brand-400" />
        <StatCard label="已完成" value={data?.completedToday ?? 0} accent="text-emerald-600 dark:text-emerald-400" />
        <StatCard label="下载中" value={data?.downloading ?? 0} accent="text-amber-600 dark:text-amber-400" />
        <StatCard label="失败" value={data?.failedToday ?? 0} accent="text-red-600 dark:text-red-400" />
        <StatCard label="累计下载" value={formatBytes(data?.totalDownloaded ?? 0)} accent="text-zinc-900 dark:text-white" small />
        <StatCard label="累计任务" value={data?.totalTasks ?? 0} accent="text-zinc-900 dark:text-white" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="card lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold">每日下载量</h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">最近 7 天</p>
            </div>
          </div>
          <div className="flex h-48 items-end gap-2 sm:gap-3">
            {(data?.dailyDownloads || []).map((d) => {
              const h = (d.count / maxDaily) * 100;
              return (
                <div key={d.date} className="flex flex-1 flex-col items-center gap-2">
                  <div className="flex h-full w-full items-end">
                    <div
                      className="relative w-full rounded-t-md bg-gradient-to-t from-brand-500 to-brand-400 transition-all"
                      style={{ height: `${Math.max(h, 4)}%` }}
                      title={`${d.date} · ${d.count} 个任务 · ${formatBytes(d.bytes)}`}
                    />
                  </div>
                  <div className="text-center text-[10px] text-zinc-500 dark:text-zinc-400">
                    {d.date.slice(5)}
                  </div>
                  <div className="text-center text-[10px] font-medium tabular text-zinc-700 dark:text-zinc-300">
                    {d.count}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card">
          <div className="mb-4">
            <h2 className="text-base font-semibold">成功率</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">所有已完成 / 全部任务</p>
          </div>
          <div className="flex items-end gap-3">
            <div className="text-5xl font-bold tabular text-emerald-600 dark:text-emerald-400">
              {data?.successRate ?? 0}
              <span className="text-2xl">%</span>
            </div>
          </div>
          <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
            <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all" style={{ width: `${data?.successRate ?? 0}%` }} />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 border-t border-zinc-100 pt-4 text-xs dark:border-zinc-800">
            <div>
              <div className="text-zinc-500">总数据</div>
              <div className="mt-0.5 font-semibold">{formatBytes(data?.totalDownloaded ?? 0)}</div>
            </div>
            <div>
              <div className="text-zinc-500">总任务</div>
              <div className="mt-0.5 font-semibold">{data?.totalTasks ?? 0}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="card lg:col-span-1">
          <div className="mb-4">
            <h2 className="text-base font-semibold">平台分布</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">各平台任务数</p>
          </div>
          {platforms.length === 0 ? (
            <div className="py-8 text-center text-sm text-zinc-400">暂无数据</div>
          ) : (
            <div className="space-y-3">
              {platforms.map(([p, n]) => {
                const pct = platformTotal > 0 ? Math.round((n / platformTotal) * 100) : 0;
                return (
                  <div key={p}>
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: platformColor(p) }} />
                        <span>{platformLabel(p)}</span>
                      </div>
                      <div className="tabular text-zinc-500">{n} · {pct}%</div>
                    </div>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: platformColor(p) }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="card lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold">最近任务</h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">最近 8 个下载活动</p>
            </div>
          </div>
          {(data?.recentTasks || []).length === 0 ? (
            <div className="py-8 text-center text-sm text-zinc-400">暂无任务</div>
          ) : (
            <div className="space-y-2">
              {data?.recentTasks.map((t) => {
                const tone = statusTone(t.status);
                return (
                  <div key={t.id} className="flex items-center gap-3 rounded-lg border border-zinc-100 px-3 py-2 dark:border-zinc-800">
                    <div className="h-10 w-16 shrink-0 overflow-hidden rounded bg-zinc-100 dark:bg-zinc-800">
                      {t.thumbnail ? (
                        <img src={t.thumbnail} alt="" className="h-full w-full object-cover" />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="line-clamp-1 text-sm font-medium">{t.title}</div>
                      <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                        {platformLabel(t.platform)} · {t.quality} · {formatBytes(t.fileSize)}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={clsx('badge', tone.bg, tone.text)}>
                        {statusLabel(t.status)}
                      </span>
                      <div className="mt-0.5 text-[10px] text-zinc-400">{formatDate(t.createdAt)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, accent, small }: { label: string; value: number | string; accent: string; small?: boolean }) {
  return (
    <div className="card">
      <div className="label">{label}</div>
      <div className={clsx('mt-1.5 font-bold tabular', accent, small ? 'text-xl' : 'text-3xl')}>
        {value}
      </div>
    </div>
  );
}