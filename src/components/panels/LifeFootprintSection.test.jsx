import { cleanup, render, screen, waitFor } from '@testing-library/react';
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
});
