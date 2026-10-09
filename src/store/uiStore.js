import { create } from 'zustand';
import { getTheme, setTheme } from '../utils/themeManager.js';

/**
 * UI ״̬���� ���� ���������Toast��ȫ�� loading
 */
const useUIStore = create(set => ({
  theme: getTheme(),
  changeTheme: theme => {
    setTheme(theme);
    set({ theme });
  },
  // ---- ������� ----
  showSettings: false,
  showSocial: false,
  showLife: false,
  showMergeDialog: false,
  showVillageModal: false,

  setShowSettings: v => set({ showSettings: v }),
  setShowSocial: v => set({ showSocial: v }),
  setShowLife: v => set({ showLife: v }),
  setShowMergeDialog: v => set({ showMergeDialog: v }),
  setShowVillageModal: v => set({ showVillageModal: v }),

  // ---- Toast ֪ͨ ----
  toast: null,
  showToast: (type, message, duration = 2500) => {
    set({ toast: { type, message } });
    setTimeout(() => set({ toast: null }), duration);
  },

  // ---- ȫ�ּ��� ----
  appLoading: true,
  setAppLoading: v => set({ appLoading: v }),

  // ---- ��ׯ����λ�� ----
  villageRect: null,
  villageReady: false,
  villageClosing: false,
  setVillageRect: v => set({ villageRect: v }),
  setVillageReady: v => set({ villageReady: v }),
  setVillageClosing: v => set({ villageClosing: v }),
}));

export default useUIStore;
