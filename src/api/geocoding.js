/**
 * 地理编码 API（Mapbox Geocoding）
 */

export const geocodingApi = {
  async reverseGeocode(lat, lng) {
    try {
      const token = window.mapboxgl?.accessToken;
      if (!token) {
        throw new Error('Mapbox token not found');
      }

      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?` +
        `access_token=${token}&language=zh&limit=1`
      );

      if (!response.ok) {
        throw new Error('Geocoding request failed');
      }

      const data = await response.json();

      if (data.features?.[0]) {
        const place = data.features[0].place_name_zh || data.features[0].place_name || '';
        return place.replace(/\s*\d{5,6}\s*$/, '').replace(/,\s*$/, '');
      }

      return '';
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      return '';
    }
  },

  async searchPlace(query) {
    try {
      const token = window.mapboxgl?.accessToken;
      if (!token) {
        throw new Error('Mapbox token not found');
      }

      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?` +
        `access_token=${token}&language=zh&limit=5`
      );

      if (!response.ok) {
        throw new Error('Search request failed');
      }

      const data = await response.json();

      return (data.features || []).map(feature => ({
        id: feature.id,
        name: feature.text,
        fullName: feature.place_name_zh || feature.place_name,
        coordinate: {
          lng: feature.center[0],
          lat: feature.center[1],
        },
        category: feature.properties?.category,
      }));
    } catch (error) {
      console.error('Place search error:', error);
      return [];
    }
  },
};
