import { useEffect, useState, useRef, useCallback } from 'react';

const MinimalLoader = ({ onComplete, onShowLogin, canEnter = true, children }) => {
  const [phase, setPhase] = useState('loading');
  const [userLocation, setUserLocation] = useState(null);
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const finishTimer = useRef(null);
  const mapErrorHandler = useRef(null);
  const entryStarted = useRef(false);
  const completeRef = useRef(onComplete);
  completeRef.current = onComplete;
  useEffect(() => {
    if (phase === 'ready') completeRef.current?.();
  }, [phase]);

  useEffect(() => {
    const controller = new AbortController();
    fetch('https://restapi.amap.com/v3/ip?key=9fb3c3f43537ecacd6d0a082958a883c', {
      signal: controller.signal,
    })
      .then(r => r.json())
      .then(d => {
        if (d.status === '1' && d.rectangle) {
          const [p1, p2] = d.rectangle.split(';').map(p => p.split(',').map(Number));
          const loc = [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2];
          setUserLocation(loc);
          window.__userLocation = loc;
        } else {
          setUserLocation([117.28, 31.86]);
          window.__userLocation = [117.28, 31.86];
        }
      })
      .catch(() => {
        setUserLocation([117.28, 31.86]);
        window.__userLocation = [117.28, 31.86];
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    let retryTimer;
    const initMap = () => {
      if (!window.mapboxgl) {
        retryTimer = setTimeout(initMap, 250);
        return;
      }
      window.mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || '';
      window.mapboxgl.prewarm?.();

      try {
        // 检查 WebGL 支持
        if (!window.mapboxgl.supported()) {
          console.warn('WebGL not supported, skipping map initialization');
          setPhase('ready'); // 直接跳到准备状态
          return;
        }

        const map = new window.mapboxgl.Map({
          container: mapContainerRef.current,
          style: 'mapbox://styles/mapbox/streets-v12',
          center: [30, 20],
          zoom: window.innerWidth <= 760 ? 0.4 : 1.5,
          projection: 'globe',
          language: 'zh-Hans',
          interactive: true,
          scrollZoom: false,
          boxZoom: false,
          doubleClickZoom: false,
          touchZoomRotate: false,
          dragRotate: true,
          dragPan: true,
          keyboard: false,
          attributionControl: false,
          fadeDuration: 200,
          refreshExpiredTiles: true,
          antialias: true,
        });
        mapRef.current = map;
        map.setPadding?.(
          window.innerWidth <= 760
            ? { top: 0, left: 0, right: 0, bottom: window.innerHeight * 0.62 }
            : { top: 0, left: window.innerWidth * 0.4, right: 0, bottom: 0 }
        );
        map.on('style.load', () => {
          map.setFog({
            color: 'rgb(186, 210, 235)',
            'high-color': 'rgb(36, 92, 223)',
            'horizon-blend': 0.02,
            'space-color': 'rgb(11, 11, 25)',
            'star-intensity': 0.85,
          });
        });
        map.on('load', () => setPhase(current => (current === 'loading' ? 'ready' : current)));
        const onMapError = e => {
          console.warn('Map error:', e);
          // 即使地图出错，也允许继续
          setPhase(current => (current === 'loading' ? 'ready' : current));
        };
        mapErrorHandler.current = onMapError;
        map.on('error', onMapError);
      } catch (error) {
        console.warn('Failed to initialize map:', error);
        // WebGL 失败时直接跳过地图，进入应用
        setPhase('ready');
      }
    };
    initMap();
    return () => {
      clearTimeout(retryTimer);
      clearTimeout(finishTimer.current);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (phase !== 'ready' || !userLocation) return;
    // Preload only the destination viewport, without moving the visible globe.
    mapRef.current?.jumpTo?.({
      center: userLocation,
      zoom: 13,
      pitch: 0,
      bearing: 0,
      padding: { top: 0, left: 0, right: 0, bottom: 0 },
      preloadOnly: true,
    });
  }, [phase, userLocation]);

  useEffect(() => {
    if (phase !== 'loading' && phase !== 'ready') return;
    const resizeGlobe = () => {
      const map = mapRef.current;
      map?.resize?.();
      map?.setZoom?.(window.innerWidth <= 760 ? 0.4 : 1.5);
      map?.setPadding?.(
        window.innerWidth <= 760
          ? { top: 0, left: 0, right: 0, bottom: window.innerHeight * 0.62 }
          : { top: 0, left: window.innerWidth * 0.4, right: 0, bottom: 0 }
      );
    };
    window.addEventListener('resize', resizeGlobe);
    return () => window.removeEventListener('resize', resizeGlobe);
  }, [phase]);

  const handleEnter = useCallback(() => {
    if (phase !== 'ready') return;
    if (!canEnter) return;
    if (entryStarted.current) return;
    entryStarted.current = true;

    const target = userLocation || window.__userLocation || [117.28, 31.86];
    window.__loaderFinalState = { center: target, zoom: 13 };

    if (mapRef.current) {
      const map = mapRef.current;
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      map.stop?.();
      map.jumpTo?.({
        center: target, zoom: 13, pitch: 0, bearing: 0,
        padding: { top: 0, left: 0, right: 0, bottom: 0 }, preloadOnly: true,
      });
      map.dragPan?.disable();
      map.dragRotate?.disable();
      const finish = () => {
        // The workspace adopts this exact canvas and camera instead of rebuilding it.
        map.off?.('error', mapErrorHandler.current);
        window.__entryMap = map;
        mapRef.current = null;
        if (onShowLogin() === false) {
          delete window.__entryMap;
          mapRef.current = map;
          map.on('error', mapErrorHandler.current);
          map.dragPan?.enable();
          map.dragRotate?.enable();
          entryStarted.current = false;
          setPhase('ready');
        }
      };
      const zoomIn = () => {
        setPhase('flying');
        map.once('moveend', () => {
          finishTimer.current = setTimeout(finish, 0);
        });
        map.flyTo({
          center: target,
          zoom: 13,
          pitch: 0,
          bearing: 0,
          duration: reduceMotion ? 0 : 2300,
          easing: t => t * t * (3 - 2 * t),
        });
      };
      if (reduceMotion) {
        setPhase('flying');
        map.setPadding?.({ top: 0, left: 0, right: 0, bottom: 0 });
        finishTimer.current = setTimeout(() => {
          map.resize?.();
          zoomIn();
        }, 0);
      } else {
        setPhase('centering');
        map.once('moveend', zoomIn);
        map.easeTo({
          padding: { top: 0, left: 0, right: 0, bottom: 0 },
          duration: 300,
          easing: t => t * t * (3 - 2 * t),
        });
      }
    } else {
      onShowLogin();
    }
  }, [onShowLogin, userLocation, phase, canEnter]);

  if (phase === 'hidden') return null;

  const isReady = phase === 'ready';
  const isFlying = ['centering', 'rotating', 'flying'].includes(phase);
  const showUI = phase === 'loading' || phase === 'ready';
  const isFadeout = phase === 'fadeout';
  const isBlurred = phase === 'blurred';

  return (
    <div
      className={`globe-loader globe-split${isFlying ? ' is-entering' : ''}${phase !== 'centering' && isFlying ? ' is-centered' : ''}`}
      style={{
        opacity: isFadeout ? 0 : 1,
        filter: isBlurred ? 'blur(12px)' : 'none',
        transition: 'opacity 0.5s ease, filter 0.5s ease',
        pointerEvents: isBlurred || isFadeout || isFlying ? 'none' : 'auto',
      }}
    >
      <div ref={mapContainerRef} className="globe-map-container" />
      {(showUI || isFlying) && (
        <>
          <div className="globe-bottom-gradient" />
          <div className="globe-content" aria-hidden={isFlying}>
            <div className="globe-header">
              <h1 className="globe-title">地图相册</h1>
              <p className="globe-subtitle">记录每一个值得纪念的地点</p>
              <p className="globe-description">把照片留在地图上，让每一段旅程都有迹可循。</p>
            </div>
            <div className="globe-account-actions">{isReady && children}</div>
            <div className={`globe-action ${isReady ? 'is-ready' : ''}`}>
              <button
                type="button"
                className="globe-bar"
                onClick={isReady && canEnter ? handleEnter : undefined}
                disabled={!isReady || !canEnter}
                style={
                  isReady && !canEnter
                    ? { cursor: 'not-allowed', opacity: 0.5, pointerEvents: 'none' }
                    : {}
                }
              >
                <div className="globe-bar-fill" style={{ width: isReady ? '100%' : '0%' }} />
                <span className="globe-bar-text">
                  {isReady || isFlying ? '进入地图' : '正在加载地球…'}
                </span>
              </button>
              {isReady && !canEnter && <p className="globe-bar-hint">选择登录方式后进入地图</p>}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default MinimalLoader;
