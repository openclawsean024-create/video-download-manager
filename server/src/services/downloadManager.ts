import fs from 'fs';
import path from 'path';
import { config } from '../utils/config';
import { logger } from '../utils/logger';
import { taskRepo } from './database';
import { DownloadTask, TaskStatus } from '../types';

type Listener = (event: { type: string; payload: any }) => void;

class DownloadManager {
  private listeners = new Set<Listener>();
  private active = new Map<string, AbortController>();
  private timers = new Map<string, NodeJS.Timeout>();
  private pauseFlags = new Map<string, boolean>();
  private runningCount = 0;

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emitEvent(type: string, payload: any) {
    const event = { type, payload };
    for (const l of this.listeners) {
      try {
        l(event);
      } catch (e) {
        logger.warn('Listener error', { err: String(e) });
      }
    }
  }

  ensureDownloadDir() {
    if (!fs.existsSync(config.downloadDir)) {
      fs.mkdirSync(config.downloadDir, { recursive: true });
    }
  }

  sanitizeFilename(name: string): string {
    return name
      .replace(/[\\/:*?"<>|]/g, '_')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 180);
  }

  // Simulated download. In production this would shell out to yt-dlp / ffmpeg,
  // but for the demo we write real bytes to disk at a realistic rate so the
  // user can see the whole pipeline (queue, progress, speed, ETA, recovery)
  // working end-to-end with actual files on disk.
  private async simulateDownload(task: DownloadTask, signal: AbortSignal): Promise<void> {
    const total = task.fileSize > 0 ? task.fileSize : 5_000_000;
    const dir = path.dirname(task.filePath || '');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const fd = fs.openSync(task.filePath!, 'w');
    try {
      // Target ~1-8 MB/s speed with some natural variance
      const baseSpeed = 1_500_000 + (Math.random() * 6_000_000);
      const maxSpeed = config.maxSpeedMbps > 0 ? config.maxSpeedMbps * 1_000_000 : Infinity;
      let written = 0;

      while (written < total) {
        if (signal.aborted) {
          throw new Error('ABORTED');
        }
        if (this.pauseFlags.get(task.id)) {
          // when paused, persist and wait
          await new Promise<void>((resolve) => {
            const check = () => {
              if (!this.pauseFlags.get(task.id)) return resolve();
              if (signal.aborted) return resolve();
              setTimeout(check, 200);
            };
            check();
          });
          if (signal.aborted) throw new Error('ABORTED');
        }
        // Simulate network jitter
        const variance = 0.7 + Math.random() * 0.6;
        let speedThisTick = Math.min(baseSpeed * variance, maxSpeed);
        if (!Number.isFinite(speedThisTick) || speedThisTick <= 0) speedThisTick = baseSpeed;
        // 250ms tick
        const bytesThisTick = Math.max(1024, Math.round((speedThisTick * 250) / 1000));
        const next = Math.min(total, written + bytesThisTick);
        // Write a chunk (in production this would be the actual stream from the network)
        const chunk = Buffer.alloc(next - written, 0);
        fs.writeSync(fd, chunk, 0, chunk.length, written);
        written = next;
        const progress = (written / total) * 100;
        const eta = Math.max(0, Math.round((total - written) / speedThisTick));
        taskRepo.update({
          id: task.id,
          downloadedBytes: written,
          progress,
          speed: speedThisTick,
          eta,
          status: 'downloading',
        });
        this.emitEvent('task:progress', {
          id: task.id,
          progress,
          speed: speedThisTick,
          eta,
          downloadedBytes: written,
        });
        await new Promise<void>((res) => setTimeout(res, 250));
      }
    } finally {
      fs.closeSync(fd);
    }
  }

  private async runTask(taskId: string) {
    const task = taskRepo.findById(taskId);
    if (!task) return;
    if (task.status === 'completed' || task.status === 'cancelled') return;

    this.runningCount++;
    const abort = new AbortController();
    this.active.set(taskId, abort);

    const safeName = this.sanitizeFilename(`${task.title}.${task.format}`);
    const filePath = path.join(config.downloadDir, safeName);
    task.filePath = filePath;
    taskRepo.update({ id: taskId, status: 'parsing', startedAt: Date.now(), filePath });
    this.emitEvent('task:update', { id: taskId, status: 'parsing' });

    // Short parsing delay
    await new Promise<void>((res) => {
      const t = setTimeout(res, 400 + Math.random() * 600);
      this.timers.set(taskId, t);
    });
    if (abort.signal.aborted) {
      this.cleanup(taskId);
      this.runningCount--;
      this.drainQueue();
      return;
    }

    try {
      await this.simulateDownload({ ...task, filePath }, abort.signal);
      taskRepo.update({
        id: taskId,
        status: 'completed',
        progress: 100,
        speed: 0,
        eta: 0,
        completedAt: Date.now(),
      });
      this.emitEvent('task:update', {
        id: taskId,
        status: 'completed',
        progress: 100,
        filePath,
      });
      logger.info('Task completed', { id: taskId, title: task.title });
    } catch (err: any) {
      const code = err?.message;
      if (code === 'ABORTED') {
        // Already updated by caller
        logger.info('Task aborted', { id: taskId });
      } else {
        const msg = err?.message || 'Unknown error';
        taskRepo.update({
          id: taskId,
          status: 'failed',
          errorMessage: msg,
        });
        this.emitEvent('task:update', { id: taskId, status: 'failed', errorMessage: msg });
        logger.error('Task failed', { id: taskId, msg });
      }
    } finally {
      this.cleanup(taskId);
      this.runningCount--;
      this.drainQueue();
    }
  }

  private cleanup(taskId: string) {
    this.active.delete(taskId);
    const t = this.timers.get(taskId);
    if (t) {
      clearTimeout(t);
      this.timers.delete(taskId);
    }
  }

  private drainQueue() {
    if (this.runningCount >= config.maxConcurrent) return;
    const waiting = taskRepo.findAll({ status: 'waiting' });
    for (const t of waiting) {
      if (this.runningCount >= config.maxConcurrent) break;
      if (this.active.has(t.id)) continue;
      this.runTask(t.id).catch((e) => logger.error('drainQueue error', { e: String(e) }));
    }
  }

  // Public API
  enqueue(task: DownloadTask) {
    taskRepo.insert(task);
    this.emitEvent('task:created', task);
    this.drainQueue();
  }

  pause(taskId: string): boolean {
    const task = taskRepo.findById(taskId);
    if (!task) return false;
    if (task.status === 'downloading' || task.status === 'parsing') {
      this.pauseFlags.set(taskId, true);
      taskRepo.update({ id: taskId, status: 'paused', speed: 0 });
      this.emitEvent('task:update', { id: taskId, status: 'paused' });
      // Abort current run, will be marked as paused
      const ac = this.active.get(taskId);
      ac?.abort();
      return true;
    }
    if (task.status === 'waiting') {
      taskRepo.update({ id: taskId, status: 'paused' });
      this.emitEvent('task:update', { id: taskId, status: 'paused' });
      return true;
    }
    return false;
  }

  resume(taskId: string): boolean {
    const task = taskRepo.findById(taskId);
    if (!task) return false;
    if (task.status !== 'paused') return false;
    this.pauseFlags.delete(taskId);
    taskRepo.update({ id: taskId, status: 'waiting' });
    this.emitEvent('task:update', { id: taskId, status: 'waiting' });
    this.drainQueue();
    return true;
  }

  cancel(taskId: string, deleteFile = false): boolean {
    const task = taskRepo.findById(taskId);
    if (!task) return false;
    if (task.status === 'completed' || task.status === 'cancelled') {
      // Just remove from db
      taskRepo.delete(taskId);
      this.emitEvent('task:removed', { id: taskId });
      return true;
    }
    if (task.status === 'downloading' || task.status === 'parsing') {
      const ac = this.active.get(taskId);
      ac?.abort();
    }
    taskRepo.update({ id: taskId, status: 'cancelled', speed: 0, eta: 0 });
    if (deleteFile && task.filePath && fs.existsSync(task.filePath)) {
      try {
        fs.unlinkSync(task.filePath);
      } catch {
        // ignore
      }
    }
    this.pauseFlags.delete(taskId);
    this.emitEvent('task:update', { id: taskId, status: 'cancelled' });
    this.cleanup(taskId);
    return true;
  }

  retry(taskId: string): boolean {
    const task = taskRepo.findById(taskId);
    if (!task) return false;
    if (task.status !== 'failed' && task.status !== 'cancelled') return false;
    // Remove existing file if any
    if (task.filePath && fs.existsSync(task.filePath)) {
      try {
        fs.unlinkSync(task.filePath);
      } catch {
        // ignore
      }
    }
    taskRepo.update({
      id: taskId,
      status: 'waiting',
      progress: 0,
      downloadedBytes: 0,
      speed: 0,
      eta: 0,
      errorMessage: undefined,
      retryCount: (task.retryCount || 0) + 1,
    });
    this.emitEvent('task:update', { id: taskId, status: 'waiting' });
    this.drainQueue();
    return true;
  }

  delete(taskId: string, deleteFile = false): boolean {
    const task = taskRepo.findById(taskId);
    if (!task) return false;
    if (task.status === 'downloading' || task.status === 'parsing') {
      const ac = this.active.get(taskId);
      ac?.abort();
    }
    if (deleteFile && task.filePath && fs.existsSync(task.filePath)) {
      try {
        fs.unlinkSync(task.filePath);
      } catch {
        // ignore
      }
    }
    taskRepo.delete(taskId);
    this.cleanEvent(taskId);
    this.emitEvent('task:removed', { id: taskId });
    return true;
  }

  private cleanEvent(taskId: string) {
    this.active.delete(taskId);
    this.pauseFlags.delete(taskId);
    const t = this.timers.get(taskId);
    if (t) {
      clearTimeout(t);
      this.timers.delete(taskId);
    }
  }

  recoverOnStartup() {
    const candidates = taskRepo.recoveryCandidates();
    for (const t of candidates) {
      // Reset in-flight tasks to waiting so they resume cleanly
      if (t.status === 'downloading' || t.status === 'parsing') {
        taskRepo.update({
          id: t.id,
          status: 'waiting',
          speed: 0,
          eta: 0,
          progress: t.downloadedBytes > 0 && t.fileSize > 0 ? (t.downloadedBytes / t.fileSize) * 100 : 0,
        });
      } else if (t.status === 'paused') {
        // leave as paused
      } else if (t.status === 'waiting') {
        // ok
      }
    }
    this.drainQueue();
    logger.info('Recovered tasks on startup', { count: candidates.length });
  }

  runningTasks(): number {
    return this.runningCount;
  }
}

export const downloadManager = new DownloadManager();