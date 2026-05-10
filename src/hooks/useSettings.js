import { useState, useCallback } from 'react';

const defaultSettings = {
  antialias: true,
  fadeDuration: 200,
  maxTileCacheSize: 4000,
  dragRotate: false,
  renderWorldCopies: false,
  maxZoom: 18,
  minZoom: 0,
};

export function useSettings() {
  const [settingsTab, setSettingsTab] = useState('appearance');
  const [mapSettings, setMapSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('mapSettings');
      return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
    } catch {
      return defaultSettings;
    }
  });
  const [tempSettings, setTempSettings] = useState(mapSettings);
  const [uiThemeStyle, setUiThemeStyle] = useState(() => {
    try { return localStorage.getItem('uiThemeStyle') || 'note'; } catch { return 'note'; }
  });
  const [cacheStats, setCacheStats] = useState({ count: 0, size: 0 });

  const saveSettings = useCallback((newSettings) => {
    setMapSettings(newSettings);
    localStorage.setItem('mapSettings', JSON.stringify(newSettings));
  }, []);

  const saveTheme = useCallback((theme) => {
    setUiThemeStyle(theme);
    localStorage.setItem('uiThemeStyle', theme);
  }, []);

  return {
    settingsTab,
    mapSettings,
    tempSettings,
    uiThemeStyle,
    cacheStats,
    setSettingsTab,
    setMapSettings,
    setTempSettings,
    setUiThemeStyle,
    setCacheStats,
    saveSettings,
    saveTheme,
  };
}
