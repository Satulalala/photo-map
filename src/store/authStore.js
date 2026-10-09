import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * ��֤״̬���� ���� ��¼/�ǳ�/�û���Ϣ
 * �־û��� localStorage
 */
const useAuthStore = create(
  persist(
    set => ({
      // ---- ��¼״̬ ----
      isLoggedIn: false,
      user: null,
      showButtons: false,

      setIsLoggedIn: v => set({ isLoggedIn: v }),
      setUser: v => set({ user: v }),
      setShowButtons: v => set({ showButtons: v }),

      // ---- ��¼���� ----
      login: userData =>
        set({ isLoggedIn: true, user: userData, showButtons: false }),

      logout: () =>
        set({
          isLoggedIn: false,
          user: null,
          showButtons: false,
        }),
    }),
    {
      name: 'photomap-auth',
      partialize: state => ({
        isLoggedIn: state.isLoggedIn,
        user: state.user,
      }),
    }
  )
);

export default useAuthStore;
