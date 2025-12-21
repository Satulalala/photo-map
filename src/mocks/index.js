/**
 * 开发环境 Mock 数据
 * 
 * 提供模拟数据用于开发和测试
 * 
 * @example
 * import { mockMarkers, mockPhotos, generateMockData } from './mocks';
 * 
 * // 使用预定义数据
 * const markers = mockMarkers;
 * 
 * // 生成随机数据
 * const randomMarkers = generateMockMarkers(10);
 */

// ========== 预定义标记数据 ==========

/**
 * 模拟标记数据
 * 包含中国主要城市的标记点
 */
export const mockMarkers = [
  {
    id: 'marker-001',
    lat: 39.9042,
    lng: 116.4074,
    name: '北京天安门',
    photoCount: 5,
    createdAt: Date.now() - 86400000 * 30,
    firstPhoto: {
      id: 'photo-001',
      thumbnail: generatePlaceholderImage(200, 200, '北京'),
      note: '天安门广场留念',
    },
  },
  {
    id: 'marker-002',
    lat: 31.2304,
    lng: 121.4737,
    name: '上海外滩',
    photoCount: 8,
    createdAt: Date.now() - 86400000 * 25,
    firstPhoto: {
      id: 'photo-002',
      thumbnail: generatePlaceholderImage(200, 200, '上海'),
      note: '外滩夜景',
    },
  },
  {
    id: 'marker-003',
    lat: 22.5431,
    lng: 114.0579,
    name: '深圳世界之窗',
    photoCount: 3,
    createdAt: Date.now() - 86400000 * 20,
    firstPhoto: {
      id: 'photo-003',
      thumbnail: generatePlaceholderImage(200, 200, '深圳'),
      note: '世界之窗游玩',
    },
  },
  {
    id: 'marker-004',
    lat: 30.5728,
    lng: 104.0668,
    name: '成都宽窄巷子',
    photoCount: 6,
    createdAt: Date.now() - 86400000 * 15,
    firstPhoto: {
      id: 'photo-004',
      thumbnail: generatePlaceholderImage(200, 200, '成都'),
      note: '宽窄巷子美食',
    },
  },
  {
    id: 'marker-005',
    lat: 34.3416,
    lng: 108.9398,
    name: '西安兵马俑',
    photoCount: 10,
    createdAt: Date.now() - 86400000 * 10,
    firstPhoto: {
      id: 'photo-005',
      thumbnail: generatePlaceholderImage(200, 200, '西安'),
      note: '兵马俑博物馆',
    },
  },
  {
    id: 'marker-006',
    lat: 25.0389,
    lng: 102.7183,
    name: '昆明滇池',
    photoCount: 4,
    createdAt: Date.now() - 86400000 * 5,
    firstPhoto: {
      id: 'photo-006',
      thumbnail: generatePlaceholderImage(200, 200, '昆明'),
      note: '滇池海鸥',
    },
  },
  {
    id: 'marker-007',
    lat: 30.2741,
    lng: 120.1551,
    name: '杭州西湖',
    photoCount: 7,
    createdAt: Date.now() - 86400000 * 3,
    firstPhoto: {
      id: 'photo-007',
      thumbnail: generatePlaceholderImage(200, 200, '杭州'),
      note: '西湖断桥',
    },
  },
  {
    id: 'marker-008',
    lat: 36.0671,
    lng: 120.3826,
    name: '青岛栈桥',
    photoCount: 2,
    createdAt: Date.now() - 86400000 * 1,
    firstPhoto: {
      id: 'photo-008',
      thumbnail: generatePlaceholderImage(200, 200, '青岛'),
      note: '栈桥日落',
    },
  },
];

// ========== 预定义照片数据 ==========

/**
 * 模拟照片数据
 */
export const mockPhotos = {
  'marker-001': [
    { id: 'photo-001-1', note: '天安门广场', thumbnail: generatePlaceholderImage(200, 200, '天安门1'), createdAt: Date.now() - 86400000 },
    { id: 'photo-001-2', note: '故宫午门', thumbnail: generatePlaceholderImage(200, 200, '天安门2'), createdAt: Date.now() - 86400000 },
    { id: 'photo-001-3', note: '长安街', thumbnail: generatePlaceholderImage(200, 200, '天安门3'), createdAt: Date.now() - 86400000 },
    { id: 'photo-001-4', note: '国家博物馆', thumbnail: generatePlaceholderImage(200, 200, '天安门4'), createdAt: Date.now() - 86400000 },
    { id: 'photo-001-5', note: '人民大会堂', thumbnail: generatePlaceholderImage(200, 200, '天安门5'), createdAt: Date.now() - 86400000 },
  ],
  'marker-002': [
    { id: 'photo-002-1', note: '外滩夜景', thumbnail: generatePlaceholderImage(200, 200, '外滩1'), createdAt: Date.now() - 86400000 },
    { id: 'photo-002-2', note: '东方明珠', thumbnail: generatePlaceholderImage(200, 200, '外滩2'), createdAt: Date.now() - 86400000 },
    { id: 'photo-002-3', note: '陆家嘴', thumbnail: generatePlaceholderImage(200, 200, '外滩3'), createdAt: Date.now() - 86400000 },
  ],
};

// ========== 生成函数 ==========

/**
 * 生成占位图片（SVG Data URL）
 * @param {number} width - 宽度
 * @param {number} height - 高度
 * @param {string} text - 显示文字
 * @returns {string} Data URL
 */
export function generatePlaceholderImage(width, height, text) {
  const colors = [
    '#4A90E2', '#50C878', '#FF6B6B', '#FFD93D', 
    '#6C5CE7', '#A29BFE', '#FD79A8', '#00CEC9'
  ];
  const color = colors[Math.floor(Math.random() * colors.length)];
  
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <rect width="100%" height="100%" fill="${color}"/>
      <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="16" 
            fill="white" text-anchor="middle" dominant-baseline="middle">
        ${text}
      </text>
    </svg>
  `.trim();
  
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

/**
 * 生成随机坐标（中国范围内）
 * @returns {{lat: number, lng: number}}
 */
export function generateRandomCoordinate() {
  // 中国大致范围: 纬度 18-54, 经度 73-135
  const lat = 18 + Math.random() * 36;
  const lng = 73 + Math.random() * 62;
  return { lat, lng };
}

/**
 * 生成随机标记
 * @param {number} count - 数量
 * @returns {Array} 标记数组
 */
export function generateMockMarkers(count = 10) {
  const cities = [
    '北京', '上海', '广州', '深圳', '杭州', '成都', '重庆', '武汉',
    '西安', '南京', '苏州', '天津', '青岛', '大连', '厦门', '昆明',
    '长沙', '郑州', '沈阳', '哈尔滨', '济南', '福州', '合肥', '南昌'
  ];
  
  return Array.from({ length: count }, (_, i) => {
    const coord = generateRandomCoordinate();
    const city = cities[i % cities.length];
    const photoCount = Math.floor(Math.random() * 10) + 1;
    
    return {
      id: `mock-marker-${Date.now()}-${i}`,
      lat: coord.lat,
      lng: coord.lng,
      name: `${city}旅行点 ${i + 1}`,
      photoCount,
      createdAt: Date.now() - Math.random() * 86400000 * 30,
      firstPhoto: photoCount > 0 ? {
        id: `mock-photo-${Date.now()}-${i}`,
        thumbnail: generatePlaceholderImage(200, 200, city),
        note: `${city}之旅`,
      } : null,
    };
  });
}

/**
 * 生成随机照片
 * @param {string} markerId - 标记 ID
 * @param {number} count - 数量
 * @returns {Array} 照片数组
 */
export function generateMockPhotos(markerId, count = 5) {
  const notes = [
    '美丽的风景', '难忘的时刻', '美食打卡', '街头随拍',
    '日落时分', '清晨漫步', '夜景璀璨', '古建筑',
    '自然风光', '城市天际线', '人文风情', '特色小吃'
  ];
  
  return Array.from({ length: count }, (_, i) => ({
    id: `mock-photo-${markerId}-${Date.now()}-${i}`,
    markerId,
    note: notes[Math.floor(Math.random() * notes.length)],
    thumbnail: generatePlaceholderImage(200, 200, `照片${i + 1}`),
    data: generatePlaceholderImage(800, 600, `照片${i + 1}`),
    createdAt: Date.now() - Math.random() * 86400000 * 7,
  }));
}

// ========== Mock API ==========

/**
 * Mock API 实现
 * 用于开发环境模拟后端接口
 */
export const mockApi = {
  markers: {
    getAll: async () => {
      await delay(300);
      return [...mockMarkers];
    },
    
    getById: async (id) => {
      await delay(200);
      return mockMarkers.find(m => m.id === id) || null;
    },
    
    create: async (data) => {
      await delay(300);
      const marker = {
        id: `marker-${Date.now()}`,
        ...data,
        photoCount: 0,
        createdAt: Date.now(),
      };
      mockMarkers.push(marker);
      return marker;
    },
    
    update: async (id, data) => {
      await delay(200);
      const index = mockMarkers.findIndex(m => m.id === id);
      if (index !== -1) {
        mockMarkers[index] = { ...mockMarkers[index], ...data };
        return mockMarkers[index];
      }
      throw new Error('Marker not found');
    },
    
    delete: async (id) => {
      await delay(200);
      const index = mockMarkers.findIndex(m => m.id === id);
      if (index !== -1) {
        mockMarkers.splice(index, 1);
        return true;
      }
      throw new Error('Marker not found');
    },
  },
  
  photos: {
    getByMarkerId: async (markerId) => {
      await delay(300);
      return mockPhotos[markerId] || generateMockPhotos(markerId, 3);
    },
    
    add: async (markerId, photoData) => {
      await delay(300);
      const photo = {
        id: `photo-${Date.now()}`,
        ...photoData,
        createdAt: Date.now(),
      };
      if (!mockPhotos[markerId]) {
        mockPhotos[markerId] = [];
      }
      mockPhotos[markerId].push(photo);
      return photo;
    },
    
    delete: async (markerId, photoId) => {
      await delay(200);
      if (mockPhotos[markerId]) {
        const index = mockPhotos[markerId].findIndex(p => p.id === photoId);
        if (index !== -1) {
          mockPhotos[markerId].splice(index, 1);
          return true;
        }
      }
      throw new Error('Photo not found');
    },
  },
};

/**
 * 延迟函数
 * @param {number} ms - 毫秒
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ========== 开发工具 ==========

/**
 * 在控制台暴露 Mock 数据（仅开发环境）
 */
if (import.meta.env?.DEV) {
  window.__MOCK__ = {
    markers: mockMarkers,
    photos: mockPhotos,
    api: mockApi,
    generate: {
      markers: generateMockMarkers,
      photos: generateMockPhotos,
      image: generatePlaceholderImage,
      coordinate: generateRandomCoordinate,
    },
  };
  
  console.log(
    '🎭 Mock 数据已加载\n' +
    '  - window.__MOCK__.markers 查看标记数据\n' +
    '  - window.__MOCK__.photos 查看照片数据\n' +
    '  - window.__MOCK__.api 使用 Mock API\n' +
    '  - window.__MOCK__.generate 生成随机数据'
  );
}

export default {
  mockMarkers,
  mockPhotos,
  mockApi,
  generatePlaceholderImage,
  generateRandomCoordinate,
  generateMockMarkers,
  generateMockPhotos,
};