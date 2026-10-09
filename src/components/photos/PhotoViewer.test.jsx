import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import PhotoViewer from './PhotoViewer.jsx';
import { useKeyboard } from '../../hooks/useKeyboard.js';

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
