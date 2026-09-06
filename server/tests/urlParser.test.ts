// ─── urlParser 測試（AGENTS.md §測試：補基礎覆蓋）─────────────────────────
// 使用 Node 22 內建 node --test + tsx，零外部測試框架依賴
// 涵蓋 §1 detectPlatform / isValidUrl / PLATFORM_NAMES

import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  detectPlatform,
  isValidUrl,
  PLATFORM_NAMES,
  PLATFORM_COLORS,
  getPlatformLimits,
} from '../src/services/urlParser.ts'

// ─── detectPlatform: YouTube ──────────────────────────────────────────────
test('detectPlatform: youtube.com/watch?v= → youtube + 11-char id', () => {
  const r = detectPlatform('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
  assert.equal(r.platform, 'youtube')
  assert.equal(r.id, 'dQw4w9WgXcQ')
})

test('detectPlatform: youtu.be short URL → youtube + id', () => {
  const r = detectPlatform('https://youtu.be/dQw4w9WgXcQ')
  assert.equal(r.platform, 'youtube')
  assert.equal(r.id, 'dQw4w9WgXcQ')
})

test('detectPlatform: youtube shorts → youtube + id', () => {
  const r = detectPlatform('https://www.youtube.com/shorts/abcDEF12345')
  assert.equal(r.platform, 'youtube')
  assert.equal(r.id, 'abcDEF12345')
})

// ─── detectPlatform: Bilibili ─────────────────────────────────────────────
test('detectPlatform: bilibili.com/video/BV... → bilibili + id', () => {
  const r = detectPlatform('https://www.bilibili.com/video/BV1xx411c7mD')
  assert.equal(r.platform, 'bilibili')
  assert.equal(r.id, 'BV1xx411c7mD')
})

test('detectPlatform: b23.tv 短網址 → bilibili + id', () => {
  const r = detectPlatform('https://b23.tv/abc123')
  assert.equal(r.platform, 'bilibili')
  assert.equal(r.id, 'abc123')
})

// ─── detectPlatform: Vimeo ────────────────────────────────────────────────
test('detectPlatform: vimeo.com/123456 → vimeo + numeric id', () => {
  const r = detectPlatform('https://vimeo.com/76979871')
  assert.equal(r.platform, 'vimeo')
  assert.equal(r.id, '76979871')
})

test('detectPlatform: player.vimeo.com/video/123 → vimeo + null id (idExtractor 限制)', () => {
  // 注意：detectPlatform 的 idExtractor 對 player.vimeo.com 形式不支援抽取 ID，
  // 只回 platform vimeo。仍確認 platform 偵測正確。
  const r = detectPlatform('https://player.vimeo.com/video/76979871')
  assert.equal(r.platform, 'vimeo')
  assert.equal(r.id, null)
})

// ─── detectPlatform: X (Twitter) ──────────────────────────────────────────
test('detectPlatform: x.com/user/status/123 → x + numeric id', () => {
  const r = detectPlatform('https://x.com/elonmusk/status/1234567890')
  assert.equal(r.platform, 'x')
  assert.equal(r.id, '1234567890')
})

test('detectPlatform: twitter.com/user/statuses/123 → x + id', () => {
  const r = detectPlatform('https://twitter.com/jack/statuses/20')
  assert.equal(r.platform, 'x')
  assert.equal(r.id, '20')
})

// ─── detectPlatform: TikTok ───────────────────────────────────────────────
test('detectPlatform: tiktok.com/@user/video/123 → tiktok + id', () => {
  const r = detectPlatform('https://www.tiktok.com/@scout2015/video/6718335390845095173')
  assert.equal(r.platform, 'tiktok')
  assert.equal(r.id, '6718335390845095173')
})

test('detectPlatform: vm.tiktok.com short URL → tiktok + id', () => {
  const r = detectPlatform('https://vm.tiktok.com/ZMxxxxxxx/')
  assert.equal(r.platform, 'tiktok')
  assert.equal(r.id, 'ZMxxxxxxx')
})

// ─── detectPlatform: Instagram ────────────────────────────────────────────
test('detectPlatform: instagram.com/p/ABC → instagram + id', () => {
  const r = detectPlatform('https://www.instagram.com/p/CABC123xyz/')
  assert.equal(r.platform, 'instagram')
  assert.equal(r.id, 'CABC123xyz')
})

test('detectPlatform: instagram.com/reel/ABC → instagram + id', () => {
  const r = detectPlatform('https://www.instagram.com/reel/CDEF456uvw/')
  assert.equal(r.platform, 'instagram')
  assert.equal(r.id, 'CDEF456uvw')
})

// ─── detectPlatform: Edge cases ───────────────────────────────────────────
test('detectPlatform: unknown URL → unknown + null id', () => {
  const r = detectPlatform('https://example.com/some-video')
  assert.equal(r.platform, 'unknown')
  assert.equal(r.id, null)
})

test('detectPlatform: empty string → unknown + null id', () => {
  const r = detectPlatform('')
  assert.equal(r.platform, 'unknown')
  assert.equal(r.id, null)
})

test('detectPlatform: non-string input → unknown + null id', () => {
  // @ts-expect-error: 故意測試錯誤型別
  const r = detectPlatform(null)
  assert.equal(r.platform, 'unknown')
  assert.equal(r.id, null)
})

test('detectPlatform: trims whitespace before matching', () => {
  const r = detectPlatform('   https://youtu.be/abcDEF12345   ')
  assert.equal(r.platform, 'youtube')
  assert.equal(r.id, 'abcDEF12345')
})

// ─── isValidUrl ──────────────────────────────────────────────────────────
test('isValidUrl: https URL → true', () => {
  assert.equal(isValidUrl('https://example.com/video'), true)
})

test('isValidUrl: http URL → true', () => {
  assert.equal(isValidUrl('http://example.com/video'), true)
})

test('isValidUrl: ftp:// → false (非 http/https)', () => {
  assert.equal(isValidUrl('ftp://example.com/video'), false)
})

test('isValidUrl: empty string → false', () => {
  assert.equal(isValidUrl(''), false)
})

test('isValidUrl: non-URL garbage → false', () => {
  assert.equal(isValidUrl('not a url'), false)
})

// ─── PLATFORM_NAMES / COLORS / LIMITS 表 ──────────────────────────────────
test('PLATFORM_NAMES: 涵蓋 7 個平台', () => {
  const keys = Object.keys(PLATFORM_NAMES).sort()
  assert.deepEqual(keys, ['bilibili', 'instagram', 'tiktok', 'unknown', 'vimeo', 'x', 'youtube'])
})

test('PLATFORM_COLORS: YouTube 紅色 (#FF0000)', () => {
  assert.equal(PLATFORM_COLORS.youtube, '#FF0000')
})

test('PLATFORM_COLORS: Instagram 漸層色 (#E1306C)', () => {
  assert.equal(PLATFORM_COLORS.instagram, '#E1306C')
})

test('getPlatformLimits: 每個平台都有說明文字', () => {
  const limits = getPlatformLimits()
  for (const key of Object.keys(limits)) {
    assert.ok(limits[key as keyof typeof limits].length > 0, `${key} 應有說明`)
  }
})

test('getPlatformLimits: 與 PLATFORM_NAMES 平台 key 完全一致', () => {
  const limits = getPlatformLimits()
  const nameKeys = Object.keys(PLATFORM_NAMES).sort()
  const limitKeys = Object.keys(limits).sort()
  assert.deepEqual(limitKeys, nameKeys)
})
