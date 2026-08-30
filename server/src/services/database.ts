import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { config } from '../utils/config';
import { logger } from '../utils/logger';
import { DownloadTask, TaskStatus } from '../types';

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    const dir = path.dirname(config.dbPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    db = new Database(config.dbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initSchema(db);
    logger.info('Database initialized', { path: config.dbPath });
  }
  return db;
}

function initSchema(d: Database.Database) {
  d.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      url TEXT NOT NULL,
      platform TEXT NOT NULL,
      title TEXT NOT NULL,
      thumbnail TEXT,
      author TEXT,
      duration INTEGER DEFAULT 0,
      quality TEXT NOT NULL,
      format TEXT NOT NULL,
      file_size INTEGER DEFAULT 0,
      downloaded_bytes INTEGER DEFAULT 0,
      status TEXT NOT NULL,
      progress REAL DEFAULT 0,
      speed REAL DEFAULT 0,
      eta INTEGER DEFAULT 0,
      file_path TEXT,
      error_message TEXT,
      retry_count INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      started_at INTEGER,
      completed_at INTEGER
    );

    CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
    CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at);

    CREATE TABLE IF NOT EXISTS config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);
}

const rowToTask = (row: any): DownloadTask => ({
  id: row.id,
  url: row.url,
  platform: row.platform,
  title: row.title,
  thumbnail: row.thumbnail || '',
  author: row.author || '',
  duration: row.duration || 0,
  quality: row.quality,
  format: row.format,
  fileSize: row.file_size || 0,
  downloadedBytes: row.downloaded_bytes || 0,
  status: row.status as TaskStatus,
  progress: row.progress || 0,
  speed: row.speed || 0,
  eta: row.eta || 0,
  filePath: row.file_path || undefined,
  errorMessage: row.error_message || undefined,
  retryCount: row.retry_count || 0,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  startedAt: row.started_at || undefined,
  completedAt: row.completed_at || undefined,
});

export const taskRepo = {
  insert(task: DownloadTask): void {
    getDb()
      .prepare(
        `INSERT INTO tasks (
          id, url, platform, title, thumbnail, author, duration, quality, format,
          file_size, downloaded_bytes, status, progress, speed, eta,
          file_path, error_message, retry_count,
          created_at, updated_at, started_at, completed_at
        ) VALUES (
          @id, @url, @platform, @title, @thumbnail, @author, @duration, @quality, @format,
          @fileSize, @downloadedBytes, @status, @progress, @speed, @eta,
          @filePath, @errorMessage, @retryCount,
          @createdAt, @updatedAt, @startedAt, @completedAt
        )`,
      )
      .run({
        ...task,
        thumbnail: task.thumbnail || null,
        author: task.author || null,
        filePath: task.filePath || null,
        errorMessage: task.errorMessage || null,
        startedAt: task.startedAt || null,
        completedAt: task.completedAt || null,
      });
  },

  update(task: Partial<DownloadTask> & { id: string }): void {
    const fields: string[] = [];
    const values: any = { id: task.id, updatedAt: Date.now() };
    const map: Record<string, string> = {
      url: 'url',
      platform: 'platform',
      title: 'title',
      thumbnail: 'thumbnail',
      author: 'author',
      duration: 'duration',
      quality: 'quality',
      format: 'format',
      fileSize: 'file_size',
      downloadedBytes: 'downloaded_bytes',
      status: 'status',
      progress: 'progress',
      speed: 'speed',
      eta: 'eta',
      filePath: 'file_path',
      errorMessage: 'error_message',
      retryCount: 'retry_count',
      startedAt: 'started_at',
      completedAt: 'completed_at',
    };
    for (const k of Object.keys(task)) {
      if (k === 'id') continue;
      if (map[k]) {
        fields.push(`${map[k]} = @${k}`);
        values[k] = (task as any)[k] ?? null;
      }
    }
    fields.push('updated_at = @updatedAt');
    getDb().prepare(`UPDATE tasks SET ${fields.join(', ')} WHERE id = @id`).run(values);
  },

  delete(id: string): void {
    getDb().prepare('DELETE FROM tasks WHERE id = ?').run(id);
  },

  findById(id: string): DownloadTask | undefined {
    const row = getDb().prepare('SELECT * FROM tasks WHERE id = ?').get(id);
    return row ? rowToTask(row) : undefined;
  },

  findAll(filter?: { status?: TaskStatus; platform?: string }): DownloadTask[] {
    let sql = 'SELECT * FROM tasks';
    const where: string[] = [];
    const params: any[] = [];
    if (filter?.status) {
      where.push('status = ?');
      params.push(filter.status);
    }
    if (filter?.platform) {
      where.push('platform = ?');
      params.push(filter.platform);
    }
    if (where.length) sql += ' WHERE ' + where.join(' AND ');
    sql += ' ORDER BY created_at DESC';
    const rows = getDb().prepare(sql).all(...params);
    return rows.map(rowToTask);
  },

  countByStatus(status: TaskStatus, sinceMs?: number): number {
    if (sinceMs) {
      const row = getDb()
        .prepare('SELECT COUNT(*) as n FROM tasks WHERE status = ? AND updated_at >= ?')
        .get(status, sinceMs);
      return (row as any).n;
    }
    const row = getDb().prepare('SELECT COUNT(*) as n FROM tasks WHERE status = ?').get(status);
    return (row as any).n;
  },

  totalBytes(): number {
    const row = getDb()
      .prepare("SELECT COALESCE(SUM(file_size), 0) as n FROM tasks WHERE status = 'completed'")
      .get();
    return (row as any).n;
  },

  countAll(): number {
    const row = getDb().prepare('SELECT COUNT(*) as n FROM tasks').get();
    return (row as any).n;
  },

  platformDistribution(): Record<string, number> {
    const rows = getDb()
      .prepare('SELECT platform, COUNT(*) as n FROM tasks GROUP BY platform')
      .all() as Array<{ platform: string; n: number }>;
    const dist: Record<string, number> = {};
    for (const r of rows) dist[r.platform] = r.n;
    return dist;
  },

  dailyDownloads(days = 7): Array<{ date: string; count: number; bytes: number }> {
    const since = Date.now() - days * 24 * 60 * 60 * 1000;
    const rows = getDb()
      .prepare(
        `SELECT
          date(completed_at / 1000, 'unixepoch', 'localtime') as d,
          COUNT(*) as n,
          COALESCE(SUM(file_size), 0) as b
        FROM tasks
        WHERE status = 'completed' AND completed_at >= ?
        GROUP BY d
        ORDER BY d ASC`,
      )
      .all(since);
    // backfill days with zeros
    const map = new Map<string, { date: string; count: number; bytes: number }>();
    for (const r of rows as any[]) {
      map.set(r.d, { date: r.d, count: r.n, bytes: r.b });
    }
    const result: Array<{ date: string; count: number; bytes: number }> = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const ds = d.toISOString().slice(0, 10);
      result.push(map.get(ds) || { date: ds, count: 0, bytes: 0 });
    }
    return result;
  },

  recentTasks(limit = 8): DownloadTask[] {
    const rows = getDb()
      .prepare('SELECT * FROM tasks ORDER BY created_at DESC LIMIT ?')
      .all(limit);
    return rows.map(rowToTask);
  },

  recoveryCandidates(): DownloadTask[] {
    // tasks that should resume
    const rows = getDb()
      .prepare("SELECT * FROM tasks WHERE status IN ('downloading', 'paused', 'waiting', 'parsing')")
      .all();
    return rows.map(rowToTask);
  },
};

export const configRepo = {
  get(key: string): string | undefined {
    const row = getDb().prepare('SELECT value FROM config WHERE key = ?').get(key);
    return row ? (row as any).value : undefined;
  },
  set(key: string, value: string): void {
    getDb()
      .prepare(
        `INSERT INTO config (key, value, updated_at) VALUES (?, ?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
      )
      .run(key, value, Date.now());
  },
  all(): Record<string, string> {
    const rows = getDb().prepare('SELECT key, value FROM config').all() as Array<{
      key: string;
      value: string;
    }>;
    const out: Record<string, string> = {};
    for (const r of rows) out[r.key] = r.value;
    return out;
  },
};

export function closeDb() {
  if (db) {
    db.close();
    db = undefined as any;
  }
}