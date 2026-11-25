import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import NotesPanel from './NotesPanel.jsx';

vi.mock('../photos/LazyPhoto.jsx', () => ({
  default: ({ photo, alt, className }) => (
    <img src={photo.data} alt={alt} className={className} />
  ),
}));

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

it('shows photos and editable notes from detail when the desktop list only has summaries', () => {
  const photo = { id: 'photo', data: 'data:image/png;base64,AA==', note: '原有备注' };
  const props = {
    notesPanel: { markerId: 'marker', marker: { id: 'marker', photos: [photo] } },
    markers: [{ id: 'marker', photoCount: 1 }],
    editing: false,
    editingNotes: ['原有备注'],
    getPhotoNote: p => p.note,
    onClose: vi.fn(),
    onEdit: vi.fn(),
    onSave: vi.fn(),
    onCancel: vi.fn(),
  };
  const view = render(<NotesPanel {...props} />);
  expect(screen.getByAltText('照片1')).toHaveAttribute('src', photo.data);
  expect(screen.getByText('原有备注')).toBeVisible();
  view.rerender(<NotesPanel {...props} editing />);
  expect(screen.getByLabelText('照片 1 的备注')).toHaveValue('原有备注');
});

it('opens an enlarged photo preview dialog from the note thumbnail without closing the panel', () => {
  vi.useFakeTimers();
  vi.stubGlobal('matchMedia', () => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));

  const photo = { id: 'photo', data: 'data:image/png;base64,AA==', note: '西岸日落' };
  const onClose = vi.fn();
  render(
    <NotesPanel
      notesPanel={{ markerId: 'marker', marker: { id: 'marker', photos: [photo] } }}
      markers={[{ id: 'marker', photoCount: 1 }]}
      editing={false}
      editingNotes={['西岸日落']}
      getPhotoNote={p => p.note}
      onClose={onClose}
      onEdit={vi.fn()}
      onSave={vi.fn()}
      onCancel={vi.fn()}
    />
  );

  fireEvent.click(screen.getByRole('button', { name: '放大查看照片 1' }));
  expect(screen.getByRole('dialog', { name: '照片 1 大图预览' })).toBeInTheDocument();
  expect(screen.getByAltText('照片1大图')).toHaveAttribute('src', photo.data);

  fireEvent.click(screen.getByRole('button', { name: '关闭' }));
  act(() => {
    vi.advanceTimersByTime(180);
  });
  expect(screen.queryByRole('dialog', { name: '照片 1 大图预览' })).toBeNull();
  expect(screen.getByRole('dialog', { name: '照片备注' })).toBeInTheDocument();
  expect(onClose).not.toHaveBeenCalled();
});
