import { Platform, VideoInfo } from '../types';

interface PlatformPattern {
  platform: Platform;
  patterns: RegExp[];
  idExtractor: (url: string) => string | null;
}

const PLATFORMS: PlatformPattern[] = [
  {
    platform: 'youtube',
    patterns: [
      /^https?:\/\/(?:www\.|m\.)?youtube\.com\/watch\?v=([\w-]{11})/i,
      /^https?:\/\/youtu\.be\/([\w-]{11})/i,
      /^https?:\/\/(?:www\.)?youtube\.com\/shorts\/([\w-]{11})/i,
      /^https?:\/\/(?:www\.)?youtube\.com\/embed\/([\w-]{11})/i,
    ],
    idExtractor: (url) => {
      const m = url.match(/(?:v=|\/)([\w-]{11})(?:[?&]|$)/);
      return m ? m[1] : null;
    },
  },
  {
    platform: 'bilibili',
    patterns: [
      /^https?:\/\/(?:www\.)?bilibili\.com\/video\/([A-Za-z0-9]+)/i,
      /^https?:\/\/b23\.tv\/([A-Za-z0-9]+)/i,
      /^https?:\/\/m\.bilibili\.com\/video\/([A-Za-z0-9]+)/i,
    ],
    idExtractor: (url) => {
      const m = url.match(/\/video\/([A-Za-z0-9]+)/);
      if (m) return m[1];
      const m2 = url.match(/b23\.tv\/([A-Za-z0-9]+)/);
      return m2 ? m2[1] : null;
    },
  },
  {
    platform: 'vimeo',
    patterns: [
      /^https?:\/\/(?:www\.)?vimeo\.com\/(\d+)/i,
      /^https?:\/\/player\.vimeo\.com\/video\/(\d+)/i,
    ],
    idExtractor: (url) => {
      const m = url.match(/vimeo\.com\/(\d+)/);
      return m ? m[1] : null;
    },
  },
  {
    platform: 'x',
    patterns: [
      /^https?:\/\/(?:www\.)?(?:twitter|x)\.com\/[\w_]+\/status\/(\d+)/i,
      /^https?:\/\/(?:www\.)?(?:twitter|x)\.com\/[\w_]+\/statuses\/(\d+)/i,
    ],
    idExtractor: (url) => {
      const m = url.match(/status(?:es)?\/(\d+)/);
      return m ? m[1] : null;
    },
  },
  {
    platform: 'tiktok',
    patterns: [
      /^https?:\/\/(?:www\.)?tiktok\.com\/@[\w.-]+\/video\/(\d+)/i,
      /^https?:\/\/vm\.tiktok\.com\/([A-Za-z0-9]+)/i,
      /^https?:\/\/m\.tiktok\.com\/v\/(\d+)/i,
    ],
    idExtractor: (url) => {
      const m = url.match(/video\/(\d+)/);
      if (m) return m[1];
      const m2 = url.match(/vm\.tiktok\.com\/([A-Za-z0-9]+)/);
      return m2 ? m2[1] : null;
    },
  },
  {
    platform: 'instagram',
    patterns: [
      /^https?:\/\/(?:www\.)?instagram\.com\/(?:p|reel|reels|tv)\/([A-Za-z0-9_-]+)/i,
      /^https?:\/\/instagr\.am\/(?:p|reel|reels|tv)\/([A-Za-z0-9_-]+)/i,
    ],
    idExtractor: (url) => {
      const m = url.match(/\/(p|reel|reels|tv)\/([A-Za-z0-9_-]+)/);
      return m ? m[2] : null;
    },
  },
];

export function detectPlatform(url: string): { platform: Platform; id: string | null } {
  if (!url || typeof url !== 'string') return { platform: 'unknown', id: null };
  const trimmed = url.trim();
  for (const p of PLATFORMS) {
    for (const pattern of p.patterns) {
      if (pattern.test(trimmed)) {
        return { platform: p.platform, id: p.idExtractor(trimmed) };
      }
    }
  }
  return { platform: 'unknown', id: null };
}

export function isValidUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

export const PLATFORM_NAMES: Record<Platform, string> = {
  youtube: 'YouTube',
  bilibili: 'Bilibili',
  vimeo: 'Vimeo',
  x: 'X (Twitter)',
  tiktok: 'TikTok',
  instagram: 'Instagram',
  unknown: 'Unknown',
};

export const PLATFORM_COLORS: Record<Platform, string> = {
  youtube: '#FF0000',
  bilibili: '#FB7299',
  vimeo: '#1AB7EA',
  x: '#000000',
  tiktok: '#000000',
  instagram: '#E1306C',
  unknown: '#888888',
};

export function getPlatformLimits(): Record<Platform, string> {
  return {
    youtube: 'Supports public videos and unlisted links with download permission.',
    bilibili: 'Supports public videos. Some premium content requires login.',
    vimeo: 'Public videos with download permission only.',
    x: 'Public posts containing video media.',
    tiktok: 'Public videos without watermark where available.',
    instagram: 'Public Reels and Posts. Private accounts require login.',
    unknown: 'Platform not recognized.',
  };
}