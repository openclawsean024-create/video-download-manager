import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/utils/api';
import { useStore } from '@/store';
import { platformLabel } from '@/utils/format';
import clsx from 'clsx';
import type { VideoInfo, VideoQuality, VideoFormat } from '@/types';

const PLATFORM_HINTS: Array<{ platform: string; label: string; color: string }> = [
  { platform: 'youtube', label: 'YouTube', color: '#FF0000' },
  { platform: 'bilibili', label: 'Bilibili', color: '#FB7299' },
  { platform: 'vimeo', label: 'Vimeo', color: '#1AB7EA' },
  { platform: 'x', label: 'X (Twitter)', color: '#0f172a' },
  { platform: 'tiktok', label: 'TikTok', color: '#0f172a' },
  { platform: 'instagram', label: 'Instagram', color: '#E1306C' },
];

export function HomePage() {
  const [url, setUrl] = useState('');
  const [parsing, setParsing] = useState(false);
  const [info, setInfo] = useState<VideoInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [quality, setQuality] = useState<VideoQuality>('1080P');
  const [format, setFormat] = useState<VideoFormat>('mp4');
  const [adding, setAdding] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const pushToast = useStore((s) => s.pushToast);

  useEffect(() => {
    if (info?.defaults) {
      setQuality(info.defaults.quality);
      setFormat(info.defaults.format);
    }
  }, [info]);

  const submit = async (input?: string) => {
    const target = (input ?? url).trim();
    if (!target) {
      setError('请输入视频链接');
      return;
    }
    setParsing(true);
    setError(null);
    setInfo(null);
    try {
      const data = await api.parse(target);
      setInfo(data);
      setUrl(target);
    } catch (e: any) {
      setError(e.message || '解析失败');
      setInfo(null);
    } finally {
      setParsing(false);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const text = e.dataTransfer.getData('text') || e.dataTransfer.getData('text/plain') || e.dataTransfer.getData('URL');
    if (text) {
      setUrl(text.trim());
      submit(text.trim());
    }
  };

  const addToQueue = async () => {
    if (!info) return;
    setAdding(true);
    try {
      await api.createTask({ url: info.url, quality, format });
      pushToast({ type: 'success', title: '已加入下载队列', message: info.title });
      setInfo(null);
      setUrl('');
      navigate('/tasks');
    } catch (e: any) {
      pushToast({ type: 'error', title: '加入队列失败', message: e.message });
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14 lg:py-20">
      <div className="text-center">
        <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white/70 px-3 py-1 text-zinc-500 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/70 dark:text-zinc-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          支持 6 大公开平台 · 本地运行
        </div>
        <h1 className="mt-5 bg-gradient-to-br from-zinc-900 to-zinc-600 bg-clip-text text-3xl font-bold leading-tight tracking-tight text-transparent dark:from-white dark:to-zinc-400 sm:text-4xl lg:text-5xl">
          在线视频下载管理器
        </h1>
        <p className="mt-3 text-base text-zinc-500 dark:text-zinc-400 sm:text-lg">
          统一管理你的在线视频下载任务
        </p>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={onDrop}
        className={clsx(
          'group relative mt-10 overflow-hidden rounded-2xl border-2 border-dashed bg-white p-2 shadow-soft transition-all dark:bg-surface-dark-3',
          dragActive ? 'border-brand-500 ring-4 ring-brand-500/15' : 'border-zinc-300 dark:border-zinc-700',
        )}
      >
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            ref={inputRef}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            placeholder="粘贴视频链接，例如 https://www.youtube.com/watch?v=..."
            className="w-full flex-1 rounded-xl border border-zinc-200 bg-zinc-50 px-5 py-4 text-base placeholder-zinc-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 dark:border-zinc-700 dark:bg-zinc-900 dark:placeholder-zinc-500"
          />
          <button onClick={() => submit()} disabled={parsing} className="btn-primary px-6 py-4 text-base">
            {parsing ? (
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
                <path d="M12 2a10 10 0 0110 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
              </svg>
            ) : (
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 21l-4.35-4.35M11 19a8 8 0 110-16 8 8 0 010 16z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
            解析视频
          </button>
        </div>
        <div className="mt-2 px-4 text-xs text-zinc-400 dark:text-zinc-500">
          支持拖拽链接到此处
        </div>
      </div>

      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          <svg className="mt-0.5 h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2a10 10 0 100 20 10 10 0 000-20zm0 13a1 1 0 110 2 1 1 0 010-2zm-1-8a1 1 0 112 0v5a1 1 0 11-2 0V7z" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        {PLATFORM_HINTS.map((p) => (
          <button
            key={p.platform}
            onClick={() => {
              const sample = {
                youtube: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
                bilibili: 'https://www.bilibili.com/video/BV1GJ411x7h7',
                vimeo: 'https://vimeo.com/76979871',
                x: 'https://x.com/YouTube/status/1692930348004733237',
                tiktok: 'https://www.tiktok.com/@scout2015/video/6718335390845095173',
                instagram: 'https://www.instagram.com/p/CK3q2QzL9jm/',
              }[p.platform] || '';
              if (sample) {
                setUrl(sample);
                submit(sample);
              }
            }}
            className="group inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-600 transition hover:border-zinc-300 hover:shadow-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
          >
            <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
            {p.label}
          </button>
        ))}
      </div>

      {info && (
        <div className="mt-8 animate-slide-up">
          <div className="card overflow-hidden p-0">
            <div className="flex flex-col md:flex-row">
              <div className="relative aspect-video w-full bg-zinc-100 dark:bg-zinc-800 md:w-2/5">
                {info.thumbnail ? (
                  <img src={info.thumbnail} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-zinc-400">无预览</div>
                )}
                <div className="absolute left-3 top-3 rounded-md bg-black/70 px-2 py-1 text-xs text-white">
                  {platformLabel(info.platform)}
                </div>
              </div>
              <div className="flex-1 p-5 md:p-6">
                <h2 className="line-clamp-2 text-lg font-semibold">{info.title}</h2>
                {info.author && (
                  <div className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                    {info.author}
                    {info.duration > 0 && (
                      <span className="ml-2">· {Math.floor(info.duration / 60)}:{(info.duration % 60).toString().padStart(2, '0')}</span>
                    )}
                  </div>
                )}
                {info.hint && (
                  <div className="mt-3 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-400">
                    {info.hint}
                  </div>
                )}
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div>
                    <div className="label">质量</div>
                    <select
                      value={quality}
                      onChange={(e) => setQuality(e.target.value as VideoQuality)}
                      className="input mt-1"
                    >
                      {info.qualities.map((q) => (
                        <option key={q} value={q}>
                          {q}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <div className="label">格式</div>
                    <select
                      value={format}
                      onChange={(e) => setFormat(e.target.value as VideoFormat)}
                      className="input mt-1"
                    >
                      {info.formats.map((f) => (
                        <option key={f} value={f}>
                          {f.toUpperCase()}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2 flex flex-col">
                    <div className="label">预估大小</div>
                    <div className="mt-1 flex h-[38px] items-center rounded-lg border border-zinc-200 bg-zinc-50 px-3 text-sm tabular text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                      {info.estimatedSize ? `${(info.estimatedSize / 1024 / 1024).toFixed(1)} MB` : '—'}
                    </div>
                  </div>
                </div>
                <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
                  <button onClick={() => setInfo(null)} className="btn-ghost">
                    取消
                  </button>
                  <button onClick={addToQueue} disabled={adding} className="btn-primary flex-1 sm:flex-none sm:px-8">
                    {adding ? '加入中...' : '加入下载队列'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}