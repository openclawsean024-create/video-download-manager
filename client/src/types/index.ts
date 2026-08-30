export type Platform = 'youtube' | 'bilibili' | 'vimeo' | 'x' | 'tiktok' | 'instagram' | 'unknown';

export type TaskStatus =
  | 'waiting'
  | 'parsing'
  | 'downloading'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type VideoFormat = 'mp4' | 'webm' | 'mkv' | 'mov' | 'mp3' | 'm4a';

export type VideoQuality = '8K' | '4K' | '1440P' | '1080P' | '720P' | '480P' | '360P' | '240P' | 'audio';

export interface VideoInfo {
  url: string;
  platform: Platform;
  platformName: string;
  platformColor: string;
  title: string;
  thumbnail: string;
  duration: number;
  author: string;
  qualities: VideoQuality[];
  formats: VideoFormat[];
  estimatedSize?: number;
  description?: string;
  hint?: string;
  defaults?: { quality: VideoQuality; format: VideoFormat };
}

export interface DownloadTask {
  id: string;
  url: string;
  platform: Platform;
  title: string;
  thumbnail: string;
  author: string;
  duration: number;
  quality: VideoQuality;
  format: VideoFormat;
  fileSize: number;
  downloadedBytes: number;
  status: TaskStatus;
  progress: number;
  speed: number;
  eta: number;
  filePath?: string;
  errorMessage?: string;
  retryCount: number;
  createdAt: number;
  updatedAt: number;
  startedAt?: number;
  completedAt?: number;
}

export interface StatsData {
  todayTasks: number;
  completedToday: number;
  downloading: number;
  failedToday: number;
  totalDownloaded: number;
  totalTasks: number;
  successRate: number;
  platformDistribution: Record<string, number>;
  dailyDownloads: Array<{ date: string; count: number; bytes: number }>;
  recentTasks: DownloadTask[];
}

export interface SettingsData {
  defaultQuality: VideoQuality;
  defaultFormat: VideoFormat;
  maxConcurrent: number;
  downloadDir: string;
  maxSpeedMbps: number;
  requestTimeoutMs: number;
  maxRetries: number;
  theme: 'light' | 'dark' | 'system';
  runtime: {
    nodeVersion: string;
    platform: string;
    arch: string;
    cwd: string;
  };
}

export interface SystemInfo {
  version: string;
  nodeVersion: string;
  platform: string;
  arch: string;
  hostname: string;
  cpus: number;
  memory: { total: number; free: number };
  downloadDir: string;
  downloadDirExists: boolean;
  dbPath: string;
  dbExists: boolean;
  disk: { free: number; total: number; freeGB: number; totalGB: number };
  uptimeSec: number;
}

export interface FileItem {
  name: string;
  path: string;
  size: number;
  isDirectory: boolean;
  mtime: number;
}

export interface ApiResponse<T> {
  ok: boolean;
  data?: T;
  error?: string;
  message?: string;
  hint?: string;
  details?: string;
}

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message?: string;
  duration?: number;
}