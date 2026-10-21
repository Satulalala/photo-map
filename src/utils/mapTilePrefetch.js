const MAP_TILE_SIZE = 512;
const MAX_NEIGHBOR_OFFSET = MAP_TILE_SIZE;
const MIN_NEIGHBOR_ZOOM = 6;
const PREFETCH_DEBOUNCE_MS = 700;
const PREFETCH_COOLDOWN_MS = 2500;

const diagonalDirections = [
  [-1, -1],
  [1, -1],
  [-1, 1],
  [1, 1],
];

function getViewportSize(container) {
  const bounds = container?.getBoundingClientRect?.();
  return {
    width: container?.clientWidth || bounds?.width || 0,
    height: container?.clientHeight || bounds?.height || 0,
  };
}

function getNeighborOffsets() {
  return { x: MAX_NEIGHBOR_OFFSET, y: MAX_NEIGHBOR_OFFSET };
}

export function getNeighborTileCacheSize(container) {
  const { width, height } = getViewportSize(container);
  if (!width || !height) return 0;

  const { x, y } = getNeighborOffsets();
  const columns = Math.ceil((width + x * 2) / MAP_TILE_SIZE) + 1;
  const rows = Math.ceil((height + y * 2) / MAP_TILE_SIZE) + 1;
  return Math.min(256, Math.max(12, columns * rows));
}

export function getNeighborTilePrefetchTargets(map) {
  if (!map?.getZoom || !map?.getCenter || !map?.getContainer || !map?.project || !map?.unproject) return [];
  if (map.getZoom() < MIN_NEIGHBOR_ZOOM) return [];

  const { width, height } = getViewportSize(map.getContainer());
  if (!width || !height) return [];

  const { x, y } = getNeighborOffsets();
  const projectedCenter = map.project(map.getCenter());

  return diagonalDirections.map(([directionX, directionY]) => {
    const target = map.unproject([
      projectedCenter.x + directionX * x,
      projectedCenter.y + directionY * y,
    ]);
    return { lng: target.lng, lat: target.lat };
  });
}

export function preloadNeighborTiles(map) {
  if (!map?.flyTo || map.isMoving?.()) return 0;
  if (map.isStyleLoaded && !map.isStyleLoaded()) return 0;
  if (map.areTilesLoaded && !map.areTilesLoaded()) return 0;

  const targets = getNeighborTilePrefetchTargets(map);
  const zoom = map.getZoom();
  if (!targets.length) return 0;

  targets.forEach(center => {
    map.flyTo({
      center,
      zoom,
      bearing: map.getBearing?.() ?? 0,
      pitch: map.getPitch?.() ?? 0,
      duration: 900,
      preloadOnly: true,
    });
  });

  return targets.length;
}


export function attachNeighborTilePrefetch(map) {
  if (!map?.on || !map?.off || !map?.flyTo) return () => {};

  let timer = null;
  let lastPrefetchedViewport = null;
  let lastPrefetchTime = 0;

  const prefetch = () => {
    timer = null;
    if (map.isMoving?.()) return;
    if (map.isStyleLoaded && !map.isStyleLoaded()) return;
    if (map.areTilesLoaded && !map.areTilesLoaded()) return;

    const center = map.getCenter?.();
    const zoom = map.getZoom?.();
    if (!center || !Number.isFinite(zoom)) return;

    const viewportKey = `${Math.round(center.lng * 1000)}:${Math.round(center.lat * 1000)}:${Math.round(zoom * 10)}`;
    if (viewportKey === lastPrefetchedViewport) return;

    const cooldown = PREFETCH_COOLDOWN_MS - (Date.now() - lastPrefetchTime);
    if (cooldown > 0) {
      timer = setTimeout(prefetch, cooldown);
      return;
    }

    const started = preloadNeighborTiles(map);
    if (started > 0) {
      lastPrefetchedViewport = viewportKey;
      lastPrefetchTime = Date.now();
    }
  };

  const schedule = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(prefetch, PREFETCH_DEBOUNCE_MS);
  };

  map.on('idle', schedule);
  map.on('moveend', schedule);
  schedule();

  return () => {
    if (timer) clearTimeout(timer);
    map.off('idle', schedule);
    map.off('moveend', schedule);
  };
}
