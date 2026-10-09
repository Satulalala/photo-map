import { render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import NotesPanel from './NotesPanel.jsx';

vi.mock('../photos/LazyPhoto.jsx', () => ({
  default: ({ photo, alt }) => <img src={photo.data} alt={alt} />,
}));

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
