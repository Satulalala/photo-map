import api from './index.js';

export async function loadLocalMarkerSnapshots() {
  const markers = await api.markers.getAll();
  return Promise.all((markers || []).map(async marker => {
    const photos = await api.photos.getByMarkerId(marker.id);
    return {
      ...marker,
      photos,
      photoCount: photos.length,
      firstPhoto: photos[0] || marker.firstPhoto || null,
    };
  }));
}
