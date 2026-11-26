const APP_CSP_HEADER = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://api.mapbox.com blob:",
  "style-src 'self' 'unsafe-inline' https://api.mapbox.com",
  "img-src 'self' data: blob: file: https://*.mapbox.com https://*.tiles.mapbox.com",
  "font-src 'self' data:",
  "connect-src 'self' https://photomap.satula.top https://api.mapbox.com https://*.mapbox.com https://*.tiles.mapbox.com https://restapi.amap.com ws://localhost:* http://localhost:*",
  "worker-src 'self' blob:",
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

function isAppOriginUrl(rawUrl, isPackaged) {
  if (typeof rawUrl !== 'string' || !rawUrl) return false;
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol === 'photomap:' && parsed.host === 'app') {
      return true;
    }
    if (
      !isPackaged &&
      parsed.protocol === 'http:' &&
      (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') &&
      parsed.port === '3000'
    ) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

function applyAppCspHeaders(details, isPackaged) {
  const responseHeaders = details?.responseHeaders || {};
  if (!isAppOriginUrl(details?.url, isPackaged)) {
    return responseHeaders;
  }
  return {
    ...responseHeaders,
    'Content-Security-Policy': [APP_CSP_HEADER],
  };
}

module.exports = {
  APP_CSP_HEADER,
  isAppOriginUrl,
  applyAppCspHeaders,
};
