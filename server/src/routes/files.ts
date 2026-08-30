import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { taskRepo } from '../services/database';
import { config as appConfig } from '../utils/config';

export const filesRouter = Router();

// Resolve a file path safely under downloadDir; reject anything else.
function resolveSafe(p: string): string | null {
  const root = path.resolve(appConfig.downloadDir);
  const target = path.resolve(p);
  if (!target.startsWith(root + path.sep) && target !== root) return null;
  return target;
}

filesRouter.get('/list', (_req: Request, res: Response) => {
  if (!fs.existsSync(appConfig.downloadDir)) {
    fs.mkdirSync(appConfig.downloadDir, { recursive: true });
  }
  const items = fs.readdirSync(appConfig.downloadDir).map((name) => {
    const p = path.join(appConfig.downloadDir, name);
    const stat = fs.statSync(p);
    return {
      name,
      path: p,
      size: stat.size,
      isDirectory: stat.isDirectory(),
      mtime: stat.mtimeMs,
    };
  });
  res.json({ ok: true, data: items });
});

filesRouter.post('/open', (req: Request, res: Response) => {
  const p = req.body?.path;
  if (typeof p !== 'string') return res.status(400).json({ ok: false, message: 'PATH_REQUIRED' });
  const safe = resolveSafe(p);
  if (!safe) return res.status(403).json({ ok: false, message: 'PATH_FORBIDDEN' });
  if (!fs.existsSync(safe)) return res.status(404).json({ ok: false, message: 'NOT_FOUND' });
  // Best-effort: return path so the client can open via OS shell.
  res.json({ ok: true, data: { path: safe, url: 'file://' + safe } });
});

filesRouter.post('/delete', (req: Request, res: Response) => {
  const p = req.body?.path;
  if (typeof p !== 'string') return res.status(400).json({ ok: false, message: 'PATH_REQUIRED' });
  const safe = resolveSafe(p);
  if (!safe) return res.status(403).json({ ok: false, message: 'PATH_FORBIDDEN' });
  try {
    if (fs.existsSync(safe)) fs.unlinkSync(safe);
    // also clean up tasks that reference this file if requested
    const removeTasks = req.body?.removeTasks === true;
    if (removeTasks) {
      const tasks = taskRepo.findAll().filter((t) => t.filePath === safe);
      for (const t of tasks) taskRepo.delete(t.id);
    }
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ ok: false, message: err?.message || 'DELETE_FAILED' });
  }
});