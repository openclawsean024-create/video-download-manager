import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { config } from './utils/config';
import { logger } from './utils/logger';
import { getDb } from './services/database';
import { downloadManager } from './services/downloadManager';
import { attachWebSocket } from './services/ws';
import { parseRouter } from './routes/parse';
import { tasksRouter } from './routes/tasks';
import { statsRouter } from './routes/stats';
import { settingsRouter } from './routes/settings';
import { filesRouter } from './routes/files';

const app = express();
const server = http.createServer(app);

// Ensure dirs
if (!fs.existsSync(path.dirname(config.dbPath))) fs.mkdirSync(path.dirname(config.dbPath), { recursive: true });
if (!fs.existsSync(config.downloadDir)) fs.mkdirSync(config.downloadDir, { recursive: true });
downloadManager.ensureDownloadDir();

// Body parsing
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// CORS
app.use(
  cors({
    origin: (origin, cb) => cb(null, true), // permissive for local dev
    credentials: true,
  }),
);

// Request logging
app.use((req, _res, next) => {
  logger.debug(`${req.method} ${req.path}`);
  next();
});

// API routes
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    ok: true,
    data: {
      status: 'ok',
      uptime: process.uptime(),
      runningTasks: downloadManager.runningTasks(),
      maxConcurrent: config.maxConcurrent,
      version: '1.0.0',
    },
  });
});

app.use('/api/parse', parseRouter);
app.use('/api/tasks', tasksRouter);
app.use('/api/stats', statsRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/files', filesRouter);

// Global error handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  logger.error('Unhandled error', { err: String(err), stack: err?.stack });
  res.status(500).json({ ok: false, error: 'INTERNAL_ERROR', message: '服务内部错误' });
});

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ ok: false, error: 'NOT_FOUND', message: '接口不存在' });
});

// WebSocket
attachWebSocket(server);

// Bootstrap DB and recover tasks
getDb();
downloadManager.recoverOnStartup();

server.listen(config.port, config.host, () => {
  logger.info(`Server listening on http://${config.host}:${config.port}`);
  logger.info(`Download dir: ${config.downloadDir}`);
  logger.info(`Database: ${config.dbPath}`);
  logger.info(`Max concurrent: ${config.maxConcurrent}`);
});

process.on('uncaughtException', (err) => {
  logger.error('uncaughtException', { err: String(err), stack: (err as any)?.stack });
});
process.on('unhandledRejection', (reason) => {
  logger.error('unhandledRejection', { reason: String(reason) });
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down...');
  server.close(() => process.exit(0));
});
process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down...');
  server.close(() => process.exit(0));
});

export { app, server };