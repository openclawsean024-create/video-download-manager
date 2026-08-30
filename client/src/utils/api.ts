import type { ApiResponse } from '@/types';

const BASE = '/api';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(BASE + path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });
  let json: ApiResponse<T>;
  try {
    json = await res.json();
  } catch {
    throw new Error(`服务器响应错误 (${res.status})`);
  }
  if (!json.ok) {
    const err = new Error(json.message || json.error || 'Request failed') as Error & { code?: string; hint?: string };
    err.code = json.error;
    err.hint = json.hint;
    throw err;
  }
  return json.data as T;
}

export const api = {
  health: () => request<{ status: string; uptime: number; runningTasks: number; maxConcurrent: number }>('/health'),
  parse: (url: string) => request<any>('/parse', { method: 'POST', body: JSON.stringify({ url }) }),
  createTask: (body: { url: string; quality?: string; format?: string; title?: string; fileSize?: number }) =>
    request<any>('/tasks', { method: 'POST', body: JSON.stringify(body) }),
  listTasks: (filter?: { status?: string; platform?: string }) => {
    const q = new URLSearchParams();
    if (filter?.status) q.set('status', filter.status);
    if (filter?.platform) q.set('platform', filter.platform);
    return request<any[]>(`/tasks${q.toString() ? '?' + q.toString() : ''}`);
  },
  pauseTask: (id: string) => request<any>(`/tasks/${id}/pause`, { method: 'POST' }),
  resumeTask: (id: string) => request<any>(`/tasks/${id}/resume`, { method: 'POST' }),
  cancelTask: (id: string, deleteFile = false) =>
    request<any>(`/tasks/${id}/cancel`, { method: 'POST', body: JSON.stringify({ deleteFile }) }),
  retryTask: (id: string) => request<any>(`/tasks/${id}/retry`, { method: 'POST' }),
  deleteTask: (id: string, deleteFile = false) => request<any>(`/tasks/${id}?deleteFile=${deleteFile}`, { method: 'DELETE' }),
  batchDelete: (ids: string[], deleteFile = false) =>
    request<{ removed: number }>('/tasks/batch/delete', { method: 'POST', body: JSON.stringify({ ids, deleteFile }) }),
  stats: () => request<any>('/stats'),
  settings: () => request<any>('/settings'),
  updateSettings: (body: Record<string, any>) => request<any>('/settings', { method: 'PUT', body: JSON.stringify(body) }),
  system: () => request<any>('/settings/system'),
  listFiles: () => request<any[]>('/files/list'),
  openFile: (p: string) => request<{ path: string; url: string }>('/files/open', { method: 'POST', body: JSON.stringify({ path: p }) }),
  deleteFile: (p: string, removeTasks = false) =>
    request<any>('/files/delete', { method: 'POST', body: JSON.stringify({ path: p, removeTasks }) }),
};