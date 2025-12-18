/**
 * Zustand 状态管理
 */
import { create } from 'zustand';
import type {
  Marker,
  ToastType,
  ToastState,
  ContextMenuState,
  MarkerMenuState,
  PhotoViewerState,
  NotesPanelState,
  SearchResult,
  CacheStats,
} from '../types';

// ========== 应用状态 ==========
interface AppState {
  isLoggedIn: boolean;
  isLoggingIn: boolean;
  locateProgress: number;
  showSettings: boolean;
  settingsTab: string;
  showMarkerList: boolean;
  measureMode: boolean;
  isDragging: boolean;
  toast: ToastState | null;

  setIsLoggedIn: (v: boolean) => void;
  setIsLoggingIn: (v: boolean) => void;
  setLocateProgress: (v: number) => void;
  setShowSettings: (v: boolean) => void;
  setSettingsTab: (v: string) => void;
  setShowMarkerList: (v: boolean) => void;
  setMeasureMode: (v: boolean) => void;
  setIsDragging: (v: boolean) => void;
  showToast: (type: ToastType, message: string, duration?: number) => void;
}

export const useAppStore = create<AppState>((set) => ({
  isLoggedIn: false,
  isLoggingIn: false,
  locateProgress: 0,
  showSettings: false,
  settingsTab: 'map',
  showMarkerList: false,
  measureMode: false,
  isDragging: false,
  toast: null,

  setIsLoggedIn: (v) => set({ isLoggedIn: v }),
  setIsLoggingIn: (v) => set({ isLoggingIn: v }),
  setLocateProgress: (v) => set({ locateProgress: v }),
  setShowSettings: (v) => set({ showSettings: v }),
  setSettingsTab: (v) => set({ settingsTab: v }),
  setShowMarkerList: (v) => set({ showMarkerList: v }),
  setMeasureMode: (v) => set({ measureMode: v }),
  setIsDragging: (v) => set({ isDragging: v }),

  showToast: (type, message, duration = 2500) => {
    set({ toast: { type, message } });
    setTimeout(() => set({ toast: null }), duration);
  },
}));

// ========== 标记状态 ==========
interface MarkerState {
  markers: Marker[];
  markersLoading: boolean;
  markerListSort: string;
  markerListSearch: string;

  setMarkers: (markers: Marker[]) => void;
  setMarkersLoading: (v: boolean) => void;
  setMarkerListSort: (v: string) => void;
  setMarkerListSearch: (v: string) => void;
  loadMarkers: () => Promise<Marker[]>;
  refreshMarkers: () => Promise<void>;
  deleteMarker: (id: string) => Promise<void>;
}

export const useMarkerStore = create<MarkerState>((set, get) => ({
  markers: [],
  markersLoading: true,
  markerListSort: 'time',
  markerListSearch: '',

  setMarkers: (markers) => set({ markers }),
  setMarkersLoading: (v) => set({ markersLoading: v }),
  setMarkerListSort: (v) => set({ markerListSort: v }),
  setMarkerListSearch: (v) => set({ markerListSearch: v }),

  loadMarkers: async () => {
    set({ markersLoading: true });
    if (window.electronAPI) {
      const loaded = await window.electronAPI.loadMarkers();
      set({ markers: loaded, markersLoading: false });
      return loaded;
    }
    set({ markersLoading: false });
    return [];
  },

  refreshMarkers: async () => {
    if (window.electronAPI) {
      const loaded = await window.electronAPI.loadMarkers();
      set({ markers: loaded });
    }
  },

  deleteMarker: async (id) => {
    if (window.electronAPI) {
      await window.electronAPI.deleteMarker(id);
      get().refreshMarkers();
    }
  },
}));

// ========== 菜单状态 ==========
interface MenuState {
  contextMenu: ContextMenuState | null;
  markerMenu: MarkerMenuState | null;
  previewPin: { lat: number; lng: number } | null;
  placeName: string;

  setContextMenu: (v: ContextMenuState | null) => void;
  setMarkerMenu: (v: MarkerMenuState | null) => void;
  setPreviewPin: (v: { lat: number; lng: number } | null) => void;
  setPlaceName: (v: string) => void;
  closeAllMenus: () => void;
}

export const useMenuStore = create<MenuState>((set) => ({
  contextMenu: null,
  markerMenu: null,
  previewPin: null,
  placeName: '',

  setContextMenu: (v) => set({ contextMenu: v }),
  setMarkerMenu: (v) => set({ markerMenu: v }),
  setPreviewPin: (v) => set({ previewPin: v }),
  setPlaceName: (v) => set({ placeName: v }),
  closeAllMenus: () => set({ contextMenu: null, markerMenu: null, previewPin: null }),
}));

// ========== 照片查看器状态 ==========
interface PhotoViewerStoreState {
  photoViewer: PhotoViewerState | null;
  currentPhotoUrl: string;
  photoTransformed: boolean;

  setPhotoViewer: (v: PhotoViewerState | null) => void;
  setCurrentPhotoUrl: (v: string) => void;
  setPhotoTransformed: (v: boolean) => void;
  closeViewer: () => void;
}

export const usePhotoViewerStore = create<PhotoViewerStoreState>((set) => ({
  photoViewer: null,
  currentPhotoUrl: '',
  photoTransformed: false,

  setPhotoViewer: (v) => set({ photoViewer: v }),
  setCurrentPhotoUrl: (v) => set({ currentPhotoUrl: v }),
  setPhotoTransformed: (v) => set({ photoTransformed: v }),
  closeViewer: () => set({ photoViewer: null, currentPhotoUrl: '', photoTransformed: false }),
}));

// ========== 搜索状态 ==========
interface SearchState {
  searchQuery: string;
  searchResults: SearchResult[];
  showSearchResults: boolean;
  isSearching: boolean;

  setSearchQuery: (v: string) => void;
  setSearchResults: (v: SearchResult[]) => void;
  setShowSearchResults: (v: boolean) => void;
  setIsSearching: (v: boolean) => void;
  clearSearch: () => void;
}

export const useSearchStore = create<SearchState>((set) => ({
  searchQuery: '',
  searchResults: [],
  showSearchResults: false,
  isSearching: false,

  setSearchQuery: (v) => set({ searchQuery: v }),
  setSearchResults: (v) => set({ searchResults: v }),
  setShowSearchResults: (v) => set({ showSearchResults: v }),
  setIsSearching: (v) => set({ isSearching: v }),
  clearSearch: () => set({ searchQuery: '', searchResults: [], showSearchResults: false }),
}));

// ========== 备注状态 ==========
interface NotesState {
  noteEditor: { markerId: string; photoIndex: number; note: string } | null;
  notesPanel: NotesPanelState | null;
  notesEditing: boolean;
  editingNotes: string[];

  setNoteEditor: (v: { markerId: string; photoIndex: number; note: string } | null) => void;
  setNotesPanel: (v: NotesPanelState | null) => void;
  setNotesEditing: (v: boolean) => void;
  setEditingNotes: (v: string[]) => void;
  closeNotes: () => void;
}

export const useNotesStore = create<NotesState>((set) => ({
  noteEditor: null,
  notesPanel: null,
  notesEditing: false,
  editingNotes: [],

  setNoteEditor: (v) => set({ noteEditor: v }),
  setNotesPanel: (v) => set({ notesPanel: v }),
  setNotesEditing: (v) => set({ notesEditing: v }),
  setEditingNotes: (v) => set({ editingNotes: v }),
  closeNotes: () => set({ noteEditor: null, notesPanel: null, notesEditing: false, editingNotes: [] }),
}));

// ========== 地图设置 ==========
interface MapSettings {
  antialias: boolean;
  fadeDuration: number;
  maxTileCacheSize: number;
  dragRotate: boolean;
  renderWorldCopies: boolean;
  maxZoom: number;
  minZoom: number;
}

interface SettingsState {
  mapSettings: MapSettings;
  tempSettings: MapSettings | null;
  cacheStats: CacheStats;

  setMapSettings: (v: MapSettings) => void;
  setTempSettings: (v: MapSettings | null) => void;
  setCacheStats: (v: CacheStats) => void;
  initTempSettings: () => void;
  hasUnsavedChanges: () => boolean;
  saveSettings: () => void;
}

const defaultSettings: MapSettings = {
  antialias: true,
  fadeDuration: 200,
  maxTileCacheSize: 4000,
  dragRotate: false,
  renderWorldCopies: false,
  maxZoom: 18,
  minZoom: 0,
};

export const useSettingsStore = create<SettingsState>((set, get) => ({
  mapSettings: (() => {
    try {
      const saved = localStorage.getItem('mapSettings');
      return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
    } catch {
      return defaultSettings;
    }
  })(),
  tempSettings: null,
  cacheStats: { count: 0, size: 0 },

  setMapSettings: (v) => {
    set({ mapSettings: v });
    localStorage.setItem('mapSettings', JSON.stringify(v));
  },
  setTempSettings: (v) => set({ tempSettings: v }),
  setCacheStats: (v) => set({ cacheStats: v }),

  initTempSettings: () => set({ tempSettings: get().mapSettings }),
  hasUnsavedChanges: () => JSON.stringify(get().tempSettings) !== JSON.stringify(get().mapSettings),
  saveSettings: () => {
    const { tempSettings } = get();
    if (tempSettings) {
      set({ mapSettings: tempSettings });
      localStorage.setItem('mapSettings', JSON.stringify(tempSettings));
    }
  },
}));
