import { useState, useEffect, useCallback, memo } from 'react';

// 懒加载缩略图组件
const LazyPhoto = memo(function LazyPhoto({ photo, className, alt = '' }) {
  const [src, setSrc] = useState('');
  
  useEffect(() => {
    if (!photo) return;
    if (typeof photo === 'string') { setSrc(photo); return; }
    if (photo.data?.startsWith('data:')) { setSrc(photo.data); return; }
    if (photo.id && window.electronAPI) {
      window.electronAPI.getThumbnailUrl(photo.id).then(url => url && setSrc(url));
    }
  }, [photo]);
  
  if (!src) return <div className={className} style={{ background: '#f0f0f0' }} />;
  return <img src={src} alt={alt} className={className} loading="lazy" />;
});

/**
 * 照片搜索面板组件 - 懒加载
 */
function PhotoSearchPanel({ 
  setPhotoSearchMode,
  setPhotoViewer,
  mapRef
}) {
  const [photoSearchQuery, setPhotoSearchQuery] = useState('');
  const [photoSearchResults, setPhotoSearchResults] = useState([]);
  const [isPhotoSearching, setIsPhotoSearching] = useState(false);

  // 搜索照片
  const searchPhotos = useCallback(async (query) => {
    if (!query.trim() || !window.electronAPI?.searchPhotos) {
      setPhotoSearchResults([]);
      return;
    }
    setIsPhotoSearching(true);
    try {
      const results = await window.electronAPI.searchPhotos(query);
      setPhotoSearchResults(results);
    } catch {
      setPhotoSearchResults([]);
    }
    setIsPhotoSearching(false);
  }, []);

  return (
    <div className="photo-search-overlay" onClick={() => setPhotoSearchMode(false)}>
      <div className="photo-search-panel" onClick={e => e.stopPropagation()}>
        <div className="photo-search-header">
          <h3>🔍 搜索照片备注</h3>
          <button className="panel-close" onClick={() => setPhotoSearchMode(false)}>✕</button>
        </div>
        <div className="photo-search-input-wrap">
          <input
            type="text"
            placeholder="输入备注关键词..."
            value={photoSearchQuery}
            onChange={e => {
              setPhotoSearchQuery(e.target.value);
              searchPhotos(e.target.value);
            }}
            autoFocus
          />
          {photoSearchQuery && (
            <button className="search-clear" onClick={() => {
              setPhotoSearchQuery('');
              setPhotoSearchResults([]);
            }}>✕</button>
          )}
        </div>
        <div className="photo-search-results">
          {isPhotoSearching ? (
            <div className="search-loading"><span className="loading-spinner"></span>搜索中...</div>
          ) : photoSearchResults.length > 0 ? (
            photoSearchResults.map((result, i) => (
              <div 
                key={i} 
                className="photo-search-item"
                onClick={async () => {
                  // 飞到标记位置
                  if (mapRef.current) {
                    mapRef.current.flyTo({ center: [result.lng, result.lat], zoom: 15, duration: 1000 });
                  }
                  // 获取完整标记数据并打开照片查看器
                  if (window.electronAPI?.getMarkerDetail) {
                    const detail = await window.electronAPI.getMarkerDetail(result.markerId);
                    if (detail) {
                      const photoIndex = detail.photos.findIndex(p => p.id === result.fileId);
                      setPhotoViewer({
                        photos: detail.photos,
                        index: photoIndex >= 0 ? photoIndex : 0,
                        markerId: result.markerId
                      });
                    }
                  }
                  setPhotoSearchMode(false);
                }}
              >
                <LazyPhoto photo={{ id: result.fileId }} className="photo-search-thumb" />
                <div className="photo-search-info">
                  <div className="photo-search-note">{result.note}</div>
                  <div className="photo-search-location">📍 {result.markerName || `${result.lat.toFixed(3)}°, ${result.lng.toFixed(3)}°`}</div>
                </div>
              </div>
            ))
          ) : photoSearchQuery ? (
            <div className="search-empty">未找到包含 "{photoSearchQuery}" 的备注</div>
          ) : (
            <div className="search-tip">输入关键词搜索照片备注</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default PhotoSearchPanel;
