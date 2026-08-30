import dotenv from 'dotenv';
import path from 'path';
import { AppConfig } from '../types';

dotenv.config();

const num = (key: string, def: number): number => {
  const v = process.env[key];
  if (!v) return def;
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
};

const str = (key: string, def: string): string => process.env[key] || def;

export const config: AppConfig = {
  port: num('PORT', 4000),
  host: str('HOST', '0.0.0.0'),
  dbPath: str('DB_PATH', path.resolve(process.cwd(), 'data', 'vdm.db')),
  downloadDir: str('DOWNLOAD_DIR', path.resolve(process.cwd(), 'downloads')),
  maxConcurrent: num('MAX_CONCURRENT', 3),
  maxSpeedMbps: num('MAX_SPEED_MBPS', 0),
  requestTimeoutMs: num('REQUEST_TIMEOUT_MS', 30000),
  maxRetries: num('MAX_RETRIES', 3),
  corsOrigin: str('CORS_ORIGIN', 'http://localhost:5173'),
};

export const PROJECT_ROOT = path.resolve(__dirname, '../../');