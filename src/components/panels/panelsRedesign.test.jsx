import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import LifePanel from './LifePanel.jsx';
import MarkerListPanel from './MarkerListPanel.jsx';
import ThemeControl from './ThemeControl.jsx';
import SettingsContent from './SettingsContent.jsx';
import useUIStore from '../../store/uiStore.js';

vi.mock('../photos/LazyPhoto.jsx', () => ({
  default: ({ photo, alt, className }) => (
    <img src={photo?.data || 'data:image/png;base64,AA=='} alt={alt} className={className} />
  ),
}));

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
  );
  useUIStore.setState({ theme: 'system' });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const SAMPLE_MARKER = {
  id: 'm-1',
  name: '西湖十景',
  lat: 30.242,
  lng: 120.148,
  province: '浙江省',
  country: '中国',
  createdAt: '2026-10-01T08:00:00.000Z',
  photoCount: 2,
  firstPhoto: { id: 'p-1', data: 'data:image/png;base64,AA==', note: '晨雾里的断桥' },
  photos: [
    { id: 'p-1', data: 'data:image/png;base64,AA==', note: '晨雾里的断桥' },
    { id: 'p-2', data: 'data:image/png;base64,BB==', note: '' },
  ],
};

function makeMarkerListProps(overrides = {}) {
  return {
    markers: [SAMPLE_MARKER],
    show: true,
    batchMode: false,
    selectedPhotos: [],
    markerListSearch: '',
    markerListSort: 'time-desc',
    markerListLayout: 'grid',
    markerListTimeFilter: 'all',
    markerListTimeRange: { start: '', end: '' },
    uiThemeStyle: 'default',
    markersLoading: false,
    noteSearchResults: [],
    semanticResults: [],
    isNoteSearching: false,
    isSemanticSearching: false,
    searchFocusIndex: -1,
    markerListReady: true,
    markerListClosing: false,
    markerListContentHidden: false,
    markerListRect: null,
    showSortMenu: false,
    showLayoutMenu: false,
    showTimeFilterMenu: false,
    onClose: vi.fn(),
    onSearch: vi.fn(),
    onSearchKeyDown: vi.fn(),
    onSort: vi.fn(),
    onLayout: vi.fn(),
    onTimeFilter: vi.fn(),
    onTimeRangeChange: vi.fn(),
    onBatchToggle: vi.fn(),
    onPhotoSelect: vi.fn(),
    onSetCover: vi.fn(),
    onDeletePhoto: vi.fn(),
    onAddPhoto: vi.fn(),
    onMarkerClick: vi.fn(),
    onNoteClick: vi.fn(),
    onSemanticClick: vi.fn(),
    onSortMenuToggle: vi.fn(),
    onLayoutMenuToggle: vi.fn(),
    onTimeFilterMenuToggle: vi.fn(),
    onSearchFocusIndexChange: vi.fn(),
    onBatchDelete: vi.fn(),
    onBatchMerge: vi.fn(),
    ...overrides,
  };
}

describe('panels redesign interactions', () => {
  it('renders compact LifePanel metrics strip without duplicated overview section', () => {
    const { container } = render(
      <LifePanel
        open
        markers={[SAMPLE_MARKER]}
        totalPhotos={2}
        onClose={vi.fn()}
        onSelectMarker={vi.fn()}
      />
    );

    const metricsStrip = container.querySelector('.life-metrics-strip');
    expect(metricsStrip).toBeTruthy();
    expect(screen.getByText('标记地点')).toBeInTheDocument();
    expect(screen.getByText('照片存档')).toBeInTheDocument();
    expect(screen.getByText('最近足迹')).toBeInTheDocument();
    expect(screen.queryByText('足迹概览')).toBeNull();
  });

  it('shows marker count, single-item gallery layout class, and direct layout segmented toggle', () => {
    const onLayout = vi.fn();
    const { container, rerender } = render(<MarkerListPanel {...makeMarkerListProps({ onLayout })} />);

    expect(screen.getByText('· 1 处足迹')).toBeInTheDocument();
    expect(container.querySelector('.marker-grid-container.single-item')).toBeTruthy();

    const galleryBtn = screen.getByRole('button', { name: '画廊布局' });
    const listBtn = screen.getByRole('button', { name: '列表布局' });
    expect(galleryBtn).toHaveAttribute('aria-pressed', 'true');
    expect(listBtn).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(listBtn);
    expect(onLayout).toHaveBeenCalledWith('list');

    rerender(
      <MarkerListPanel
        {...makeMarkerListProps({
          markers: [SAMPLE_MARKER, { ...SAMPLE_MARKER, id: 'm-2', name: '钱塘江边' }],
        })}
      />
    );
    expect(screen.getByText('· 2 处足迹')).toBeInTheDocument();
    expect(container.querySelector('.marker-grid-container.single-item')).toBeNull();
  });

  it('switches theme through segmented buttons in ThemeControl', () => {
    render(<ThemeControl />);

    const darkBtn = screen.getByRole('button', { name: '深色' });
    const systemBtn = screen.getByRole('button', { name: '跟随系统' });
    expect(systemBtn).toHaveAttribute('aria-pressed', 'true');
    expect(darkBtn).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(darkBtn);
    expect(useUIStore.getState().theme).toBe('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(darkBtn).toHaveAttribute('aria-pressed', 'true');
  });

  it('displays 显示设置 heading and dirty save hint in SettingsContent', () => {
    const baseSettings = {
      antialias: true,
      dragRotate: false,
      renderWorldCopies: false,
      minZoom: 1,
      maxZoom: 18,
    };
    const commonProps = {
      settingsTab: 'appearance',
      user: null,
      mapSettings: baseSettings,
      tempSettings: baseSettings,
      cacheStats: { tiles: 0 },
      markersCount: 1,
      totalPhotos: 2,
      isOnline: true,
      syncConflictCount: 0,
      cloudSyncEnabled: false,
      guestImportDone: true,
      syncingNow: false,
      syncApiBase: '',
      onLogout: vi.fn(),
      onOpenLogin: vi.fn(),
      onTempSettingsChange: vi.fn(),
      onSaveSettings: vi.fn(),
      onCloseSettings: vi.fn(),
      onCloudSyncChange: vi.fn(),
      onSyncApiBaseChange: vi.fn(),
      onRunCloudSync: vi.fn(),
      onImportGuestData: vi.fn(),
      onClearTileCache: vi.fn(),
    };

    const { rerender } = render(<SettingsContent {...commonProps} />);
    expect(screen.getByRole('heading', { name: '显示设置' })).toBeInTheDocument();
    expect(screen.getByText('当前设置已生效')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '保存设置' })).toBeDisabled();

    rerender(
      <SettingsContent
        {...commonProps}
        tempSettings={{ ...baseSettings, antialias: false }}
      />
    );
    expect(screen.getByText('有未保存的设置更改')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '保存设置' })).toBeEnabled();
  });
});
