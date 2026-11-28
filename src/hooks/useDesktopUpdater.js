import { useState, useEffect, useCallback } from 'react';

const FALLBACK_VERSION = import.meta.env.VITE_APP_VERSION || '1.3.2';

function createInitialState() {
  return {
    status: 'idle',
    currentVersion: FALLBACK_VERSION,
    version: '',
    releaseNotes: '',
    percent: 0,
    bytesPerSecond: 0,
    transferred: 0,
    total: 0,
    message: '',
    silent: false,
  };
}

export function useDesktopUpdater() {
  const api = typeof window !== 'undefined' ? window.electronAPI : null;
  const isDesktop = Boolean(api && typeof api.getUpdaterState === 'function');
  const [state, setState] = useState(createInitialState);
  const [dismissedKey, setDismissedKey] = useState('');

  useEffect(() => {
    if (!isDesktop) return undefined;
    let active = true;

    api
      .getUpdaterState()
      .then(initial => {
        if (active && initial) setState(prev => ({ ...prev, ...initial }));
      })
      .catch(() => {});

    if (typeof api.getAppVersion === 'function') {
      api
        .getAppVersion()
        .then(ver => {
          if (active && ver) setState(prev => ({ ...prev, currentVersion: ver }));
        })
        .catch(() => {});
    }

    const unsubscribe =
      typeof api.onUpdateStatus === 'function'
        ? api.onUpdateStatus(nextState => {
            if (active && nextState) setState(prev => ({ ...prev, ...nextState }));
          })
        : () => {};

    return () => {
      active = false;
      unsubscribe();
    };
  }, [api, isDesktop]);

  const checkForUpdates = useCallback(
    async (options = { silent: false }) => {
      if (!isDesktop || typeof api.checkForUpdates !== 'function') return null;
      setDismissedKey('');
      const next = await api.checkForUpdates(options);
      if (next) setState(prev => ({ ...prev, ...next }));
      return next;
    },
    [api, isDesktop]
  );

  const downloadUpdate = useCallback(async () => {
    if (!isDesktop || typeof api.downloadUpdate !== 'function') return null;
    setDismissedKey('');
    return api.downloadUpdate();
  }, [api, isDesktop]);

  const quitAndInstall = useCallback(async () => {
    if (!isDesktop || typeof api.quitAndInstall !== 'function') return false;
    return api.quitAndInstall();
  }, [api, isDesktop]);

  const bannerKey = state.version ? `${state.status}:${state.version}` : state.status;
  const isBannerStatus =
    state.status === 'available' ||
    state.status === 'downloading' ||
    state.status === 'downloaded';

  const dismissBanner = useCallback(() => {
    if (state.version) {
      setDismissedKey(`${state.status}:${state.version}`);
    } else {
      setDismissedKey(state.status);
    }
  }, [state.status, state.version]);

  const bannerVisible = isDesktop && isBannerStatus && dismissedKey !== bannerKey;

  return {
    isDesktop,
    state,
    bannerVisible,
    checkForUpdates,
    downloadUpdate,
    quitAndInstall,
    dismissBanner,
  };
}

export default useDesktopUpdater;
