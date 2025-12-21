import { useEffect, useState, useRef, useCallback } from 'react';

const MinimalLoader = ({ onComplete }) => {
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState('loading');
  const [userLocation, setUserLocation] = useState(null);
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch('https://restapi.amap.com/v3/ip?key=9fb3c3f43537ecacd6d0a082958a883c', { 
      signal: controller.signal 
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
    const initMap = () => {
      if (!window.mapboxgl) { setTimeout(initMap, 100); return; }
      window.mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || 
        'pk.eyJ1IjoiZm43cXAiLCJhIjoiY21peTUyd3B5MGJqMTNjcTU4aDVtdnNqNiJ9.TadVpAbhvEATQxuflxmqdA';
      const map = new window.mapboxgl.Map({
        container: mapContainerRef.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [30, 20], zoom: 1.5, projection: 'globe',
        interactive: true, scrollZoom: false, boxZoom: false,
        doubleClickZoom: false, touchZoomRotate: false,
        dragRotate: true, dragPan: true, keyboard: false, attributionControl: false,
        fadeDuration: 200, maxTileCacheSize: 4000, antialias: true
      });
      mapRef.current = map;
      map.on('style.load', () => {
        map.setFog({
          color: 'rgb(186, 210, 235)', 'high-color': 'rgb(36, 92, 223)',
          'horizon-blend': 0.02, 'space-color': 'rgb(11, 11, 25)', 'star-intensity': 0.6
        });
      });
    };
    initMap();
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const duration = 2500;
    let start = null, frame = null;
    const animate = (ts) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration * 100, 100);
      setProgress(p);
      if (p < 100) frame = requestAnimationFrame(animate);
      else setTimeout(() => setPhase('ready'), 300);
    };
    frame = requestAnimationFrame(animate);
    return () => frame && cancelAnimationFrame(frame);
  }, []);

  const handleEnter = useCallback(() => {
    if (!mapRef.current || phase !== 'ready') return;
    setPhase('flying');
    const map = mapRef.current;
    const target = userLocation || window.__userLocation || [117.28, 31.86];
    
    window.__loaderFinalState = { center: target, zoom: 13 };
    
    map.flyTo({ center: target, zoom: 13, duration: 2000, essential: true });
    
    map.once('moveend', () => {
      // 飞行完成后淡出
      setPhase('fadeout');
      // 淡出完成后通知主应用
      setTimeout(() => {
        setPhase('hidden');
        onComplete();
      }, 300);
    });
  }, [onComplete, userLocation, phase]);

  if (phase === 'hidden') return null;

  const isReady = phase === 'ready';
  const showUI = phase === 'loading' || phase === 'ready';
  const isFadeout = phase === 'fadeout';

  return (
    <div className="globe-loader" style={{ opacity: isFadeout ? 0 : 1, transition: 'opacity 0.3s ease' }}>
      <div ref={mapContainerRef} className="globe-map-container" />
      {showUI && (
        <>
          <div className="globe-bottom-gradient" />
          <div className="globe-content">
            <div className="globe-header">
              <h1 className="globe-title">地图相册</h1>
              <p className="globe-subtitle">记录每一个值得纪念的地点</p>
            </div>
            <div className={`globe-action ${isReady ? 'is-ready' : ''}`}>
              <div className="globe-bar" onClick={isReady ? handleEnter : undefined}
                role={isReady ? 'button' : undefined} tabIndex={isReady ? 0 : undefined}>
                <div className="globe-bar-fill" style={{ width: isReady ? '100%' : `${progress}%` }} />
                <span className="globe-bar-text">{isReady ? '进入地图' : `${Math.round(progress)}%`}</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default MinimalLoader;
