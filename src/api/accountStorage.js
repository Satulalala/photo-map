export function getAccountStorageDirectory(userId) {
  const id = Number(userId);
  if (!Number.isSafeInteger(id) || id <= 0) return null;
  return `account-${id}`;
}

export function getWebStorageDatabaseName(apiBase, userId, appOrigin) {
  const accountDirectory = getAccountStorageDirectory(userId);
  if (!accountDirectory) return 'photo-map-db';
  let serviceOrigin;
  try {
    serviceOrigin = new URL(apiBase || appOrigin || 'https://photomap.satula.top').origin;
  } catch {
    serviceOrigin = 'https://photomap.satula.top';
  }
  const safeOrigin = serviceOrigin.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  return `photo-map-${safeOrigin}-${accountDirectory}`;
}
