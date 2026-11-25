import { useState } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import PhotoViewer from './PhotoViewer.jsx';
import { useKeyboard } from '../../hooks/useKeyboard.js';

afterEach(() => {
  vi.useRealTimers();
});

function Harness() {
  const [viewer, setViewer] = useState({
    markerId: 'm',
    index: 0,
    photos: [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
  });
  useKeyboard({ photoViewer: viewer, setPhotoViewer: setViewer, setPhotoTransformed: vi.fn() });
  return viewer ? (
    <PhotoViewer
      photoViewer={viewer}
      setPhotoViewer={setViewer}
      currentPhotoUrl="blob:owned-by-loader"
      getPhotoNote={() => ''}
      markers={[]}
      setMarkerMenu={vi.fn()}
      refreshMarkers={vi.fn()}
      setPhotoEditor={vi.fn()}
    />
  ) : (
    <p>已关闭</p>
  );
}

it('one arrow press advances once even with the global map shortcuts registered', () => {
  render(<Harness />);
  fireEvent.keyDown(screen.getByRole('button', { name: '编辑照片' }), { key: 'ArrowRight' });
  expect(screen.getByText('2 / 3')).toBeInTheDocument();
  fireEvent.keyDown(screen.getByRole('button', { name: '编辑照片' }), { key: 'ArrowLeft' });
  expect(screen.getByText('1 / 3')).toBeInTheDocument();
});

it('does not revoke a borrowed photo URL when handing off to the editor', () => {
  const revoke = vi.fn();
  vi.stubGlobal('URL', { revokeObjectURL: revoke });
  const view = render(<Harness />);
  view.unmount();
  expect(revoke).not.toHaveBeenCalled();
  vi.unstubAllGlobals();
});

it('tracks directional transitions, supports filmstrip jump, and keeps .closing on exit', () => {
  vi.useFakeTimers();
  vi.stubGlobal('matchMedia', () => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));

  function DirectHarness() {
    const [viewer, setViewer] = useState({
      markerId: 'm',
      index: 0,
      photos: [
        { id: 'a', data: 'data:image/png;base64,AA==' },
        { id: 'b', data: 'data:image/png;base64,BB==' },
        { id: 'c', data: 'data:image/png;base64,CC==' },
      ],
    });
    return (
      <PhotoViewer
        photoViewer={viewer}
        setPhotoViewer={setViewer}
        currentPhotoUrl="blob:owned-by-loader"
        getPhotoNote={() => ''}
        markers={[]}
        setMarkerMenu={vi.fn()}
        refreshMarkers={vi.fn()}
        setPhotoEditor={vi.fn()}
      />
    );
  }

  const { container } = render(<DirectHarness />);
  fireEvent.click(screen.getByRole('button', { name: '下一张照片' }));
  expect(container.querySelector('.pv-photo-img')).toHaveClass('anim-next');

  fireEvent.click(screen.getByRole('tab', { name: '查看第 3 张照片' }));
  expect(screen.getByText('3 / 3')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: '上一张照片' }));
  expect(container.querySelector('.pv-photo-img')).toHaveClass('anim-prev');

  fireEvent.click(screen.getByRole('button', { name: '关闭照片查看器' }));
  expect(screen.getByRole('dialog', { name: '照片查看器' })).toHaveClass('closing');

  act(() => {
    vi.advanceTimersByTime(180);
  });
  expect(screen.queryByRole('dialog', { name: '照片查看器' })).toBeNull();
  vi.unstubAllGlobals();
});
