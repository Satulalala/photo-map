import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { register, login } from './auth.js';

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('auth API postAuth handling', () => {
  it('translates stale service-worker 503 Network unavailable and triggers SW update', async () => {
    const updateMock = vi.fn().mockResolvedValue(undefined);
    const getRegistrations = vi.fn().mockResolvedValue([{ update: updateMock }]);
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: { getRegistrations },
    });

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: 'Network unavailable', message: '网络不可用，请检查连接' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        })
      )
    );

    await expect(register('satula2501@163.com', 'secret123')).rejects.toThrow(
      '检测到旧版离线缓存拦截了请求，请刷新页面后重试；若刚刚提交过注册，可直接尝试登录。'
    );
    expect(getRegistrations).toHaveBeenCalledTimes(1);
    expect(updateMock).toHaveBeenCalledTimes(1);
  });

  it('surfaces backend error messages and network fetch errors cleanly', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ ok: false, error: '邮箱或密码错误' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        })
      )
    );
    await expect(login('user@example.com', 'badpass')).rejects.toThrow('邮箱或密码错误');

    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    await expect(login('user@example.com', 'secret123')).rejects.toThrow('网络连接失败，请检查网络后重试');
  });
});
