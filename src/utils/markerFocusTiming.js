const DEFAULT_CENTER_THRESHOLD_PX = 28;
const MIN_PAN_DURATION_MS = 320;
const MAX_PAN_DURATION_MS = 680;
const MIN_ZOOM_DURATION_MS = 680;
const MAX_ZOOM_DURATION_MS = 1250;

function prefersReducedMotion() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function clamp(min, max, value) {
  return Math.min(max, Math.max(min, Math.round(value)));
}

function getMapViewportSize(map) {
  const rect = map?.getContainer?.()?.getBoundingClientRect?.();
  if (rect && rect.width > 0 && rect.height > 0) {
    return { width: rect.width, height: rect.height };
  }
  if (typeof window !== 'undefined') {
    return {
      width: window.innerWidth || 1280,
      height: window.innerHeight || 800,
    };
  }
  return { width: 1280, height: 800 };
}

/**
 * 根据当前地图缩放层级与目标标记点到屏幕中心的像素距离，
 * 分别计算舒缓的镜头飞行时长（flyDuration）与卡片打开等待时间（openDelay）。
 */
export function computeMarkerFocusTiming(map, targetLngLat, options = {}) {
  const {
    minZoom = 15,
    preserveHigherZoom = true,
    centerThresholdPx = DEFAULT_CENTER_THRESHOLD_PX,
    reducedMotion = prefersReducedMotion(),
  } = options;

  const rawZoom = typeof map?.getZoom === 'function' ? Number(map.getZoom()) : NaN;
  const currentZoom = Number.isFinite(rawZoom) ? rawZoom : null;
  const targetZoom =
    currentZoom === null
      ? minZoom
      : preserveHigherZoom
        ? Math.max(currentZoom, minZoom)
        : minZoom;
  const zoomDelta =
    currentZoom === null
      ? 4
      : preserveHigherZoom
        ? Math.max(0, targetZoom - currentZoom)
        : Math.abs(targetZoom - currentZoom);

  const { width, height } = getMapViewportSize(map);
  const centerX = width / 2;
  const centerY = height / 2;
  const point = typeof map?.project === 'function' ? map.project(targetLngLat) : null;
  const hasPoint = Boolean(point && Number.isFinite(point.x) && Number.isFinite(point.y));
  const distancePx = hasPoint ? Math.hypot(point.x - centerX, point.y - centerY) : null;

  const isCentered = distancePx !== null && distancePx <= centerThresholdPx;
  const needsZoom = currentZoom === null ? true : zoomDelta > 0.08;
  const needsPan = distancePx === null ? true : !isCentered;
  const shouldFly = needsZoom || needsPan;

  if (reducedMotion || !shouldFly) {
    return {
      shouldFly,
      duration: 0,
      flyDuration: 0,
      openDelay: 0,
      targetZoom,
      zoomDelta,
      distancePx,
      isCentered,
    };
  }

  const maxRadius = Math.max(1, Math.hypot(centerX, centerY));
  const normalizedDist = distancePx === null ? 0.55 : Math.min(1.4, distancePx / maxRadius);

  // 镜头飞行保留充足的舒缓过渡时间，避免大幅度快速缩放带来眩晕感
  const flyDuration = needsZoom
    ? clamp(
        MIN_ZOOM_DURATION_MS,
        MAX_ZOOM_DURATION_MS,
        560 + zoomDelta * 55 + (needsPan ? normalizedDist * 260 : 0)
      )
    : clamp(MIN_PAN_DURATION_MS, MAX_PAN_DURATION_MS, 280 + normalizedDist * 400);

  // 卡片弹出时机根据是否已在屏幕中心及缩放跨度动态决定
  let openDelay = flyDuration;
  if (isCentered && needsZoom) {
    openDelay = clamp(180, Math.round(flyDuration * 0.72), 160 + zoomDelta * 45);
  } else if (needsPan && needsZoom) {
    openDelay = clamp(360, flyDuration, Math.round(flyDuration * (0.72 + Math.min(0.24, normalizedDist * 0.28))));
  }

  return {
    shouldFly,
    duration: flyDuration,
    flyDuration,
    openDelay,
    targetZoom,
    zoomDelta,
    distancePx,
    isCentered,
  };
}

/**
 * 依据动态计算出的飞行时间移动镜头到目标标记点，
 * 支持等待彻底落地（waitMode: 'arrival'）或按动态 openDelay 提前弹出卡片（waitMode: 'card'）。
 */
export function flyToMarkerTarget(map, targetLngLat, options = {}) {
  const { waitMode = 'arrival' } = options;
  const timing = computeMarkerFocusTiming(map, targetLngLat, options);
  if (!map || !timing.shouldFly || typeof map.flyTo !== 'function') {
    return { timing, promise: Promise.resolve(), cancel: () => {} };
  }

  const targetWaitMs = waitMode === 'card' ? timing.openDelay : timing.flyDuration;
  let cancel = () => {};

  const promise = new Promise(resolve => {
    let settled = false;
    let timer = null;

    const cleanup = () => {
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
      if (typeof map.off === 'function') {
        map.off('moveend', finish);
      }
    };

    function finish() {
      if (settled) return;
      settled = true;
      cleanup();
      resolve();
    }

    cancel = finish;

    // 先终止旧镜头移动，避免旧 moveend 误触发；再在 flyTo 前注册以兼容同步完成。
    if (typeof map.stop === 'function') {
      map.stop();
    }
    if (typeof map.once === 'function') {
      map.once('moveend', finish);
    }

    const fallbackWait = waitMode === 'card' && targetWaitMs < timing.flyDuration
      ? targetWaitMs
      : targetWaitMs + 80;
    timer = setTimeout(finish, fallbackWait);

    map.flyTo({
      center: targetLngLat,
      zoom: timing.targetZoom,
      duration: timing.flyDuration,
    });
  });

  return { timing, promise, cancel };
}
