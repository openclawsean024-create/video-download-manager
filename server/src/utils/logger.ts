/* eslint-disable no-console */
const LEVELS = ['debug', 'info', 'warn', 'error'] as const;
type Level = (typeof LEVELS)[number];

const current: Level = (process.env.LOG_LEVEL as Level) || 'info';
const rank = (l: Level) => LEVELS.indexOf(l);

const fmt = (l: Level, msg: string, meta?: any) => {
  const ts = new Date().toISOString();
  const base = `[${ts}] [${l.toUpperCase()}] ${msg}`;
  if (meta !== undefined) {
    try {
      return `${base} ${typeof meta === 'string' ? meta : JSON.stringify(meta)}`;
    } catch {
      return `${base} [unserializable meta]`;
    }
  }
  return base;
};

export const logger = {
  debug: (msg: string, meta?: any) => rank('debug') >= rank(current) && console.log(fmt('debug', msg, meta)),
  info: (msg: string, meta?: any) => rank('info') >= rank(current) && console.log(fmt('info', msg, meta)),
  warn: (msg: string, meta?: any) => rank('warn') >= rank(current) && console.warn(fmt('warn', msg, meta)),
  error: (msg: string, meta?: any) => rank('error') >= rank(current) && console.error(fmt('error', msg, meta)),
};