import { Router, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { downloadManager } from '../services/downloadManager';
import { taskRepo } from '../services/database';
import { getVideoInfo } from '../services/videoInfo';
import { detectPlatform, isValidUrl, PLATFORM_NAMES } from '../services/urlParser';
import { broadcast } from '../services/ws';
import { DownloadTask, TaskStatus } from '../types';

export const tasksRouter = Router();

function normalizeStatus(s: string | undefined): TaskStatus | undefined {
  const allowed: TaskStatus[] = ['waiting', 'parsing', 'downloading', 'paused', 'completed', 'failed', 'cancelled'];
  if (s && allowed.includes(s as TaskStatus)) return s as TaskStatus;
  return undefined;
}

tasksRouter.get('/', (req: Request, res: Response) => {
  const status = normalizeStatus(req.query.status as string);
  const platform = req.query.platform as string | undefined;
  const filter: { status?: TaskStatus; platform?: string } = {};
  if (status) filter.status = status;
  if (platform) filter.platform = platform;
  const tasks = taskRepo.findAll(filter);
  res.json({ ok: true, data: tasks });
});

tasksRouter.post('/', async (req: Request, res: Response) => {
  const url = (req.body?.url || '').trim();
  const quality = (req.body?.quality || '1080P') as any;
  const format = (req.body?.format || 'mp4') as any;
  const fileSizeOverride = req.body?.fileSize as number | undefined;
  const titleOverride = req.body?.title as string | undefined;

  if (!url) {
    return res.status(400).json({ ok: false, error: 'URL_REQUIRED', message: '请提供视频链接' });
  }
  if (!isValidUrl(url)) {
    return res.status(400).json({ ok: false, error: 'URL_INVALID', message: 'URL 格式无效' });
  }
  const { platform, id } = detectPlatform(url);
  if (platform === 'unknown' || !id) {
    return res.status(400).json({
      ok: false,
      error: 'PLATFORM_UNSUPPORTED',
      message: '当前平台不支持或链接无法识别',
    });
  }

  let title = titleOverride;
  let thumbnail = '';
  let author = '';
  let duration = 0;
  let fileSize = fileSizeOverride && fileSizeOverride > 0 ? fileSizeOverride : 0;

  if (!title) {
    try {
      const info = await getVideoInfo(url);
      title = info.title;
      thumbnail = info.thumbnail;
      author = info.author;
      duration = info.duration;
      if (!fileSize) fileSize = info.estimatedSize || 5_000_000;
    } catch {
      title = `${PLATFORM_NAMES[platform]} Video`;
      thumbnail = '';
      author = '';
      duration = 0;
      if (!fileSize) fileSize = 5_000_000;
    }
  }

  // Check for duplicate (same URL with non-terminal status)
  const existing = taskRepo.findAll().find((t) => t.url === url && !['completed', 'cancelled', 'failed'].includes(t.status));
  if (existing) {
    return res.status(409).json({
      ok: false,
      error: 'DUPLICATE',
      message: '该视频已在下载队列中',
      data: existing,
    });
  }

  const now = Date.now();
  const task: DownloadTask = {
    id: randomUUID(),
    url,
    platform,
    title,
    thumbnail,
    author,
    duration,
    quality,
    format,
    fileSize,
    downloadedBytes: 0,
    status: 'waiting',
    progress: 0,
    speed: 0,
    eta: 0,
    retryCount: 0,
    createdAt: now,
    updatedAt: now,
  };
  downloadManager.enqueue(task);
  res.json({ ok: true, data: task });
});

tasksRouter.post('/:id/pause', (req: Request, res: Response) => {
  const ok = downloadManager.pause(req.params.id);
  if (!ok) return res.status(400).json({ ok: false, message: '无法暂停该任务' });
  res.json({ ok: true });
});

tasksRouter.post('/:id/resume', (req: Request, res: Response) => {
  const ok = downloadManager.resume(req.params.id);
  if (!ok) return res.status(400).json({ ok: false, message: '无法继续该任务' });
  res.json({ ok: true });
});

tasksRouter.post('/:id/cancel', (req: Request, res: Response) => {
  const deleteFile = req.body?.deleteFile === true;
  const ok = downloadManager.cancel(req.params.id, deleteFile);
  if (!ok) return res.status(400).json({ ok: false, message: '无法取消该任务' });
  res.json({ ok: true });
});

tasksRouter.post('/:id/retry', (req: Request, res: Response) => {
  const ok = downloadManager.retry(req.params.id);
  if (!ok) return res.status(400).json({ ok: false, message: '无法重试该任务' });
  res.json({ ok: true });
});

tasksRouter.delete('/:id', (req: Request, res: Response) => {
  const deleteFile = req.query.deleteFile === 'true';
  const task = taskRepo.findById(req.params.id);
  if (!task) return res.status(404).json({ ok: false, message: '任务不存在' });
  downloadManager.delete(req.params.id, deleteFile);
  res.json({ ok: true });
});

tasksRouter.post('/batch/delete', (req: Request, res: Response) => {
  const ids = (req.body?.ids || []) as string[];
  const deleteFile = req.body?.deleteFile === true;
  let removed = 0;
  for (const id of ids) {
    if (downloadManager.delete(id, deleteFile)) removed++;
  }
  res.json({ ok: true, data: { removed } });
});