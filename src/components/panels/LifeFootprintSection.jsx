import { useEffect, useMemo, useState } from 'react';
import MapIcon from '../map/MapIcon.jsx';

function getCreatedAt(marker) {
  const value = marker?.createdAt;
  const numericValue = Number(value);
  const timestamp =
    Number.isFinite(numericValue) && numericValue > 0 ? numericValue : Date.parse(value || '');
  return Number.isFinite(timestamp) && Number.isFinite(new Date(timestamp).getTime())
    ? timestamp
    : 0;
}

function getPlaceName(marker) {
  return marker?.name || marker?.placeName || '未命名地点';
}

function getDirectPhotoUrl(photo) {
  if (typeof photo === 'string') {
    return /^(https?:|data:image\/|blob:|file:)/i.test(photo) ? photo : '';
  }

  const sources = [
    ['url', photo?.thumbnailUrl],
    ['thumbnail', photo?.thumbnail],
    ['url', photo?.url],
    ['url', photo?.src],
    ['data', photo?.data],
  ];

  for (const [type, source] of sources) {
    if (typeof source !== 'string' || !source.trim()) continue;
    if (/^(https?:|data:image\/|blob:|file:)/i.test(source) || /^(\/|\.\/|\.\.\/)/.test(source)) {
      return source;
    }
    if (type === 'data' || type === 'thumbnail') return `data:image/jpeg;base64,${source}`;
  }

  return '';
}

function getPhotoKey(photo) {
  if (typeof photo === 'object' && photo?.id) return `id:${photo.id}`;
  const url = getDirectPhotoUrl(photo);
  return url ? `url:${url}` : '';
}

function getPhotoCandidates(markers) {
  const candidates = [];
  const seen = new Set();
  const orderedMarkers = [...markers].sort((a, b) => getCreatedAt(b) - getCreatedAt(a));

  for (const marker of orderedMarkers) {
    const photos = [marker?.firstPhoto, ...(Array.isArray(marker?.photos) ? marker.photos : [])];
    for (const photo of photos) {
      const key = getPhotoKey(photo);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      candidates.push({ key, photo, placeName: getPlaceName(marker), marker });
      if (candidates.length === 12) return candidates;
    }
  }

  return candidates;
}

function hasStoredPhotos(marker) {
  return Boolean(marker?.photoCount > 0 || marker?.firstPhoto || marker?.photos?.length);
}

async function resolvePhotoUrl(photo, api) {
  const directUrl = getDirectPhotoUrl(photo);
  if (directUrl) return directUrl;
  if (!photo?.id || !api) return '';

  const resolvers = [api.getThumbnailUrl, api.getPhotoUrl].filter(
    resolver => typeof resolver === 'function'
  );
  for (const resolver of resolvers) {
    try {
      const url = await resolver.call(api, photo.id);
      if (typeof url === 'string' && url.trim()) return url;
    } catch {
      // Try the original photo API if thumbnail resolution fails.
    }
  }

  return '';
}

function usePhotoPreviews(markers) {
  const candidates = useMemo(() => getPhotoCandidates(markers), [markers]);
  const [resolution, setResolution] = useState({ entries: [], ready: false });

  useEffect(() => {
    let active = true;
    setResolution({ entries: [], ready: candidates.length === 0 });
    if (!candidates.length)
      return () => {
        active = false;
      };

    const api = typeof window === 'undefined' ? null : window.electronAPI;
    Promise.all(
      candidates.map(async candidate => ({
        ...candidate,
        url: await resolvePhotoUrl(candidate.photo, api),
      }))
    ).then(entries => {
      if (active) setResolution({ entries, ready: true });
    });

    return () => {
      active = false;
    };
  }, [candidates]);

  return resolution;
}

export default function LifeFootprintSection({ markers, onSelectMarker, onPreviewPhoto }) {
  const recentMarker = useMemo(() => {
    return (
      markers
        .filter(marker => getCreatedAt(marker) > 0)
        .sort((a, b) => getCreatedAt(b) - getCreatedAt(a))[0] || null
    );
  }, [markers]);
  const photoResolution = usePhotoPreviews(markers);
  const resolvedPhotos = photoResolution.entries;
  const availablePhotos = resolvedPhotos.filter(photo => photo.url);
  const timestamp = getCreatedAt(recentMarker);
  const dateLabel = timestamp
    ? new Date(timestamp).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
    : '';
  const placeName = recentMarker ? getPlaceName(recentMarker) : '';
  const recentPhotoObject = recentMarker?.firstPhoto || recentMarker?.photos?.[0];
  const recentPhotoKey = getPhotoKey(recentPhotoObject);
  const recentPhoto =
    getDirectPhotoUrl(recentPhotoObject) ||
    resolvedPhotos.find(photo => photo.key === recentPhotoKey)?.url ||
    '';
  const recentHasPhoto = hasStoredPhotos(recentMarker);
  const recentPhotoCount = recentMarker?.photoCount ?? recentMarker?.photos?.length ?? (recentPhotoObject ? 1 : 0);
  const recentNote =
    recentMarker?.photos?.find(p => typeof p === 'object' && p?.note?.trim())?.note?.trim() ||
    recentMarker?.note?.trim() ||
    '';
  const hasStoredPhoto = markers.some(hasStoredPhotos);
  const stripPreviews = recentPhoto
    ? availablePhotos.filter(item => item.key !== recentPhotoKey).slice(0, 3)
    : availablePhotos.slice(0, 3);
  const showStripSection =
    stripPreviews.length > 0 || (!recentPhoto && (hasStoredPhoto || markers.length === 0));
  const stripColsClass = stripPreviews.length <= 2 ? 'cols-2' : 'cols-3';

  const recentContent = recentPhoto ? (
    <>
      <div className="life-recent-hero-cover">
        <img className="life-recent-photo" src={recentPhoto} alt={`${placeName}的地点照片`} />
        <span className="life-recent-hero-tag">
          {dateLabel}
          {recentPhotoCount > 0 ? ` · ${recentPhotoCount} 张` : ''}
        </span>
      </div>
      <div className="life-recent-hero-foot">
        <div className="life-recent-copy">
          <strong>{placeName}</strong>
          <time dateTime={new Date(timestamp).toISOString()}>
            {recentNote || `地点创建于 ${dateLabel}`}
          </time>
        </div>
        {onSelectMarker && <span className="life-recent-cta">地图定位 →</span>}
      </div>
    </>
  ) : (
    <>
      <div className="life-recent-copy">
        <strong>{placeName}</strong>
        <time dateTime={new Date(timestamp).toISOString()}>
          {onSelectMarker ? `地点创建于 ${dateLabel} · 点击定位` : `地点创建于 ${dateLabel}`}
        </time>
      </div>
      <div className="life-recent-photo-empty" role="img" aria-label="地点照片状态">
        <MapIcon name="photo" />
        <span>
          {recentHasPhoto
            ? photoResolution.ready
              ? '照片暂不可预览'
              : '正在读取封面'
            : '暂无照片'}
        </span>
      </div>
    </>
  );

  return (
    <>
      <section className="life-recent-section" aria-labelledby="life-recent-title">
        <div className="life-recent-heading">
          <h3 id="life-recent-title">
            <MapIcon name="pin" />
            最近足迹
          </h3>
        </div>
        {recentMarker ? (
          onSelectMarker ? (
            <button
              type="button"
              className={`life-recent-card is-interactive ${recentPhoto ? 'is-hero' : ''}`}
              onClick={() => onSelectMarker(recentMarker)}
            >
              {recentContent}
            </button>
          ) : (
            <article className={`life-recent-card ${recentPhoto ? 'is-hero' : ''}`}>
              {recentContent}
            </article>
          )
        ) : (
          <div className="life-recent-empty" role="status">
            <MapIcon name="map" />
            <div>
              <strong>{markers.length ? '暂无可显示的最近地点' : '还没有足迹'}</strong>
              <span>
                {markers.length
                  ? '地点创建时间可用于整理最近记录。'
                  : '从地图添加地点，再为它保存照片和备注。'}
              </span>
            </div>
          </div>
        )}
      </section>

      {showStripSection && (
        <section className="life-photo-strip" aria-labelledby="life-photo-strip-title">
          <h3 id="life-photo-strip-title">{recentPhoto ? '更多片段' : '照片片段'}</h3>
          {stripPreviews.length ? (
            <div className={`life-photo-strip-list ${stripColsClass}`}>
              {stripPreviews.map(({ key, url, placeName: photoPlace, photo, marker }) =>
                onPreviewPhoto && marker ? (
                  <button
                    type="button"
                    key={key}
                    className="life-photo-strip-item is-interactive"
                    onClick={() => onPreviewPhoto(marker, photo)}
                  >
                    <img src={url} alt={`${photoPlace}的地点照片`} loading="lazy" decoding="async" />
                    <span className="life-strip-caption" title={photoPlace}>
                      {photoPlace}
                    </span>
                  </button>
                ) : (
                  <figure key={key} className="life-photo-strip-item">
                    <img src={url} alt={`${photoPlace}的地点照片`} loading="lazy" decoding="async" />
                    <figcaption title={photoPlace}>{photoPlace}</figcaption>
                  </figure>
                )
              )}
            </div>
          ) : (
            <p className="life-photo-strip-empty">
              {hasStoredPhoto
                ? photoResolution.ready
                  ? '已有照片暂不可预览，请检查照片文件是否可访问。'
                  : '正在读取地点照片…'
                : markers.length
                  ? '为地点添加照片后，会在这里显示封面。'
                  : '添加地点和照片后，这里会留下你的照片片段。'}
            </p>
          )}
        </section>
      )}
    </>
  );
}
