import { Router, Request, Response } from 'express';
import { getVideoInfo } from '../services/videoInfo';
import { detectPlatform, isValidUrl, PLATFORM_NAMES, PLATFORM_COLORS, getPlatformLimits } from '../services/urlParser';
import { VideoQuality, VideoFormat } from '../types';

export const parseRouter = Router();

parseRouter.post('/', async (req: Request, res: Response) => {
  const url = (req.body?.url || '').trim();
  if (!url) {
    return res.status(400).json({ ok: false, error: 'URL_REQUIRED', message: '请提供视频链接' });
  }
  if (!isValidUrl(url)) {
    return res
      .status(400)
      .json({ ok: false, error: 'URL_INVALID', message: 'URL 格式无效，请检查后重试' });
  }
  const { platform, id } = detectPlatform(url);
  if (platform === 'unknown' || !id) {
    return res.status(400).json({
      ok: false,
      error: 'PLATFORM_UNSUPPORTED',
      message: '当前平台不支持或链接无法识别。请使用 YouTube / Bilibili / Vimeo / X / TikTok / Instagram 的公开视频链接。',
      hint: getPlatformLimits().unknown,
    });
  }

  try {
    const info = await getVideoInfo(url);
    return res.json({
      ok: true,
      data: {
        ...info,
        platformName: PLATFORM_NAMES[info.platform],
        platformColor: PLATFORM_COLORS[info.platform],
        hint: getPlatformLimits()[info.platform],
        defaults: {
          quality: '1080P' as VideoQuality,
          format: 'mp4' as VideoFormat,
        },
      },
    });
  } catch (err: any) {
    const msg = err?.message || String(err);
    let userMessage = '无法获取视频信息';
    let code = 'FETCH_FAILED';
    if (msg.includes('UNSUPPORTED')) {
      code = 'PLATFORM_UNSUPPORTED';
      userMessage = '当前平台不支持';
    } else if (msg.toLowerCase().includes('timeout')) {
      code = 'TIMEOUT';
      userMessage = '请求超时，请稍后重试';
    } else if (msg.toLowerCase().includes('enotfound') || msg.toLowerCase().includes('getaddrinfo')) {
      code = 'NETWORK_ERROR';
      userMessage = '网络连接错误，无法访问该平台';
    }
    return res.status(502).json({
      ok: false,
      error: code,
      message: userMessage,
      details: msg,
    });
  }
});