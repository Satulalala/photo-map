/**
 * LifePanel 数据常量和工具函数
 */

export const PROVINCES = [
  '北京','天津','河北','山西','内蒙古','辽宁','吉林','黑龙江',
  '上海','江苏','浙江','安徽','福建','江西','山东','河南',
  '湖北','湖南','广东','广西','海南','重庆','四川','贵州',
  '云南','西藏','陕西','甘肃','青海','宁夏','新疆'
];

export const TOP_20_HOT_COUNTRIES = [
  { key: 'th', name: '泰国', flag: '🇹🇭', heat: 100 },
  { key: 'jp', name: '日本', flag: '🇯🇵', heat: 99 },
  { key: 'sg', name: '新加坡', flag: '🇸🇬', heat: 97 },
  { key: 'my', name: '马来西亚', flag: '🇲🇾', heat: 95 },
  { key: 'kr', name: '韩国', flag: '🇰🇷', heat: 93 },
  { key: 'vn', name: '越南', flag: '🇻🇳', heat: 92 },
  { key: 'id', name: '印尼', flag: '🇮🇩', heat: 89 },
  { key: 'ph', name: '菲律宾', flag: '🇵🇭', heat: 87 },
  { key: 'us', name: '美国', flag: '🇺🇸', heat: 83 },
  { key: 'au', name: '澳大利亚', flag: '🇦🇺', heat: 81 },
  { key: 'gb', name: '英国', flag: '🇬🇧', heat: 79 },
  { key: 'fr', name: '法国', flag: '🇫🇷', heat: 76 },
  { key: 'de', name: '德国', flag: '🇩🇪', heat: 74 },
  { key: 'it', name: '意大利', flag: '🇮🇹', heat: 72 },
  { key: 'es', name: '西班牙', flag: '🇪🇸', heat: 70 },
  { key: 'ca', name: '加拿大', flag: '🇨🇦', heat: 67 },
  { key: 'ch', name: '瑞士', flag: '🇨🇭', heat: 65 },
  { key: 'ae', name: '阿联酋', flag: '🇦🇪', heat: 62 },
  { key: 'nz', name: '新西兰', flag: '🇳🇿', heat: 60 },
  { key: 'nl', name: '荷兰', flag: '🇳🇱', heat: 58 }
];

export const EXTRA_COUNTRIES = [
  { key: 'pt', name: '葡萄牙', flag: '🇵🇹', heat: 56 },
  { key: 'ru', name: '俄罗斯', flag: '🇷🇺', heat: 55 },
  { key: 'in', name: '印度', flag: '🇮🇳', heat: 54 },
  { key: 'tr', name: '土耳其', flag: '🇹🇷', heat: 53 },
  { key: 'br', name: '巴西', flag: '🇧🇷', heat: 52 },
  { key: 'mx', name: '墨西哥', flag: '🇲🇽', heat: 51 },
  { key: 'eg', name: '埃及', flag: '🇪🇬', heat: 50 },
  { key: 'za', name: '南非', flag: '🇿🇦', heat: 49 },
  { key: 'se', name: '瑞典', flag: '🇸🇪', heat: 48 },
  { key: 'no', name: '挪威', flag: '🇳🇴', heat: 47 },
  { key: 'fi', name: '芬兰', flag: '🇫🇮', heat: 46 },
  { key: 'dk', name: '丹麦', flag: '🇩🇰', heat: 45 },
  { key: 'be', name: '比利时', flag: '🇧🇪', heat: 44 },
  { key: 'at', name: '奥地利', flag: '🇦🇹', heat: 43 },
  { key: 'ie', name: '爱尔兰', flag: '🇮🇪', heat: 42 },
  { key: 'pl', name: '波兰', flag: '🇵🇱', heat: 41 },
  { key: 'cz', name: '捷克', flag: '🇨🇿', heat: 40 },
  { key: 'hu', name: '匈牙利', flag: '🇭🇺', heat: 39 },
  { key: 'gr', name: '希腊', flag: '🇬🇷', heat: 38 },
  { key: 'is', name: '冰岛', flag: '🇮🇸', heat: 37 },
  { key: 'cl', name: '智利', flag: '🇨🇱', heat: 36 },
  { key: 'ar', name: '阿根廷', flag: '🇦🇷', heat: 35 },
  { key: 'pe', name: '秘鲁', flag: '🇵🇪', heat: 34 },
  { key: 'co', name: '哥伦比亚', flag: '🇨🇴', heat: 33 },
  { key: 'uy', name: '乌拉圭', flag: '🇺🇾', heat: 32 },
  { key: 'pa', name: '巴拿马', flag: '🇵🇦', heat: 31 },
  { key: 'cr', name: '哥斯达黎加', flag: '🇨🇷', heat: 30 },
  { key: 'il', name: '以色列', flag: '🇮🇱', heat: 29 },
  { key: 'sa', name: '沙特阿拉伯', flag: '🇸🇦', heat: 28 },
  { key: 'qa', name: '卡塔尔', flag: '🇶🇦', heat: 27 },
  { key: 'kw', name: '科威特', flag: '🇰🇼', heat: 26 },
  { key: 'om', name: '阿曼', flag: '🇴🇲', heat: 25 },
  { key: 'jo', name: '约旦', flag: '🇯🇴', heat: 24 },
  { key: 'ir', name: '伊朗', flag: '🇮🇷', heat: 23 },
  { key: 'pk', name: '巴基斯坦', flag: '🇵🇰', heat: 22 },
  { key: 'bd', name: '孟加拉国', flag: '🇧🇩', heat: 21 },
  { key: 'lk', name: '斯里兰卡', flag: '🇱🇰', heat: 20 },
  { key: 'np', name: '尼泊尔', flag: '🇳🇵', heat: 19 },
  { key: 'kh', name: '柬埔寨', flag: '🇰🇭', heat: 18 },
  { key: 'la', name: '老挝', flag: '🇱🇦', heat: 17 },
  { key: 'mm', name: '缅甸', flag: '🇲🇲', heat: 16 },
  { key: 'bn', name: '文莱', flag: '🇧🇳', heat: 15 },
  { key: 'mn', name: '蒙古', flag: '🇲🇳', heat: 14 },
  { key: 'kz', name: '哈萨克斯坦', flag: '🇰🇿', heat: 13 },
  { key: 'uz', name: '乌兹别克斯坦', flag: '🇺🇿', heat: 12 },
  { key: 'ge', name: '格鲁吉亚', flag: '🇬🇪', heat: 11 },
  { key: 'am', name: '亚美尼亚', flag: '🇦🇲', heat: 10 },
  { key: 'az', name: '阿塞拜疆', flag: '🇦🇿', heat: 9 },
  { key: 'ua', name: '乌克兰', flag: '🇺🇦', heat: 8 },
  { key: 'ro', name: '罗马尼亚', flag: '🇷🇴', heat: 7 },
  { key: 'bg', name: '保加利亚', flag: '🇧🇬', heat: 6 },
  { key: 'hr', name: '克罗地亚', flag: '🇭🇷', heat: 5 },
  { key: 'si', name: '斯洛文尼亚', flag: '🇸🇮', heat: 4 },
  { key: 'sk', name: '斯洛伐克', flag: '🇸🇰', heat: 3 },
  { key: 'lt', name: '立陶宛', flag: '🇱🇹', heat: 2 },
  { key: 'lv', name: '拉脱维亚', flag: '🇱🇻', heat: 2 },
  { key: 'ee', name: '爱沙尼亚', flag: '🇪🇪', heat: 2 },
  { key: 'ma', name: '摩洛哥', flag: '🇲🇦', heat: 2 },
  { key: 'dz', name: '阿尔及利亚', flag: '🇩🇿', heat: 2 },
  { key: 'tn', name: '突尼斯', flag: '🇹🇳', heat: 2 },
  { key: 'ke', name: '肯尼亚', flag: '🇰🇪', heat: 2 },
  { key: 'tz', name: '坦桑尼亚', flag: '🇹🇿', heat: 2 },
  { key: 'ng', name: '尼日利亚', flag: '🇳🇬', heat: 2 },
  { key: 'gh', name: '加纳', flag: '🇬🇭', heat: 2 },
  { key: 'et', name: '埃塞俄比亚', flag: '🇪🇹', heat: 2 },
  { key: 'zw', name: '津巴布韦', flag: '🇿🇼', heat: 2 },
  { key: 'jm', name: '牙买加', flag: '🇯🇲', heat: 2 },
  { key: 'cu', name: '古巴', flag: '🇨🇺', heat: 2 },
  { key: 'do', name: '多米尼加', flag: '🇩🇴', heat: 2 },
  { key: 've', name: '委内瑞拉', flag: '🇻🇪', heat: 2 },
  { key: 'ec', name: '厄瓜多尔', flag: '🇪🇨', heat: 2 },
  { key: 'bo', name: '玻利维亚', flag: '🇧🇴', heat: 2 },
  { key: 'py', name: '巴拉圭', flag: '🇵🇾', heat: 2 }
];

export const ALL_COUNTRIES = [...TOP_20_HOT_COUNTRIES, ...EXTRA_COUNTRIES];

export function extractProvince(name) {
  if (!name) return null;
  for (const p of PROVINCES) if (name.includes(p)) return p;
  return null;
}

export function extractCountry(name) {
  if (!name) return null;
  const hit = ALL_COUNTRIES.find(c => name.includes(c.name));
  return hit?.key || null;
}
