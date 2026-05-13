import { useState, useCallback, useRef, useDeferredValue, useEffect } from 'react';
import { gcj02ToWgs84 } from '../utils/mapUtils.js';

// 高德地图 Web服务 API Key
const AMAP_KEY = '9fb3c3f43537ecacd6d0a082958a883c';

/**
 * 计算两点之间的距离（km）
 */
function calcDistance(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * 搜索功能 Hook
 * 管理地图搜索相关的状态和逻辑
 */
export function useSearch(mapRef) {
  const [searchQuery, setSearchQuery] = useState('');
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchHistory, setSearchHistory] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('searchHistory') || '[]');
    } catch {
      return [];
    }
  });
  const [selectedResultIndex, setSelectedResultIndex] = useState(-1);
  const searchInputRef = useRef(null);

  // 保存搜索历史
  const saveToHistory = useCallback(result => {
    setSearchHistory(prev => {
      const filtered = prev.filter(h => h.name !== result.name);
      const newHistory = [
        { name: result.name, address: result.address, lng: result.lng, lat: result.lat },
        ...filtered
      ].slice(0, 10);
      localStorage.setItem('searchHistory', JSON.stringify(newHistory));
      return newHistory;
    });
  }, []);

  // 清除搜索历史
  const clearSearchHistory = useCallback(() => {
    setSearchHistory([]);
    localStorage.removeItem('searchHistory');
  }, []);

  // 搜索地名 - 高德 POI 搜索 + 输入提示 + 地理编码
  const searchPlace = useCallback(async query => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    setSelectedResultIndex(-1);

    try {
      const center = mapRef.current?.getCenter() || { lng: 117, lat: 32 };
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      let results = [];

      // 1. 使用输入提示 API（更精确，支持模糊匹配）
      const tipRes = await fetch(
        `https://restapi.amap.com/v3/assistant/inputtips?key=${AMAP_KEY}&keywords=${encodeURIComponent(query)}&location=${center.lng},${center.lat}&datatype=all`,
        { signal: controller.signal }
      );
      const tipData = await tipRes.json();

      if (tipData.status === '1' && tipData.tips?.length > 0) {
        // 过滤掉没有坐标的结果
        const validTips = tipData.tips.filter(t => t.location && t.location.includes(','));
        results = validTips.slice(0, 10).map(tip => {
          const [gcjLng, gcjLat] = tip.location.split(',').map(Number);
          // GCJ-02 转 WGS-84
          const { lng, lat } = gcj02ToWgs84(gcjLng, gcjLat);
          const dist = calcDistance(center.lng, center.lat, lng, lat);
          return {
            name: tip.name,
            address: tip.district || tip.address || '',
            type: tip.typecode || '',
            lng, lat,
            distance: dist < 1 ? `${Math.round(dist * 1000)}m` : `${dist.toFixed(1)}km`
          };
        });
      }

      // 2. 如果输入提示没结果，用 POI 搜索
      if (results.length === 0) {
        const poiRes = await fetch(
          `https://restapi.amap.com/v3/place/text?key=${AMAP_KEY}&keywords=${encodeURIComponent(query)}&offset=10&extensions=base`,
          { signal: controller.signal }
        );
        const poiData = await poiRes.json();

        if (poiData.status === '1' && poiData.pois?.length > 0) {
          results = poiData.pois.map(poi => {
            const [gcjLng, gcjLat] = poi.location.split(',').map(Number);
            // GCJ-02 转 WGS-84
            const { lng, lat } = gcj02ToWgs84(gcjLng, gcjLat);
            const dist = calcDistance(center.lng, center.lat, lng, lat);
            return {
              name: poi.name,
              address: (poi.pname || '') + (poi.cityname || '') + (poi.adname || ''),
              type: poi.type || '',
              lng, lat,
              distance: dist < 1 ? `${Math.round(dist * 1000)}m` : `${dist.toFixed(1)}km`
            };
          });
        }
      }

      // 3. 如果还没结果，用地理编码（搜索城市/地区名）
      if (results.length === 0) {
        const geoRes = await fetch(
          `https://restapi.amap.com/v3/geocode/geo?key=${AMAP_KEY}&address=${encodeURIComponent(query)}`,
          { signal: controller.signal }
        );
        const geoData = await geoRes.json();

        if (geoData.status === '1' && geoData.geocodes?.length > 0) {
          results = geoData.geocodes.map(geo => {
            const [gcjLng, gcjLat] = geo.location.split(',').map(Number);
            // GCJ-02 转 WGS-84
            const { lng, lat } = gcj02ToWgs84(gcjLng, gcjLat);
            const dist = calcDistance(center.lng, center.lat, lng, lat);
            return {
              name: geo.formatted_address || query,
              address: (geo.province || '') + (geo.city || '') + (geo.district || ''),
              type: 'region',
              lng, lat,
              distance: dist < 1 ? `${Math.round(dist * 1000)}m` : `${dist.toFixed(1)}km`
            };
          });
        }
      }

      clearTimeout(timeoutId);
      setSearchResults(results);
    } catch (e) {
      if (e.name !== 'AbortError') setSearchResults([]);
    }

    setIsSearching(false);
  }, [mapRef]);

  // 使用 useDeferredValue 自动处理搜索延迟
  useEffect(() => {
    if (deferredSearchQuery) {
      searchPlace(deferredSearchQuery);
    } else {
      setSearchResults([]);
    }
  }, [deferredSearchQuery, searchPlace]);

  // 选择搜索结果
  const selectSearchResult = useCallback(result => {
    if (mapRef.current) {
      // 根据类型调整缩放级别
      let zoom = 17; // 默认：POI/地址级别
      if (result.type === 'region' || result.type?.includes('省') || result.type?.includes('市')) {
        zoom = 14; // 省/市级别
      } else if (result.type?.includes('区') || result.type?.includes('县')) {
        zoom = 15; // 区/县级别
      }
      mapRef.current.flyTo({ center: [result.lng, result.lat], zoom, duration: 1500 });
    }
    saveToHistory(result);
    setShowSearchResults(false);
    setSearchQuery(result.name);
    setSelectedResultIndex(-1);
  }, [mapRef, saveToHistory]);

  // 搜索输入处理
  const handleSearchInput = useCallback(value => {
    setSearchQuery(value);
    setSelectedResultIndex(-1);
    if (value || searchHistory.length > 0) setShowSearchResults(true);
  }, [searchHistory.length]);

  // 搜索框获得焦点
  const handleSearchFocus = useCallback(() => {
    if (searchQuery || searchHistory.length > 0) setShowSearchResults(true);
  }, [searchQuery, searchHistory.length]);

  // 键盘导航
  const handleSearchKeyDown = useCallback(e => {
    const items = searchQuery ? searchResults : searchHistory;
    if (!items.length) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedResultIndex(prev => Math.min(prev + 1, items.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedResultIndex(prev => Math.max(prev - 1, -1));
    } else if (e.key === 'Enter' && selectedResultIndex >= 0) {
      e.preventDefault();
      selectSearchResult(items[selectedResultIndex]);
    } else if (e.key === 'Escape') {
      setShowSearchResults(false);
      searchInputRef.current?.blur();
    }
  }, [searchQuery, searchResults, searchHistory, selectedResultIndex, selectSearchResult]);

  return {
    // 状态
    searchQuery,
    deferredSearchQuery,
    searchResults,
    showSearchResults,
    isSearching,
    searchHistory,
    selectedResultIndex,
    searchInputRef,
    // 状态设置函数
    setSearchQuery,
    setSearchResults,
    setShowSearchResults,
    setSelectedResultIndex,
    // 操作函数
    searchPlace,
    selectSearchResult,
    clearSearchHistory,
    handleSearchInput,
    handleSearchFocus,
    handleSearchKeyDown,
  };
}
