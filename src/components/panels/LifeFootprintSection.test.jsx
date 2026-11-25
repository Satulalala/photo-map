import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import LifeFootprintSection from './LifeFootprintSection.jsx';

afterEach(() => {
  cleanup();
  delete window.electronAPI;
});

describe('LifeFootprintSection desktop photo previews', () => {
  it('resolves an id-only first photo through the thumbnail IPC API', async () => {
    window.electronAPI = {
      getThumbnailUrl: vi.fn().mockResolvedValue('blob:desktop-cover'),
      getPhotoUrl: vi.fn(),
    };

    render(
      <LifeFootprintSection
        markers={[
          {
            id: 'marker-desktop',
            name: 'Queenstown',
            createdAt: '2026-10-07T08:30:00.000Z',
            photoCount: 1,
            firstPhoto: { id: 'photo-desktop', note: '' },
          },
        ]}
      />
    );

    await waitFor(() => {
      const images = screen.getAllByAltText('Queenstown的地点照片');
      expect(images.some(image => image.getAttribute('src') === 'blob:desktop-cover')).toBe(true);
    });
    expect(window.electronAPI.getThumbnailUrl).toHaveBeenCalledWith('photo-desktop');
  });

  it('shows an unavailable placeholder when both desktop photo APIs fail', async () => {
    window.electronAPI = {
      getThumbnailUrl: vi.fn().mockRejectedValue(new Error('thumbnail unavailable')),
      getPhotoUrl: vi.fn().mockRejectedValue(new Error('photo unavailable')),
    };

    render(
      <LifeFootprintSection
        markers={[
          {
            id: 'marker-with-missing-file',
            name: '京都',
            photoCount: 1,
            firstPhoto: { id: 'missing-file' },
          },
        ]}
      />
    );

    expect(
      await screen.findByText('已有照片暂不可预览，请检查照片文件是否可访问。')
    ).toBeInTheDocument();
    expect(window.electronAPI.getPhotoUrl).toHaveBeenCalledWith('missing-file');
  });

  it('hides duplicate photo strip when the hero covers the only resolved photo', () => {
    const photo = { id: 'p-1', data: 'data:image/png;base64,AA==', note: '湖边清晨' };
    const marker = {
      id: 'marker-single',
      name: '天鹅湖',
      createdAt: '2026-10-09T10:00:00.000Z',
      photoCount: 1,
      firstPhoto: photo,
      photos: [photo],
    };

    render(<LifeFootprintSection markers={[marker]} />);

    expect(screen.getAllByAltText('天鹅湖的地点照片')).toHaveLength(1);
    expect(screen.getByText('湖边清晨')).toBeInTheDocument();
    expect(screen.queryByText(/更多片段|照片片段/)).toBeNull();
  });

  it('triggers onSelectMarker and onPreviewPhoto when interactive handlers are provided', async () => {
    const onSelectMarker = vi.fn();
    const onPreviewPhoto = vi.fn();
    const photo = { id: 'p-1', data: 'data:image/png;base64,AA==', note: '' };
    const photo2 = { id: 'p-2', data: 'data:image/png;base64,BB==', note: '' };
    const marker = {
      id: 'marker-recent',
      name: '天鹅湖',
      createdAt: '2026-10-09T10:00:00.000Z',
      photoCount: 2,
      firstPhoto: photo,
      photos: [photo, photo2],
    };

    render(
      <LifeFootprintSection
        markers={[marker]}
        onSelectMarker={onSelectMarker}
        onPreviewPhoto={onPreviewPhoto}
      />
    );

    const recentBtn = screen.getByRole('button', { name: /天鹅湖/ });
    fireEvent.click(recentBtn);
    expect(onSelectMarker).toHaveBeenCalledWith(marker);

    await waitFor(() => {
      expect(screen.getByText('更多片段')).toBeInTheDocument();
      const stripImg = screen.getAllByAltText('天鹅湖的地点照片')[1];
      expect(stripImg).toBeTruthy();
      fireEvent.click(stripImg.closest('button'));
    });
    expect(onPreviewPhoto).toHaveBeenCalledWith(marker, photo2);
  });
});
