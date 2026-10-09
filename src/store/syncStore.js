import { create } from 'zustand';

/**
 * ͬ��״̬���� ���� �ƶ�ͬ�����ء����С�API ��ַ
 */
const useSyncStore = create(set => ({
  cloudSyncEnabled: false,
  syncingNow: false,
  syncQueueSize: 0,
  syncApiBase: 'http://localhost:8080',
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,

  setCloudSyncEnabled: v => set({ cloudSyncEnabled: v }),
  setSyncingNow: v => set({ syncingNow: v }),
  setSyncQueueSize: v => set({ syncQueueSize: v }),
  setSyncApiBase: v => set({ syncApiBase: v }),
  setIsOnline: v => set({ isOnline: v }),
}));

export default useSyncStore;
