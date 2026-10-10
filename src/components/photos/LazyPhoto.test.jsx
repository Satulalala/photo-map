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
