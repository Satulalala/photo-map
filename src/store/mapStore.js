import { create } from 'zustand';

/**
 * ��ͼ UI ״̬ ���� ����ģʽ������ͼ����ͼ����״̬
 * ע�⣺map ʵ��������������� useMap hook ͨ�� ref ����
 */
const useMapStore = create(set => ({
  // ---- ��ͼ����״̬ ----
  mapboxReady: false,
  mapEntered: false,
  mapLoaded: false,

  setMapboxReady: v => set({ mapboxReady: v }),
  setMapEntered: v => set({ mapEntered: v }),
  setMapLoaded: v => set({ mapLoaded: v }),

  // ---- ����ģʽ ----
  heatmapMode: false,
  measureMode: false,

  setHeatmapMode: v => set({ heatmapMode: v }),
  toggleHeatmap: () => set(s => ({ heatmapMode: !s.heatmapMode })),

  // ---- ���� ----
  measureStart: null,
  measureLines: [],

  setMeasureStart: v => set({ measureStart: v }),
  setMeasureLines: v => set({ measureLines: v }),
  clearMeasureLines: () => set({ measureLines: [] }),

  enterMeasureMode: () => set({ measureMode: true, measureStart: null, measureLines: [] }),
  exitMeasureMode: () =>
    set({ measureMode: false, measureStart: null, measureLines: [] }),

  // ---- ��λ���� ----
  locateProgress: 0,
  setLocateProgress: v => set({ locateProgress: v }),

  // ---- �ӿڰ汾��ǿ������Ⱦ�� ----
  viewportVersion: 0,
  bumpViewport: () => set(s => ({ viewportVersion: s.viewportVersion + 1 })),
}));

export default useMapStore;
