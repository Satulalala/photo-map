import { createRef } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import Toolbar from './Toolbar.jsx';
import SearchBar from './SearchBar.jsx';
import AlbumButton from './AlbumButton.jsx';

vi.mock('../photos/LazyPhoto.jsx', () => ({
  default: ({ photo, className, alt }) => (
    <img src={photo?.data || ''} className={className} alt={alt} />
  ),
}));

it('names map actions and exposes the heatmap toggle state', () => {
  const onZoomIn = vi.fn();
  const onToggleHeatmap = vi.fn();
  render(
    <Toolbar heatmapMode showLife={false} onZoomIn={onZoomIn} onToggleHeatmap={onToggleHeatmap} />
  );
  fireEvent.click(screen.getByRole('button', { name: '放大地图' }));
  fireEvent.click(screen.getByRole('button', { name: '照片热力图', pressed: true }));
  expect(onZoomIn).toHaveBeenCalledOnce();
  expect(onToggleHeatmap).toHaveBeenCalledOnce();
});

it('connects keyboard selection to the named search result and keeps input focused when clearing', () => {
  const ref = createRef();
  const onClear = vi.fn();
  render(
    <SearchBar
      searchQuery="杭州"
      searchResults={[{ name: '杭州西湖', address: '浙江杭州' }]}
      searchHistory={[]}
      showSearchResults
      selectedResultIndex={0}
      isSearching={false}
      searchInputRef={ref}
      onClear={onClear}
      onSelectResult={vi.fn()}
      onSelectedResultIndexChange={vi.fn()}
    />
  );
  const input = screen.getByRole('combobox', { name: '搜索地点或地址' });
  expect(input).toHaveAttribute('aria-activedescendant', screen.getByRole('option').id);
  fireEvent.click(screen.getByRole('button', { name: '清空搜索' }));
  expect(onClear).toHaveBeenCalledOnce();
  expect(input).toHaveFocus();
});

it('uses the shared SVG icon system for categorized search results', () => {
  const { container } = render(
    <SearchBar
      searchQuery="咖啡"
      searchResults={[{ name: '咖啡馆', address: '杭州', type: '餐饮' }]}
      searchHistory={[]}
      showSearchResults
      selectedResultIndex={0}
      isSearching={false}
      searchInputRef={createRef()}
      onInputChange={vi.fn()}
      onFocus={vi.fn()}
      onKeyDown={vi.fn()}
      onClear={vi.fn()}
      onSelectResult={vi.fn()}
      onSelectedResultIndexChange={vi.fn()}
    />
  );

  expect(container.querySelector('[data-icon="restaurant"]')).toBeTruthy();
});

it('renders cover stack in AlbumButton when photos exist and falls back to stacked album icon at zero photos', () => {
  const { container, rerender } = render(
    <AlbumButton
      totalPhotos={4}
      totalPlaces={2}
      coverPhoto={{ id: 'c1', data: 'data:image/png;base64,AA==' }}
      show={false}
      reveal={false}
      showLife={false}
      onClick={vi.fn()}
      onOpenLife={vi.fn()}
    />
  );

  expect(screen.getByRole('button', { name: '打开我的相册，4 张照片，2 个地点' })).toBeVisible();
  expect(container.querySelector('[data-icon="life"]')).toBeTruthy();
  expect(container.querySelector('.album-cover-stack')).toBeTruthy();
  expect(container.querySelector('[data-icon="album"]')).toBeNull();

  rerender(
    <AlbumButton
      totalPhotos={0}
      totalPlaces={0}
      coverPhoto={null}
      show={false}
      reveal={false}
      showLife={false}
      onClick={vi.fn()}
      onOpenLife={vi.fn()}
    />
  );

  expect(container.querySelector('.album-cover-stack')).toBeNull();
  expect(container.querySelector('[data-icon="album"]')).toBeTruthy();
});
