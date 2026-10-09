import { create } from 'zustand';

/**
 * ����״̬���� ���� ��������/���/��ʷ
 */
const useSearchStore = create(set => ({
  // ---- �������� ----
  searchQuery: '',
  deferredSearchQuery: '',
  isSearching: false,
  showSearchResults: false,

  setSearchQuery: v => set({ searchQuery: v }),
  setDeferredSearchQuery: v => set({ deferredSearchQuery: v }),
  setIsSearching: v => set({ isSearching: v }),
  setShowSearchResults: v => set({ showSearchResults: v }),

  // ---- ������� ----
  searchResults: [],
  selectedResultIndex: -1,
  searchHistory: [],

  setSearchResults: v => set({ searchResults: v }),
  setSelectedResultIndex: v => set({ selectedResultIndex: v }),
  setSearchHistory: v => set({ searchHistory: v }),
  clearSearchHistory: () => set({ searchHistory: [] }),

  // ---- �������� ----
  clearSearch: () =>
    set({
      searchQuery: '',
      searchResults: [],
      showSearchResults: false,
      selectedResultIndex: -1,
    }),
}));

export default useSearchStore;
