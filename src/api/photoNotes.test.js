import { afterEach, expect, it, vi } from 'vitest';
import { savePhotoNotes } from './photoNotes.js';
import { photosApi } from './markers.js';

vi.mock('./markers.js', () => ({ photosApi: { update: vi.fn() } }));

afterEach(() => {
  delete window.electronAPI;
  vi.clearAllMocks();
});

it('saves desktop notes through the existing batch bridge, including legacy photos', async () => {
  window.electronAPI = {
    loadMarkers: vi.fn(),
    batchUpdatePhotoNotes: vi.fn().mockResolvedValue(true),
  };
  // The real preload has no updatePhoto method.
  await savePhotoNotes('place', [{ id: 'photo' }, 'data:image/png;base64,AA=='], ['11', '']);
  expect(window.electronAPI.batchUpdatePhotoNotes).toHaveBeenCalledWith('place', ['11', '']);
  expect(photosApi.update).not.toHaveBeenCalled();
});

it('propagates a desktop write failure so the editor keeps the draft for retry', async () => {
  window.electronAPI = {
    loadMarkers: vi.fn(),
    batchUpdatePhotoNotes: vi.fn().mockRejectedValue(new Error('database write failed')),
  };
  await expect(savePhotoNotes('place', [{ id: 'photo' }], ['11'])).rejects.toThrow('database write failed');
});

it('rejects an unsuccessful desktop save instead of reporting success', async () => {
  window.electronAPI = {
    loadMarkers: vi.fn(),
    batchUpdatePhotoNotes: vi.fn().mockResolvedValue(false),
  };
  await expect(savePhotoNotes('place', [{ id: 'photo' }], ['11'])).rejects.toThrow('照片备注保存失败');
});

it('updates Web photos by ID and allows clearing a note', async () => {
  await savePhotoNotes('place', [{ id: 'second' }, { id: 'first' }], ['11', '']);
  expect(photosApi.update.mock.calls).toEqual([
    ['place', 'second', { note: '11' }],
    ['place', 'first', { note: '' }],
  ]);
});
