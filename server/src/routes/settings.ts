import { Router, Request, Response } from 'express';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { config as appConfig } from '../utils/config';
import { configRepo } from '../services/database';
import { broadcast } from '../services/ws';

export const settingsRouter = Router();

settingsRouter.get('/', (_req: Request, res: Response) => {
  const cfg = configRepo.all();
  // merge with runtime defaults
  const out = {
    defaultQuality: cfg.defaultQuality || '1080P',
    defaultFormat: cfg.defaultFormat || 'mp4',
    maxConcurrent: Number(cfg.maxConcurrent || appConfig.maxConcurrent),
    downloadDir: cfg.downloadDir || appConfig.downloadDir,
    maxSpeedMbps: Number(cfg.maxSpeedMbps ?? appConfig.maxSpeedMbps),
    requestTimeoutMs: Number(cfg.requestTimeoutMs || appConfig.requestTimeoutMs),
    maxRetries: Number(cfg.maxRetries || appConfig.maxRetries),
    theme: cfg.theme || 'system',
    runtime: {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      cwd: process.cwd(),
    },
  };
  res.json({ ok: true, data: out });
});

settingsRouter.put('/', (req: Request, res: Response) => {
  const body = req.body || {};
  const allowed = [
    'defaultQuality',
    'defaultFormat',
    'maxConcurrent',
    'downloadDir',
    'maxSpeedMbps',
    'requestTimeoutMs',
    'maxRetries',
    'theme',
  ];
  for (const key of allowed) {
    if (body[key] !== undefined && body[key] !== null) {
      configRepo.set(key, String(body[key]));
    }
  }
  // Update in-memory config when relevant
  if (body.maxConcurrent !== undefined) appConfig.maxConcurrent = Number(body.maxConcurrent);
  if (body.downloadDir !== undefined) appConfig.downloadDir = body.downloadDir;
  if (body.maxSpeedMbps !== undefined) appConfig.maxSpeedMbps = Number(body.maxSpeedMbps);
  if (body.requestTimeoutMs !== undefined) appConfig.requestTimeoutMs = Number(body.requestTimeoutMs);
  if (body.maxRetries !== undefined) appConfig.maxRetries = Number(body.maxRetries);
  broadcast({ type: 'config:update', payload: { source: 'settings' } });
  res.json({ ok: true });
});

settingsRouter.get('/system', (_req: Request, res: Response) => {
  let diskFree = 0;
  let diskTotal = 0;
  try {
    const dir = appConfig.downloadDir;
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const stat = fs.statfsSync(dir);
    diskFree = stat.bavail * stat.bsize;
    diskTotal = stat.blocks * stat.bsize;
  } catch {
    // ignore (some platforms don't support statfs)
  }

  res.json({
    ok: true,
    data: {
      version: '1.0.0',
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      hostname: os.hostname(),
      cpus: os.cpus().length,
      memory: {
        total: os.totalmem(),
        free: os.freemem(),
      },
      downloadDir: appConfig.downloadDir,
      downloadDirExists: fs.existsSync(appConfig.downloadDir),
      dbPath: appConfig.dbPath,
      dbExists: fs.existsSync(appConfig.dbPath),
      disk: {
        free: diskFree,
        total: diskTotal,
        freeGB: Number((diskFree / 1e9).toFixed(2)),
        totalGB: Number((diskTotal / 1e9).toFixed(2)),
      },
      uptimeSec: Math.round(process.uptime()),
    },
  });
});