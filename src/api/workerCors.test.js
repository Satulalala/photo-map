import { describe, expect, it } from 'vitest';
import worker from '../../cloudflare/worker.js';

describe('Cloudflare desktop API CORS', () => {
  it('allows the packaged desktop app to preflight API requests', async () => {
    const request = new Request('https://photomap.satula.top/api/v1/auth/login', {
      method: 'OPTIONS',
      headers: {
        Origin: 'photomap://app',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'content-type',
      },
    });

    const response = await worker.fetch(request, {});

    expect(response.status).toBe(204);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('photomap://app');
    expect(response.headers.get('Access-Control-Allow-Headers')).toContain('Content-Type');
    expect(response.headers.get('Access-Control-Allow-Credentials')).toBe('true');
  });

  it('does not grant CORS access to other app origins', async () => {
    const request = new Request('https://photomap.satula.top/api/v1/auth/login', {
      method: 'OPTIONS',
      headers: {
        Origin: 'https://untrusted.example',
        'Access-Control-Request-Method': 'POST',
      },
    });

    const response = await worker.fetch(request, {});

    expect(response.status).toBe(403);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull();
  });

  it('allows the local Electron development origin', async () => {
    const request = new Request('https://photomap.satula.top/api/v1/auth/login', {
      method: 'OPTIONS',
      headers: {
        Origin: 'http://localhost:3000',
        'Access-Control-Request-Method': 'POST',
      },
    });

    const response = await worker.fetch(request, {});

    expect(response.status).toBe(204);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:3000');
    expect(response.headers.get('Access-Control-Allow-Credentials')).toBe('true');
  });
});
