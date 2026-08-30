import { useEffect, useState } from 'react';
import { api } from '@/utils/api';
import { useStore } from '@/store';
import { formatBytes } from '@/utils/format';
import clsx from 'clsx';
import type { SettingsData, SystemInfo, VideoQuality, VideoFormat } from '@/types';

const QUALITY_OPTIONS: VideoQuality[] = ['8K', '4K', '1440P', '1080P', '720P', '480P', '360P', '240P', 'audio'];
const FORMAT_OPTIONS: VideoFormat[] = ['mp4', 'webm', 'mkv', 'mov', 'mp3', 'm4a'];
const CONCURRENCY_OPTIONS = [1, 2, 3, 5, 10];

export function SettingsPage() {
  const settings = useStore((s) => s.settings);
  const setSettings = useStore((s) => s.setSettings);
  const system = useStore((s) => s.system);
  const setSystem = useStore((s) => s.setSystem);
  const theme = useStore((s) => s.theme);
  const setTheme = useStore((s) => s.setTheme);
  const pushToast = useStore((s) => s.pushToast);
  const [form, setForm] = useState<Partial<SettingsData>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.settings().then(setSettings).catch(() => {});
    api.system().then(setSystem).catch(() => {});
  }, []);

  useEffect(() => {
    if (settings) setForm(settings);
  }, [settings]);

  const update = <K extends keyof SettingsData>(k: K, v: SettingsData[K]) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      await api.updateSettings(form);
      const fresh = await api.settings();
      setSettings(fresh);
      pushToast({ type: 'success', title: '设置已保存' });
    } catch (e: any) {
      pushToast({ type: 'error', title: '保存失败', message: e.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-5">
        <h1 className="text-2xl font-bold tracking-tight">设置</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">个性化下载偏好与系统参数</p>
      </div>

      <Section title="下载设置" description="默认的视频质量和并发数">
        <Row label="默认质量" hint="新建任务时默认选择">
          <select className="input max-w-[160px]" value={form.defaultQuality} onChange={(e) => update('defaultQuality', e.target.value as VideoQuality)}>
            {QUALITY_OPTIONS.map((q) => <option key={q} value={q}>{q}</option>)}
          </select>
        </Row>
        <Row label="默认格式" hint="新建任务时默认文件格式">
          <select className="input max-w-[160px]" value={form.defaultFormat} onChange={(e) => update('defaultFormat', e.target.value as VideoFormat)}>
            {FORMAT_OPTIONS.map((f) => <option key={f} value={f}>{f.toUpperCase()}</option>)}
          </select>
        </Row>
        <Row label="最大并发任务" hint="同时下载的文件数量">
          <select className="input max-w-[160px]" value={form.maxConcurrent} onChange={(e) => update('maxConcurrent', Number(e.target.value))}>
            {CONCURRENCY_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </Row>
        <Row label="默认保存目录" hint="下载文件的本地保存路径">
          <input className="input flex-1" value={form.downloadDir || ''} onChange={(e) => update('downloadDir', e.target.value)} />
        </Row>
      </Section>

      <Section title="网络设置" description="连接、速度与重试策略">
        <Row label="最大下载速度 (MB/s)" hint="0 表示不限速">
          <input
            type="number"
            min={0}
            className="input max-w-[160px]"
            value={form.maxSpeedMbps ?? 0}
            onChange={(e) => update('maxSpeedMbps', Number(e.target.value))}
          />
        </Row>
        <Row label="请求超时 (ms)" hint="网络请求最长等待时间">
          <input
            type="number"
            min={1000}
            className="input max-w-[160px]"
            value={form.requestTimeoutMs ?? 30000}
            onChange={(e) => update('requestTimeoutMs', Number(e.target.value))}
          />
        </Row>
        <Row label="自动重试次数" hint="失败任务自动重试次数">
          <input
            type="number"
            min={0}
            max={100}
            className="input max-w-[160px]"
            value={form.maxRetries ?? 3}
            onChange={(e) => update('maxRetries', Number(e.target.value))}
          />
        </Row>
      </Section>

      <Section title="外观" description="界面主题">
        <div className="grid grid-cols-3 gap-2">
          {(['light', 'dark', 'system'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTheme(t)}
              className={clsx(
                'flex flex-col items-center gap-2 rounded-xl border p-4 text-sm transition',
                theme === t
                  ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300'
                  : 'border-zinc-200 hover:border-zinc-300 dark:border-zinc-700',
              )}
            >
              <div className="flex h-12 w-full overflow-hidden rounded-md border border-zinc-200 dark:border-zinc-700">
                <div className={clsx('flex-1', t === 'dark' ? 'bg-zinc-900' : 'bg-white')} />
                <div className={clsx('w-1/2', t === 'light' ? 'bg-white' : 'bg-zinc-900')} />
              </div>
              {t === 'light' ? 'Light Mode' : t === 'dark' ? 'Dark Mode' : 'System'}
            </button>
          ))}
        </div>
      </Section>

      <Section title="系统" description="环境与运行状态">
        <SystemRow label="当前版本" value="v1.0.0" />
        <SystemRow label="Node.js" value={system?.nodeVersion || '—'} />
        <SystemRow label="运行环境" value={`${system?.platform || '—'} · ${system?.arch || ''}`} />
        <SystemRow label="CPU 核心" value={String(system?.cpus ?? '—')} />
        <SystemRow label="内存" value={system ? `${formatBytes(system.memory.free)} / ${formatBytes(system.memory.total)}` : '—'} />
        <SystemRow
          label="下载目录"
          value={system?.downloadDir || '—'}
          status={system?.downloadDirExists ? 'ok' : 'error'}
          statusText={system?.downloadDirExists ? '可访问' : '不存在'}
        />
        <SystemRow
          label="数据库"
          value={system?.dbPath || '—'}
          status={system?.dbExists ? 'ok' : 'error'}
          statusText={system?.dbExists ? '正常' : '异常'}
        />
        <SystemRow
          label="磁盘剩余"
          value={system ? `${system.disk.freeGB} GB / ${system.disk.totalGB} GB` : '—'}
          status={system && system.disk.freeGB > 1 ? 'ok' : 'warning'}
          statusText={system && system.disk.freeGB > 1 ? '充足' : '紧张'}
        />
      </Section>

      <div className="mt-6 flex justify-end">
        <button onClick={save} disabled={saving} className="btn-primary px-6">
          {saving ? '保存中...' : '保存设置'}
        </button>
      </div>
    </div>
  );
}

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="card mb-4">
      <div className="mb-4">
        <h2 className="text-base font-semibold">{title}</h2>
        {description && <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{description}</p>}
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-1 sm:grid-cols-[200px_1fr] sm:items-center sm:gap-4">
      <div>
        <div className="text-sm font-medium">{label}</div>
        {hint && <div className="text-xs text-zinc-500 dark:text-zinc-400">{hint}</div>}
      </div>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  );
}

function SystemRow({ label, value, status, statusText }: { label: string; value: string; status?: 'ok' | 'warning' | 'error'; statusText?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-zinc-100 pb-3 last:border-b-0 last:pb-0 dark:border-zinc-800">
      <div className="text-sm text-zinc-600 dark:text-zinc-400">{label}</div>
      <div className="flex items-center gap-2">
        <code className="rounded bg-zinc-100 px-2 py-1 text-xs dark:bg-zinc-800">{value}</code>
        {status && (
          <span
            className={clsx(
              'badge',
              status === 'ok' && 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300',
              status === 'warning' && 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300',
              status === 'error' && 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300',
            )}
          >
            <span
              className={clsx(
                'h-1.5 w-1.5 rounded-full',
                status === 'ok' && 'bg-emerald-500',
                status === 'warning' && 'bg-amber-500',
                status === 'error' && 'bg-red-500',
              )}
            />
            {statusText}
          </span>
        )}
      </div>
    </div>
  );
}