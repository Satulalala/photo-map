import { renderHook, act } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { useSearch } from './useSearch.js';

beforeEach(() => localStorage.clear());

it('closes the search popup with Escape even when there are no results', () => {
  const mapRef = { current: null };
  const { result } = renderHook(() => useSearch(mapRef));
  act(() => result.current.setShowSearchResults(true));
  const event = { key: 'Escape', preventDefault: vi.fn() };
  act(() => result.current.handleSearchKeyDown(event));
  expect(result.current.showSearchResults).toBe(false);
});

it('selects a history item with the keyboard and moves the map', () => {
  const place = { name: '西湖', address: '杭州', lng: 120.15, lat: 30.24 };
  localStorage.setItem('searchHistory', JSON.stringify([place]));
  const flyTo = vi.fn();
  const mapRef = { current: { flyTo } };
  const { result } = renderHook(() => useSearch(mapRef));
  act(() => result.current.handleSearchFocus());
  act(() => result.current.handleSearchKeyDown({ key: 'ArrowDown', preventDefault: vi.fn() }));
  act(() => result.current.handleSearchKeyDown({ key: 'Enter', preventDefault: vi.fn() }));
  expect(flyTo).toHaveBeenCalledWith(expect.objectContaining({ center: [120.15, 30.24] }));
  expect(result.current.showSearchResults).toBe(false);
});
