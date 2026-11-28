import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import LazyPhoto from './LazyPhoto.jsx';

const thumbnail = 'data:image/png;base64,AA==';
const placeholder = 'data:image/png;base64,BB==';

function observeVisiblePhotos() {
  vi.stubGlobal('IntersectionObserver', class {
    constructor(callback) { this.callback = callback; }
    observe() { this.callback([{ isIntersecting: true }]); }
    disconnect() {}
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  delete window.electronAPI;
});

it('keeps the loaded thumbnail visible when saving notes replaces the photo object', async () => {
  observeVisiblePhotos();
  window.electronAPI = {
    getPlaceholderUrl: vi.fn().mockResolvedValue(placeholder),
    getThumbnailUrl: vi.fn().mockResolvedValue(thumbnail),
  };
  const view = render(<LazyPhoto photo={{ id: 'photo.jpg', note: '' }} alt="照片" />);
  await waitFor(() => expect(screen.getByAltText('照片')).toHaveAttribute('src', thumbnail));
  fireEvent.load(screen.getByAltText('照片'));
  expect(screen.getByAltText('照片')).toHaveStyle({ opacity: '1' });
  view.rerender(<LazyPhoto photo={{ id: 'photo.jpg', note: '11' }} alt="照片" />);
  await act(async () => {});
  expect(screen.getByAltText('照片')).toHaveStyle({ opacity: '1' });
  expect(view.container.querySelector('img[alt=""]')).toBeNull();
});

it('waits for a changed image to load instead of reusing the previous loaded state', async () => {
  observeVisiblePhotos();
  const view = render(<LazyPhoto photo={{ id: 'photo', data: thumbnail }} alt="照片" />);
  fireEvent.load(screen.getByAltText('照片'));
  view.rerender(<LazyPhoto photo={{ id: 'photo', data: placeholder }} alt="照片" />);
  expect(screen.getByAltText('照片')).toHaveStyle({ opacity: '0' });
  fireEvent.load(screen.getByAltText('照片'));
  expect(screen.getByAltText('照片')).toHaveStyle({ opacity: '1' });
});

it('ignores a late thumbnail response after switching to another photo', async () => {
  observeVisiblePhotos();
  let resolveOld;
  window.electronAPI = {
    getThumbnailUrl: vi.fn(id => id === 'old'
      ? new Promise(resolve => { resolveOld = resolve; })
      : Promise.resolve(placeholder)),
  };
  const view = render(<LazyPhoto photo={{ id: 'old' }} alt="照片" />);
  view.rerender(<LazyPhoto photo={{ id: 'new' }} alt="照片" />);
  await waitFor(() => expect(screen.getByAltText('照片')).toHaveAttribute('src', placeholder));
  fireEvent.load(screen.getByAltText('照片'));
  await act(async () => resolveOld(thumbnail));
  expect(screen.getByAltText('照片')).toHaveAttribute('src', placeholder);
  expect(screen.getByAltText('照片')).toHaveStyle({ opacity: '1' });
});

it('renders Blob photo data without throwing and revokes created object URL on unmount', () => {
  observeVisiblePhotos();
  const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-photo-1');
  const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

  try {
    const view = render(
      <LazyPhoto
        photo={{ id: 'blob-1', data: new Blob(['img'], { type: 'image/png' }) }}
        alt="Blob照片"
      />
    );
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(screen.getByAltText('Blob照片')).toHaveAttribute('src', 'blob:mock-photo-1');

    view.unmount();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock-photo-1');
  } finally {
    createObjectURL.mockRestore();
    revokeObjectURL.mockRestore();
  }
});

it('keeps a cached thumbnail URL available when a preview closes and reopens', async () => {
  observeVisiblePhotos();
  const photo = { id: 'shared-thumbnail' };
  const url = 'blob:shared-thumbnail';
  const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue(url);
  const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  const readThumbnailFile = vi.fn().mockResolvedValue({ bytes: new Uint8Array([1]) });
  window.electronAPI = { readThumbnailFile, readPhotoFile: vi.fn() };

  try {
    const preview = render(<LazyPhoto photo={photo} alt="地点预览" />);
    await waitFor(() => expect(screen.getByAltText('地点预览')).toHaveAttribute('src', url));
    preview.unmount();
    expect(revokeObjectURL).not.toHaveBeenCalledWith(url);

    const reopened = render(<LazyPhoto photo={photo} alt="地点预览" />);
    await waitFor(() => expect(screen.getByAltText('地点预览')).toHaveAttribute('src', url));
    expect(readThumbnailFile).toHaveBeenCalledTimes(1);
    reopened.unmount();
  } finally {
    createObjectURL.mockRestore();
    revokeObjectURL.mockRestore();
  }
});
