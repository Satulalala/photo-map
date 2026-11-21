import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import MarkerContextMenu from './MarkerContextMenu.jsx';

vi.mock('../api/index.js', () => ({
  default: {
    photos: { addBatch: vi.fn() },
    markers: { update: vi.fn() },
  },
}));

vi.mock('./photos/LazyPhoto.jsx', () => ({
  default: ({ photo, alt, className }) => (
    <img src={photo.data || ''} alt={alt} className={className} />
  ),
}));

vi.mock('../hooks/useMarkerMenuDrop.js', () => ({
  default: () => ({
    handleContextDrop: vi.fn(),
    handleMarkerDrop: vi.fn(),
    processing: false,
  }),
}));

function makePhotos(count) {
  return Array.from({ length: count }, (_, idx) => ({
    id: `photo-${idx + 1}`,
    data: `data:image/png;base64,AA==#${idx}`,
    note: '',
  }));
}

function createProps(overrides = {}) {
  return {
    contextMenu: null,
    setContextMenu: vi.fn(),
    markerMenu: null,
    setMarkerMenu: vi.fn(),
    placeName: '西湖风景区',
    setPlaceName: vi.fn(),
    setPreviewPin: vi.fn(),
    setNewMarkerIds: vi.fn(),
    setMarkers: vi.fn(),
    refreshMarkers: vi.fn(),
    deleteMarkerById: vi.fn(),
    addPhotoMarker: vi.fn(),
    fetchPlaceName: vi.fn(),
    showToast: vi.fn(),
    setPhotoViewer: vi.fn(),
    setNotesPanel: vi.fn(),
    closeContextMenu: vi.fn(),
    ...overrides,
  };
}

function makeMarkerMenu(photoCount, name = '断桥残雪') {
  return {
    x: 240,
    y: 180,
    marker: {
      id: 'marker-1',
      name,
      lat: 30.258,
      lng: 120.151,
      photos: makePhotos(photoCount),
    },
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('matchMedia', () => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

it('renders text-only card without collage when marker has 0 photos', () => {
  render(<MarkerContextMenu {...createProps({ markerMenu: makeMarkerMenu(0) })} />);

  expect(screen.getByRole('dialog', { name: '地点详情' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /查看 .* 第/ })).toBeNull();
  expect(document.querySelector('.marker-collage')).toBeNull();
  expect(screen.getByText('0 张')).toBeVisible();
  expect(screen.getByRole('button', { name: '添加照片' })).toBeVisible();
  expect(screen.getByRole('button', { name: '删除标记' })).toBeVisible();
  expect(screen.queryByRole('button', { name: '查看照片' })).toBeNull();
  expect(screen.queryByRole('button', { name: '备注' })).toBeNull();
});

it('adapts bento collage layout for 1, 2, and 3+ photos', () => {
  const { rerender } = render(
    <MarkerContextMenu {...createProps({ markerMenu: makeMarkerMenu(1) })} />
  );
  expect(document.querySelector('.marker-collage')).toHaveAttribute('data-count', '1');
  expect(document.querySelector('.marker-collage-more')).toBeNull();

  rerender(<MarkerContextMenu {...createProps({ markerMenu: makeMarkerMenu(2) })} />);
  expect(document.querySelector('.marker-collage')).toHaveAttribute('data-count', '2');
  expect(document.querySelector('.marker-collage-more')).toBeNull();

  rerender(<MarkerContextMenu {...createProps({ markerMenu: makeMarkerMenu(5) })} />);
  expect(document.querySelector('.marker-collage')).toHaveAttribute('data-count', '3');
  expect(document.querySelector('.marker-collage-more')).toHaveTextContent('+2');
});

it('opens photo viewer at clicked collage cell index and clears marker menu', () => {
  const setPhotoViewer = vi.fn();
  const setMarkerMenu = vi.fn();
  const markerMenu = makeMarkerMenu(4);

  render(
    <MarkerContextMenu
      {...createProps({ markerMenu, setPhotoViewer, setMarkerMenu })}
    />
  );

  fireEvent.click(screen.getByRole('button', { name: '查看 断桥残雪 第 2 张照片' }));

  expect(setPhotoViewer).toHaveBeenCalledWith({
    photos: markerMenu.marker.photos,
    index: 1,
    markerId: 'marker-1',
    returnToMenu: markerMenu,
  });
  expect(setMarkerMenu).toHaveBeenCalledWith(null);
});

it('keeps .closing state during exit transition before unmounting', () => {
  const baseProps = createProps({ markerMenu: makeMarkerMenu(1) });
  const { rerender } = render(<MarkerContextMenu {...baseProps} />);

  const dialog = screen.getByRole('dialog', { name: '地点详情' });
  expect(dialog).not.toHaveClass('closing');

  rerender(<MarkerContextMenu {...createProps({ markerMenu: null })} />);
  expect(screen.getByRole('dialog', { name: '地点详情' })).toHaveClass('closing');

  act(() => {
    vi.advanceTimersByTime(160);
  });
  expect(screen.queryByRole('dialog', { name: '地点详情' })).toBeNull();
});
