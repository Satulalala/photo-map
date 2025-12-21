/**
 * 地图相册 - Zustand 状态管理
 * 
 * 使用 Zustand 进行全局状态管理，提供简洁的 API
 * 
 * @example
 * import { useAppStore, useMapStore, usePhotoStore } from './store';
 * 
 * // 在组件中使用
 * function MyComponent() {
 *   const markers = useAppStore(state => state.markers);
 *   const addMarker = useAppStore(state => state.addMarker);
 *   
 *   return <div>...</div>;
 * }
 */

import { create } from 'zustand';
import { devtools, persist, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import api from '../api';

// ========== 应用主 Store ==========

/**
 * 应用主状态 Store
 * 管理标记、照片、UI 状态等
 */
export const useAppStore = create(
  devtools(
    subscribeWithSelector(
      immer((set, get) => ({
        // ========== 状态 ==========
        
        /** 标记列表 */
        markers: [],
        
        /** 标记加载状态 */
        markersLoading: false,
        
        /** 新创建的标记 ID 集合（用于动画） */
        newMarkerIds: new Set(),
        
        /** 当前选中的标记 */
        selectedMarker: null,
        
        /** 照片查看器状态 */
        photoViewer: null,
        
        /** 照片编辑器状态 */
        photoEditor: null,
        
        /** 标记菜单状态 */
        markerMenu: null,
        
        /** 右键菜单状态 */
        contextMenu: null,
        
        /** 备注面板状态 */
        notesPanel: null,
        
        /** 是否显示设置面板 */
        showSettings: false,
        
        /** 是否显示标记列表 */
        showMarkerList: false,
        
        /** 全局错误 */
        error: null,
        
        // ========== 标记操作 ==========
        
        /**
         * 加载所有标记
         */
        loadMarkers: async () => {
          set({ markersLoading: true });
          try {
            const markers = await api.markers.getAll();
            set({ markers, markersLoading: false });
          } catch (error) {
            set({ error: error.message, markersLoading: false });
          }
        },
        
        /**
         * 添加标记
         */
        addMarker: async (data) => {
          try {
            const marker = await api.markers.create(data);
            set(state => {
              state.markers.push(marker);
              state.newMarkerIds.add(marker.id);
            });
            
            // 3秒后移除新标记标识
            setTimeout(() => {
              set(state => {
                state.newMarkerIds.delete(marker.id);
              });
            }, 3000);
            
            return marker;
          } catch (error) {
            set({ error: error.message });
            throw error;
          }
        },
        
        /**
         * 更新标记
         */
        updateMarker: async (id, data) => {
          try {
            await api.markers.update(id, data);
            set(state => {
              const index = state.markers.findIndex(m => m.id === id);
              if (index !== -1) {
                state.markers[index] = { ...state.markers[index], ...data };
              }
            });
          } catch (error) {
            set({ error: error.message });
            throw error;
          }
        },
        
        /**
         * 删除标记
         */
        deleteMarker: async (id) => {
          try {
            await api.markers.delete(id);
            set(state => {
              state.markers = state.markers.filter(m => m.id !== id);
              if (state.selectedMarker?.id === id) {
                state.selectedMarker = null;
              }
            });
          } catch (error) {
            set({ error: error.message });
            throw error;
          }
        },
        
        /**
         * 选中标记
         */
        selectMarker: (marker) => {
          set({ selectedMarker: marker });
        },
        
        // ========== 照片操作 ==========
        
        /**
         * 添加照片到标记
         */
        addPhotos: async (markerId, photos) => {
          try {
            const addedPhotos = await api.photos.addBatch(markerId, photos);
            set(state => {
              const marker = state.markers.find(m => m.id === markerId);
              if (marker) {
                marker.photoCount = (marker.photoCount || 0) + addedPhotos.length;
                if (!marker.firstPhoto && addedPhotos[0]) {
                  marker.firstPhoto = addedPhotos[0];
                }
              }
            });
            return addedPhotos;
          } catch (error) {
            set({ error: error.message });
            throw error;
          }
        },
        
        /**
         * 删除照片
         */
        deletePhoto: async (markerId, photoId) => {
          try {
            await api.photos.delete(markerId, photoId);
            set(state => {
              const marker = state.markers.find(m => m.id === markerId);
              if (marker) {
                marker.photoCount = Math.max(0, (marker.photoCount || 1) - 1);
              }
            });
          } catch (error) {
            set({ error: error.message });
            throw error;
          }
        },
        
        /**
         * 更新照片备注
         */
        updatePhotoNote: async (markerId, photoId, note) => {
          try {
            await api.photos.update(markerId, photoId, { note });
          } catch (error) {
            set({ error: error.message });
            throw error;
          }
        },
        
        // ========== UI 操作 ==========
        
        /**
         * 打开照片查看器
         */
        openPhotoViewer: (photos, index, markerId) => {
          set({ photoViewer: { photos, index, markerId } });
        },
        
        /**
         * 关闭照片查看器
         */
        closePhotoViewer: () => {
          set({ photoViewer: null });
        },
        
        /**
         * 切换照片查看器中的照片
         */
        setPhotoViewerIndex: (index) => {
          set(state => {
            if (state.photoViewer) {
              state.photoViewer.index = index;
            }
          });
        },
        
        /**
         * 打开照片编辑器
         */
        openPhotoEditor: (photo, markerId, photoIndex) => {
          set({ photoEditor: { photo, markerId, photoIndex } });
        },
        
        /**
         * 关闭照片编辑器
         */
        closePhotoEditor: () => {
          set({ photoEditor: null });
        },
        
        /**
         * 打开标记菜单
         */
        openMarkerMenu: (marker, x, y) => {
          set({ markerMenu: { marker, x, y } });
        },
        
        /**
         * 关闭标记菜单
         */
        closeMarkerMenu: () => {
          set({ markerMenu: null });
        },
        
        /**
         * 打开右键菜单
         */
        openContextMenu: (lngLat, x, y) => {
          set({ contextMenu: { lngLat, x, y } });
        },
        
        /**
         * 关闭右键菜单
         */
        closeContextMenu: () => {
          set({ contextMenu: null });
        },
        
        /**
         * 打开备注面板
         */
        openNotesPanel: (markerId, marker) => {
          set({ notesPanel: { markerId, marker } });
        },
        
        /**
         * 关闭备注面板
         */
        closeNotesPanel: () => {
          set({ notesPanel: null });
        },
        
        /**
         * 切换设置面板
         */
        toggleSettings: () => {
          set(state => ({ showSettings: !state.showSettings }));
        },
        
        /**
         * 切换标记列表
         */
        toggleMarkerList: () => {
          set(state => ({ showMarkerList: !state.showMarkerList }));
        },
        
        /**
         * 关闭所有弹窗
         */
        closeAllPopups: () => {
          set({
            markerMenu: null,
            contextMenu: null,
            notesPanel: null,
            showSettings: false,
          });
        },
        
        /**
         * 清除错误
         */
        clearError: () => {
          set({ error: null });
        },
      }))
    ),
    { name: 'app-store' }
  )
);

// ========== 地图 Store ==========

/**
 * 地图状态 Store
 */
export const useMapStore = create(
  devtools(
    persist(
      immer((set, get) => ({
        // ========== 状态 ==========
        
        /** 地图是否加载完成 */
        mapLoaded: false,
        
        /** 地图中心点 */
        center: { lat: 35.0, lng: 104.0 },
        
        /** 缩放级别 */
        zoom: 4,
        
        /** 地图样式 */
        style: 'streets',
        
        /** 是否显示热力图 */
        showHeatmap: false,
        
        /** 是否处于测量模式 */
        measureMode: false,
        
        /** 光标信息 */
        cursorInfo: { lat: 0, lng: 0, x: 0, y: 0 },
        
        /** 预览图钉 */
        previewPin: null,
        
        /** 当前地名 */
        placeName: '',
        
        // ========== 操作 ==========
        
        /**
         * 设置地图加载状态
         */
        setMapLoaded: (loaded) => {
          set({ mapLoaded: loaded });
        },
        
        /**
         * 设置地图中心点
         */
        setCenter: (center) => {
          set({ center });
        },
        
        /**
         * 设置缩放级别
         */
        setZoom: (zoom) => {
          set({ zoom });
        },
        
        /**
         * 设置地图样式
         */
        setStyle: (style) => {
          set({ style });
        },
        
        /**
         * 切换热力图
         */
        toggleHeatmap: () => {
          set(state => ({ showHeatmap: !state.showHeatmap }));
        },
        
        /**
         * 切换测量模式
         */
        toggleMeasureMode: () => {
          set(state => ({ measureMode: !state.measureMode }));
        },
        
        /**
         * 更新光标信息
         */
        updateCursorInfo: (info) => {
          set({ cursorInfo: info });
        },
        
        /**
         * 设置预览图钉
         */
        setPreviewPin: (pin) => {
          set({ previewPin: pin });
        },
        
        /**
         * 设置地名
         */
        setPlaceName: (name) => {
          set({ placeName: name });
        },
        
        /**
         * 飞行到指定位置
         */
        flyTo: (coordinate, zoom = 15) => {
          set({ center: coordinate, zoom });
          // 实际的地图飞行由组件处理
        },
      })),
      {
        name: 'map-store',
        partialize: (state) => ({
          center: state.center,
          zoom: state.zoom,
          style: state.style,
          showHeatmap: state.showHeatmap,
        }),
      }
    ),
    { name: 'map-store' }
  )
);

// ========== 搜索 Store ==========

/**
 * 搜索状态 Store
 */
export const useSearchStore = create(
  devtools(
    persist(
      immer((set, get) => ({
        // ========== 状态 ==========
        
        /** 搜索关键词 */
        query: '',
        
        /** 搜索结果 */
        results: [],
        
        /** 是否正在搜索 */
        isSearching: false,
        
        /** 搜索历史 */
        history: [],
        
        /** 备注搜索结果 */
        noteResults: [],
        
        /** 是否正在搜索备注 */
        isSearchingNotes: false,
        
        // ========== 操作 ==========
        
        /**
         * 设置搜索关键词
         */
        setQuery: (query) => {
          set({ query });
        },
        
        /**
         * 搜索地点
         */
        searchPlace: async (query) => {
          if (!query.trim()) {
            set({ results: [], isSearching: false });
            return;
          }
          
          set({ isSearching: true });
          
          try {
            const results = await api.geocoding.searchPlace(query);
            set({ results, isSearching: false });
            
            // 添加到搜索历史
            get().addToHistory(query);
          } catch (error) {
            set({ results: [], isSearching: false });
          }
        },
        
        /**
         * 搜索备注
         */
        searchNotes: async (query) => {
          if (!query.trim()) {
            set({ noteResults: [], isSearchingNotes: false });
            return;
          }
          
          set({ isSearchingNotes: true });
          
          try {
            const results = await api.photos.searchNotes(query);
            set({ noteResults: results, isSearchingNotes: false });
          } catch (error) {
            set({ noteResults: [], isSearchingNotes: false });
          }
        },
        
        /**
         * 清除搜索结果
         */
        clearResults: () => {
          set({ query: '', results: [], noteResults: [] });
        },
        
        /**
         * 添加到搜索历史
         */
        addToHistory: (query) => {
          set(state => {
            const history = state.history.filter(h => h !== query);
            history.unshift(query);
            state.history = history.slice(0, 20); // 最多保留 20 条
          });
        },
        
        /**
         * 清除搜索历史
         */
        clearHistory: () => {
          set({ history: [] });
        },
      })),
      {
        name: 'search-store',
        partialize: (state) => ({
          history: state.history,
        }),
      }
    ),
    { name: 'search-store' }
  )
);

// ========== 设置 Store ==========

/**
 * 设置状态 Store
 */
export const useSettingsStore = create(
  devtools(
    persist(
      immer((set, get) => ({
        // ========== 状态 ==========
        
        /** 当前设置标签页 */
        activeTab: 'map',
        
        /** 地图设置 */
        map: {
          style: 'streets',
          showHeatmap: false,
          showClusters: true,
          markerSize: 'medium',
        },
        
        /** 性能设置 */
        performance: {
          hardwareAcceleration: true,
          cacheLimit: 100,
          lazyLoading: true,
          thumbnailQuality: 80,
        },
        
        /** 存储设置 */
        storage: {
          dataPath: '',
          autoBackup: false,
          backupInterval: 7,
        },
        
        /** 语言 */
        language: 'zh-CN',
        
        /** 主题 */
        theme: 'system',
        
        // ========== 操作 ==========
        
        /**
         * 设置当前标签页
         */
        setActiveTab: (tab) => {
          set({ activeTab: tab });
        },
        
        /**
         * 更新地图设置
         */
        updateMapSettings: (settings) => {
          set(state => {
            state.map = { ...state.map, ...settings };
          });
        },
        
        /**
         * 更新性能设置
         */
        updatePerformanceSettings: (settings) => {
          set(state => {
            state.performance = { ...state.performance, ...settings };
          });
        },
        
        /**
         * 更新存储设置
         */
        updateStorageSettings: (settings) => {
          set(state => {
            state.storage = { ...state.storage, ...settings };
          });
        },
        
        /**
         * 设置语言
         */
        setLanguage: (language) => {
          set({ language });
        },
        
        /**
         * 设置主题
         */
        setTheme: (theme) => {
          set({ theme });
        },
        
        /**
         * 重置所有设置
         */
        resetAll: () => {
          set({
            map: {
              style: 'streets',
              showHeatmap: false,
              showClusters: true,
              markerSize: 'medium',
            },
            performance: {
              hardwareAcceleration: true,
              cacheLimit: 100,
              lazyLoading: true,
              thumbnailQuality: 80,
            },
            storage: {
              dataPath: '',
              autoBackup: false,
              backupInterval: 7,
            },
            language: 'zh-CN',
            theme: 'system',
          });
        },
      })),
      {
        name: 'settings-store',
      }
    ),
    { name: 'settings-store' }
  )
);

// ========== 选择器 ==========

/**
 * 获取标记数量
 */
export const selectMarkerCount = (state) => state.markers.length;

/**
 * 获取照片总数
 */
export const selectTotalPhotoCount = (state) => 
  state.markers.reduce((sum, m) => sum + (m.photoCount || 0), 0);

/**
 * 获取是否有任何弹窗打开
 */
export const selectHasOpenPopup = (state) => 
  !!(state.markerMenu || state.contextMenu || state.notesPanel || 
     state.showSettings || state.photoViewer || state.photoEditor);

// ========== 导出 ==========

export default {
  useAppStore,
  useMapStore,
  useSearchStore,
  useSettingsStore,
  selectMarkerCount,
  selectTotalPhotoCount,
  selectHasOpenPopup,
};