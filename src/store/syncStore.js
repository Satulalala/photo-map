import { create } from 'zustand';
import { DEFAULT_API_BASE } from '../api/apiBase.js';

/**
 * ͬ��״̬���� ���� �ƶ�ͬ�����ء����С�API ��ַ
 */
const useSyncStore = create(set => ({
  cloudSyncEnabled: false,
  syncingNow: false,
  syncQueueSize: 0,
  syncApiBase: DEFAULT_API_BASE,
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,

  setCloudSyncEnabled: v => set({ cloudSyncEnabled: v }),
  setSyncingNow: v => set({ syncingNow: v }),
  setSyncQueueSize: v => set({ syncQueueSize: v }),
  setSyncApiBase: v => set({ syncApiBase: v }),
  setIsOnline: v => set({ isOnline: v }),
}));

export default useSyncStore;
