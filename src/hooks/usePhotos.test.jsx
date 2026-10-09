import { act, renderHook, waitFor } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { usePhotos } from './usePhotos.js';

it('ignores old metadata and handles metadata read failures', async () => {
  const pending = {};
  window.electronAPI = {
    getPhotoInfo: vi.fn(
      id =>
        new Promise((resolve, reject) => {
          pending[id] = { resolve, reject };
        })
    ),
  };
  const { result, unmount } = renderHook(() => usePhotos());
  const photos = [
    { id: 'info-first', data: 'data:image/png,first' },
    { id: 'info-second', data: 'data:image/png,second' },
  ];
  act(() => result.current.setPhotoViewer({ photos, index: 0 }));
  act(() => result.current.setPhotoViewer({ photos, index: 1 }));
  await act(async () => pending['info-second'].resolve({ name: 'new' }));
  await act(async () => pending['info-first'].resolve({ name: 'old' }));
  expect(result.current.photoInfo).toEqual({ name: 'new' });
  act(() => result.current.setPhotoViewer({ photos, index: 0 }));
  await act(async () => pending['info-first'].reject(new Error('read failed')));
  expect(result.current.photoInfo).toBeNull();
  unmount();
  delete window.electronAPI;
});

it('keeps the newest photo when earlier loading completes out of order', async () => {
  const pending = {};
  window.electronAPI = {
    getPhotoUrl: vi.fn(
      id =>
        new Promise(resolve => {
          pending[id] = resolve;
        })
    ),
  };
  const { result, unmount } = renderHook(() => usePhotos());
  const photos = [{ id: 'race-first' }, { id: 'race-second' }];
  act(() => result.current.setPhotoViewer({ photos, index: 0 }));
  act(() => result.current.setPhotoViewer({ photos, index: 1 }));
  await act(async () => pending['race-second']('second.jpg'));
  await waitFor(() => expect(result.current.currentPhotoUrl).toBe('second.jpg'));
  await act(async () => pending['race-first']('first.jpg'));
  expect(result.current.currentPhotoUrl).toBe('second.jpg');
  unmount();
  delete window.electronAPI;
});
