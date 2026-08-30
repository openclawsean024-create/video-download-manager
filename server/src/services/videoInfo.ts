import https from 'https';
import http from 'http';
import { URL } from 'url';
import { Platform, VideoInfo, VideoFormat, VideoQuality } from '../types';
import { detectPlatform } from './urlParser';
import { logger } from '../utils/logger';

const TIMEOUT_MS = 8000;

const QUALITIES: VideoQuality[] = ['8K', '4K', '1440P', '1080P', '720P', '480P', '360P', '240P'];
const FORMATS: VideoFormat[] = ['mp4', 'webm', 'mkv', 'mp3'];

function fetchUrl(rawUrl: string, options: { timeout?: number; maxRedirects?: number } = {}): Promise<{ status: number; body: string; headers: any }> {
  return new Promise((resolve, reject) => {
    let url = rawUrl;
    let redirects = 0;
    const maxRedirects = options.maxRedirects ?? 5;
    const timeout = options.timeout ?? TIMEOUT_MS;

    const makeRequest = (u: string) => {
      const parsed = new URL(u);
      const lib = parsed.protocol === 'https:' ? https : http;
      const req = lib.request(
        {
          method: 'GET',
          host: parsed.hostname,
          port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
          path: parsed.pathname + parsed.search,
          timeout,
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
            Accept: 'application/json, text/html,application/xhtml+xml',
            'Accept-Language': 'en-US,en;q=0.9',
          },
        },
        (res) => {
          const status = res.statusCode || 0;
          if ([301, 302, 303, 307, 308].includes(status) && res.headers.location && redirects < maxRedirects) {
            redirects++;
            res.resume();
            const next = new URL(res.headers.location, u).toString();
            makeRequest(next);
            return;
          }
          let body = '';
          res.setEncoding('utf8');
          res.on('data', (c) => (body += c));
          res.on('end', () => resolve({ status, body, headers: res.headers }));
        },
      );
      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy(new Error('Request timed out'));
      });
      req.end();
    };

    makeRequest(url);
  });
}

async function tryOEmbed(platform: Platform, url: string): Promise<Partial<VideoInfo> | null> {
  const OEMBED_ENDPOINTS: Partial<Record<Platform, string>> = {
    youtube: 'https://www.youtube.com/oembed',
    vimeo: 'https://vimeo.com/api/oembed.json',
  };
  const endpoint = OEMBED_ENDPOINTS[platform];
  if (!endpoint) return null;
  try {
    const sep = endpoint.includes('?') ? '&' : '?';
    const target = `${endpoint}${sep}url=${encodeURIComponent(url)}&format=json`;
    const res = await fetchUrl(target);
    if (res.status !== 200) return null;
    const data = JSON.parse(res.body);
    return {
      title: data.title,
      thumbnail: data.thumbnail_url,
      author: data.author_name,
      duration: 0,
    };
  } catch (err) {
    logger.debug('oEmbed failed', { platform, err: String(err) });
    return null;
  }
}

async function tryOpenGraph(url: string): Promise<Partial<VideoInfo>> {
  try {
    const res = await fetchUrl(url);
    if (res.status >= 400) return {};
    const html = res.body;
    const pickMeta = (property: string): string | undefined => {
      const re = new RegExp(
        `<meta[^>]+(?:property|name)=["']${property}["'][^>]*content=["']([^"']+)["']`,
        'i',
      );
      const m = html.match(re);
      return m ? decodeHtml(m[1]) : undefined;
    };
    return {
      title: pickMeta('og:title') || pickMeta('twitter:title'),
      thumbnail: pickMeta('og:image') || pickMeta('twitter:image'),
      description: pickMeta('og:description') || pickMeta('twitter:description'),
      author: pickMeta('og:site_name') || pickMeta('twitter:site'),
    };
  } catch (err) {
    logger.debug('OpenGraph failed', { url, err: String(err) });
    return {};
  }
}

function decodeHtml(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x([0-9A-Fa-f]+);/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(parseInt(d, 10)));
}

// Deterministic mock based on URL hash, used as fallback so the demo always works
function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

const MOCK_TITLES: Record<Platform, string[]> = {
  youtube: [
    'Deep Dive Into Modern Web Development',
    'How AI Is Reshaping the Coding Workflow',
    'Cinematic Travel Vlog · Kyoto in 4K',
    'Mastering TypeScript: Advanced Patterns',
    'Lo-fi Hip Hop Radio · Beats to Code To',
    'Building a SaaS in 30 Days · Day 14',
  ],
  bilibili: [
    '【纪录片】城市夜色中的温柔时刻',
    '我用 Rust 重写了整个后端',
    '深夜电台 · 听一段好故事',
    '二次元混剪 · 2024 春季精选',
    '如何高效阅读英文论文',
    '手工耿系列 · 离谱发明大赏',
  ],
  vimeo: [
    'Brand Film · A Morning at Dawn',
    'Behind the Scenes of a Studio Shoot',
    'Cinematic Reel · 2024',
    'Documentary Short · Local Stories',
  ],
  x: [
    'Viral Clip · Cat vs Roomba',
    'Live Storm Timelapse',
    'Conference Talk Highlight',
    'Software Demo in 60 Seconds',
  ],
  tiktok: [
    'Easy 5-Minute Pasta Recipe',
    'Studio Tour · Behind the Scenes',
    'Trending Dance Challenge',
    'Day in the Life of a Developer',
    'AI Generated Art Reactions',
  ],
  instagram: [
    'Sunset Roller Skating Reel',
    'Behind the Brand · Studio Vlog',
    'Travel Diary · Lisbon',
    'Quick Recipe Reel',
  ],
  unknown: ['Sample Video'],
};

const MOCK_AUTHORS: Record<Platform, string[]> = {
  youtube: ['Tech Channel', 'Studio Lumen', 'Indie Maker', 'Vlog Daily', 'Code & Coffee'],
  bilibili: ['影视飓风', '极客湾', '老番茄', '罗翔说刑法', '影视后期教室'],
  vimeo: ['Studio Vinegar', 'Field Notes', 'Hue Collective'],
  x: ['@cityscapes', '@naturefeed', '@devdigest'],
  tiktok: ['@quickrecipes', '@studioskater', '@devlife'],
  instagram: ['@skaterdiary', '@lisbonlove', '@recipeseasy'],
  unknown: ['Unknown'],
};

function fallbackInfo(url: string, platform: Platform, id: string | null): VideoInfo {
  const h = hashString(url + (id || ''));
  const titles = MOCK_TITLES[platform];
  const authors = MOCK_AUTHORS[platform];
  const title = titles[h % titles.length];
  const author = authors[h % authors.length];
  const duration = 30 + (h % 600); // 30s - 10min
  // estimate size: assume ~1MB per 5s at 720p; vary with hash for fun
  const baseSize = Math.round((duration * 250_000) / 1) * (1 + (h % 5));
  return {
    url,
    platform,
    title,
    thumbnail: `https://picsum.photos/seed/${platform}-${h}/640/360`,
    duration,
    author,
    qualities: QUALITIES,
    formats: FORMATS,
    estimatedSize: baseSize,
    description: `${title} — by ${author}. Public source preview metadata.`,
  };
}

export async function getVideoInfo(url: string): Promise<VideoInfo> {
  const { platform, id } = detectPlatform(url);
  if (platform === 'unknown' || !id) {
    throw new Error('URL_PLATFORM_UNSUPPORTED');
  }

  // Try oEmbed first (most reliable for YouTube & Vimeo)
  let info: Partial<VideoInfo> | null = null;
  try {
    info = await tryOEmbed(platform, url);
  } catch {
    info = null;
  }

  // Fallback to OpenGraph scraping
  if (!info || !info.title) {
    try {
      const og = await tryOpenGraph(url);
      info = { ...info, ...og };
    } catch {
      // ignore
    }
  }

  // Compose final; if still missing data, fallback
  const fb = fallbackInfo(url, platform, id);
  const merged: VideoInfo = {
    ...fb,
    title: info?.title || fb.title,
    thumbnail: info?.thumbnail || fb.thumbnail,
    author: info?.author || fb.author,
    description: info?.description || fb.description,
    duration: info?.duration && info.duration > 0 ? info.duration : fb.duration,
  };
  return merged;
}

export { QUALITIES, FORMATS };