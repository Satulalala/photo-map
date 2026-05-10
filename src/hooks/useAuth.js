import { useState, useCallback } from 'react';
import { getCurrentUser, logout as authLogout } from '../api/auth.js';

export function useAuth(showToast) {
  const [isLoggedIn, setIsLoggedIn] = useState(() => !!getCurrentUser());
  const [userChose, setUserChose] = useState(() => !!getCurrentUser());
  const [user, setUser] = useState(() => getCurrentUser());
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [offlinePrompted, setOfflinePrompted] = useState(false);

  const handleLogin = useCallback((userData) => {
    setUser(userData);
    setIsLoggedIn(true);
    setUserChose(true);
    setShowLoginModal(false);
    showToast('success', '登录成功！');
  }, [showToast]);

  const handleSkipLogin = useCallback(() => {
    setIsLoggedIn(true);
    setUserChose(true);
    setShowLoginModal(false);
    showToast('info', '以游客模式继续');
  }, [showToast]);

  const handleLogout = useCallback(() => {
    authLogout();
    setUser(null);
    setIsLoggedIn(false);
    setUserChose(false);
    showToast('info', '已退出登录');
  }, [showToast]);

  const handleEnterMapFromLoader = useCallback((setMapEntered) => {
    if (navigator.onLine) {
      setOfflinePrompted(false);
      setMapEntered(true);
      return;
    }
    if (offlinePrompted) return;
    setOfflinePrompted(true);
    const goOffline = window.confirm('当前无网络连接。是否以离线模式进入地图？\n\n离线模式可查看/新增本地标记与照片，但地球村不可用。');
    if (goOffline) {
      setMapEntered(true);
      showToast('info', '已进入离线模式');
    }
  }, [showToast, offlinePrompted]);

  return {
    isLoggedIn,
    userChose,
    user,
    showLoginModal,
    offlinePrompted,
    setIsLoggedIn,
    setUserChose,
    setUser,
    setShowLoginModal,
    setOfflinePrompted,
    handleLogin,
    handleSkipLogin,
    handleLogout,
    handleEnterMapFromLoader,
  };
}
