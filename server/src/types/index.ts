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
  title: string;
  thumbnail: string;
  duration: number; // seconds
  author: string;
  qualities: VideoQuality[];
  formats: VideoFormat[];
  estimatedSize?: number; // bytes
  description?: string;
  uploadDate?: string;
  viewCount?: number;
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
  fileSize: number; // bytes
  downloadedBytes: number;
  status: TaskStatus;
  progress: number; // 0-100
  speed: number; // bytes per second
  eta: number; // seconds remaining
  filePath?: string;
  errorMessage?: string;
  retryCount: number;
  createdAt: number;
  updatedAt: number;
  startedAt?: number;
  completedAt?: number;
}

export interface TaskCreateRequest {
  url: string;
  quality?: VideoQuality;
  format?: VideoFormat;
  savePath?: string;
}

export interface AppConfig {
  port: number;
  host: string;
  dbPath: string;
  downloadDir: string;
  maxConcurrent: number;
  maxSpeedMbps: number;
  requestTimeoutMs: number;
  maxRetries: number;
  corsOrigin: string;
}

export interface StatsData {
  todayTasks: number;
  completedToday: number;
  downloading: number;
  failedToday: number;
  totalDownloaded: number; // bytes
  totalTasks: number;
  successRate: number; // 0-100
  platformDistribution: Record<Platform, number>;
  dailyDownloads: Array<{ date: string; count: number; bytes: number }>;
  recentTasks: DownloadTask[];
}

export interface WsEvent {
  type: 'task:update' | 'task:progress' | 'task:created' | 'task:removed' | 'stats:update' | 'config:update';
  payload: any;
}