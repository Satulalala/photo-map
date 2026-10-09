/**
 * LifePanel 数据常量和工具函数
 */

export const PROVINCES = [
  '北京',
  '天津',
  '河北',
  '山西',
  '内蒙古',
  '辽宁',
  '吉林',
  '黑龙江',
  '上海',
  '江苏',
  '浙江',
  '安徽',
  '福建',
  '江西',
  '山东',
  '河南',
  '湖北',
  '湖南',
  '广东',
  '广西',
  '海南',
  '重庆',
  '四川',
  '贵州',
  '云南',
  '西藏',
  '陕西',
  '甘肃',
  '青海',
  '宁夏',
  '新疆',
];

const PRIMARY_COUNTRIES = [
  { key: 'th', name: '泰国', flag: '🇹🇭' },
  { key: 'jp', name: '日本', flag: '🇯🇵' },
  { key: 'sg', name: '新加坡', flag: '🇸🇬' },
  { key: 'my', name: '马来西亚', flag: '🇲🇾' },
  { key: 'kr', name: '韩国', flag: '🇰🇷' },
  { key: 'vn', name: '越南', flag: '🇻🇳' },
  { key: 'id', name: '印尼', flag: '🇮🇩' },
  { key: 'ph', name: '菲律宾', flag: '🇵🇭' },
  { key: 'us', name: '美国', flag: '🇺🇸' },
  { key: 'au', name: '澳大利亚', flag: '🇦🇺' },
  { key: 'gb', name: '英国', flag: '🇬🇧' },
  { key: 'fr', name: '法国', flag: '🇫🇷' },
  { key: 'de', name: '德国', flag: '🇩🇪' },
  { key: 'it', name: '意大利', flag: '🇮🇹' },
  { key: 'es', name: '西班牙', flag: '🇪🇸' },
  { key: 'ca', name: '加拿大', flag: '🇨🇦' },
  { key: 'ch', name: '瑞士', flag: '🇨🇭' },
  { key: 'ae', name: '阿联酋', flag: '🇦🇪' },
  { key: 'nz', name: '新西兰', flag: '🇳🇿' },
  { key: 'nl', name: '荷兰', flag: '🇳🇱' },
];

const ADDITIONAL_COUNTRIES = [
  { key: 'pt', name: '葡萄牙', flag: '🇵🇹' },
  { key: 'ru', name: '俄罗斯', flag: '🇷🇺' },
  { key: 'in', name: '印度', flag: '🇮🇳' },
  { key: 'tr', name: '土耳其', flag: '🇹🇷' },
  { key: 'br', name: '巴西', flag: '🇧🇷' },
  { key: 'mx', name: '墨西哥', flag: '🇲🇽' },
  { key: 'eg', name: '埃及', flag: '🇪🇬' },
  { key: 'za', name: '南非', flag: '🇿🇦' },
  { key: 'se', name: '瑞典', flag: '🇸🇪' },
  { key: 'no', name: '挪威', flag: '🇳🇴' },
  { key: 'fi', name: '芬兰', flag: '🇫🇮' },
  { key: 'dk', name: '丹麦', flag: '🇩🇰' },
  { key: 'be', name: '比利时', flag: '🇧🇪' },
  { key: 'at', name: '奥地利', flag: '🇦🇹' },
  { key: 'ie', name: '爱尔兰', flag: '🇮🇪' },
  { key: 'pl', name: '波兰', flag: '🇵🇱' },
  { key: 'cz', name: '捷克', flag: '🇨🇿' },
  { key: 'hu', name: '匈牙利', flag: '🇭🇺' },
  { key: 'gr', name: '希腊', flag: '🇬🇷' },
  { key: 'is', name: '冰岛', flag: '🇮🇸' },
  { key: 'cl', name: '智利', flag: '🇨🇱' },
  { key: 'ar', name: '阿根廷', flag: '🇦🇷' },
  { key: 'pe', name: '秘鲁', flag: '🇵🇪' },
  { key: 'co', name: '哥伦比亚', flag: '🇨🇴' },
  { key: 'uy', name: '乌拉圭', flag: '🇺🇾' },
  { key: 'pa', name: '巴拿马', flag: '🇵🇦' },
  { key: 'cr', name: '哥斯达黎加', flag: '🇨🇷' },
  { key: 'il', name: '以色列', flag: '🇮🇱' },
  { key: 'sa', name: '沙特阿拉伯', flag: '🇸🇦' },
  { key: 'qa', name: '卡塔尔', flag: '🇶🇦' },
  { key: 'kw', name: '科威特', flag: '🇰🇼' },
  { key: 'om', name: '阿曼', flag: '🇴🇲' },
  { key: 'jo', name: '约旦', flag: '🇯🇴' },
  { key: 'ir', name: '伊朗', flag: '🇮🇷' },
  { key: 'pk', name: '巴基斯坦', flag: '🇵🇰' },
  { key: 'bd', name: '孟加拉国', flag: '🇧🇩' },
  { key: 'lk', name: '斯里兰卡', flag: '🇱🇰' },
  { key: 'np', name: '尼泊尔', flag: '🇳🇵' },
  { key: 'kh', name: '柬埔寨', flag: '🇰🇭' },
  { key: 'la', name: '老挝', flag: '🇱🇦' },
  { key: 'mm', name: '缅甸', flag: '🇲🇲' },
  { key: 'bn', name: '文莱', flag: '🇧🇳' },
  { key: 'mn', name: '蒙古', flag: '🇲🇳' },
  { key: 'kz', name: '哈萨克斯坦', flag: '🇰🇿' },
  { key: 'uz', name: '乌兹别克斯坦', flag: '🇺🇿' },
  { key: 'ge', name: '格鲁吉亚', flag: '🇬🇪' },
  { key: 'am', name: '亚美尼亚', flag: '🇦🇲' },
  { key: 'az', name: '阿塞拜疆', flag: '🇦🇿' },
  { key: 'ua', name: '乌克兰', flag: '🇺🇦' },
  { key: 'ro', name: '罗马尼亚', flag: '🇷🇴' },
  { key: 'bg', name: '保加利亚', flag: '🇧🇬' },
  { key: 'hr', name: '克罗地亚', flag: '🇭🇷' },
  { key: 'si', name: '斯洛文尼亚', flag: '🇸🇮' },
  { key: 'sk', name: '斯洛伐克', flag: '🇸🇰' },
  { key: 'lt', name: '立陶宛', flag: '🇱🇹' },
  { key: 'lv', name: '拉脱维亚', flag: '🇱🇻' },
  { key: 'ee', name: '爱沙尼亚', flag: '🇪🇪' },
  { key: 'ma', name: '摩洛哥', flag: '🇲🇦' },
  { key: 'dz', name: '阿尔及利亚', flag: '🇩🇿' },
  { key: 'tn', name: '突尼斯', flag: '🇹🇳' },
  { key: 'ke', name: '肯尼亚', flag: '🇰🇪' },
  { key: 'tz', name: '坦桑尼亚', flag: '🇹🇿' },
  { key: 'ng', name: '尼日利亚', flag: '🇳🇬' },
  { key: 'gh', name: '加纳', flag: '🇬🇭' },
  { key: 'et', name: '埃塞俄比亚', flag: '🇪🇹' },
  { key: 'zw', name: '津巴布韦', flag: '🇿🇼' },
  { key: 'jm', name: '牙买加', flag: '🇯🇲' },
  { key: 'cu', name: '古巴', flag: '🇨🇺' },
  { key: 'do', name: '多米尼加', flag: '🇩🇴' },
  { key: 've', name: '委内瑞拉', flag: '🇻🇪' },
  { key: 'ec', name: '厄瓜多尔', flag: '🇪🇨' },
  { key: 'bo', name: '玻利维亚', flag: '🇧🇴' },
  { key: 'py', name: '巴拉圭', flag: '🇵🇾' },
];

export const ALL_COUNTRIES = [...PRIMARY_COUNTRIES, ...ADDITIONAL_COUNTRIES];
export const DEFAULT_COUNTRY_PAGE_SIZE = 20;

const DOMESTIC_REGION_CODES = new Set(['CN', 'HK', 'MO', 'TW', 'CHN']);
const DOMESTIC_REGION_NAMES = [
  '中国',
  'China',
  'Hong Kong',
  'Hong Kong SAR',
  '香港',
  '澳门',
  'Macau',
  'Macao',
  '台湾',
  'Taiwan',
];
const COUNTRY_CODE_ALIASES = { UK: 'GB' };
// ISO 3166-1 alpha-2 assigned country/area codes; this does not imply every
// code is a sovereign state. Keep the UI label as destinations/countries and areas.
const ISO_COUNTRY_AREA_CODES = new Set(
  `
  AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ
  CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR
  GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP
  KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT
  MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW
  SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG
  UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW
`
    .trim()
    .split(/\s+/)
);
const COUNTRY_ALIASES = {
  th: ['Thailand'],
  jp: ['Japan'],
  sg: ['Singapore'],
  my: ['Malaysia'],
  kr: ['South Korea', 'Republic of Korea', 'Korea, Republic of'],
  vn: ['Vietnam', 'Viet Nam'],
  id: ['Indonesia'],
  ph: ['Philippines'],
  us: ['USA', 'U.S.A.', 'United States of America', 'America'],
  au: ['Australia'],
  gb: ['UK', 'U.K.', 'Britain', 'Great Britain', 'England'],
  fr: ['France'],
  de: ['Germany'],
  it: ['Italy'],
  es: ['Spain'],
  ca: ['Canada'],
  ch: ['Switzerland'],
  ae: ['UAE', 'United Arab Emirates'],
  nz: ['New Zealand'],
  nl: ['Holland', 'Netherlands'],
  pt: ['Portugal'],
  ru: ['Russia'],
  in: ['India'],
  tr: ['Turkey', 'Türkiye'],
  br: ['Brazil'],
  mx: ['Mexico'],
  eg: ['Egypt'],
  za: ['South Africa'],
  se: ['Sweden'],
  no: ['Norway'],
  fi: ['Finland'],
  dk: ['Denmark'],
  be: ['Belgium'],
  at: ['Austria'],
  ie: ['Ireland'],
  pl: ['Poland'],
  cz: ['Czechia', 'Czech Republic'],
  hu: ['Hungary'],
  gr: ['Greece'],
  is: ['Iceland'],
  cl: ['Chile'],
  ar: ['Argentina'],
  pe: ['Peru'],
  co: ['Colombia'],
  uy: ['Uruguay'],
  pa: ['Panama'],
  cr: ['Costa Rica'],
  il: ['Israel'],
  sa: ['Saudi Arabia'],
  qa: ['Qatar'],
  kw: ['Kuwait'],
  om: ['Oman'],
  jo: ['Jordan'],
  ir: ['Iran'],
  pk: ['Pakistan'],
  bd: ['Bangladesh'],
  lk: ['Sri Lanka'],
  np: ['Nepal'],
  kh: ['Cambodia'],
  la: ['Laos', 'Lao PDR'],
  mm: ['Myanmar', 'Burma'],
  bn: ['Brunei'],
  mn: ['Mongolia'],
  kz: ['Kazakhstan'],
  uz: ['Uzbekistan'],
  ge: ['Georgia'],
  am: ['Armenia'],
  az: ['Azerbaijan'],
  ua: ['Ukraine'],
  ro: ['Romania'],
  bg: ['Bulgaria'],
  hr: ['Croatia'],
  si: ['Slovenia'],
  sk: ['Slovakia'],
  lt: ['Lithuania'],
  lv: ['Latvia'],
  ee: ['Estonia'],
  ma: ['Morocco'],
  dz: ['Algeria'],
  tn: ['Tunisia'],
  ke: ['Kenya'],
  tz: ['Tanzania'],
  ng: ['Nigeria'],
  gh: ['Ghana'],
  et: ['Ethiopia'],
  zw: ['Zimbabwe'],
  jm: ['Jamaica'],
  cu: ['Cuba'],
  do: ['Dominican Republic'],
  ve: ['Venezuela'],
  ec: ['Ecuador'],
  bo: ['Bolivia'],
  py: ['Paraguay'],
};

const ENGLISH_REGION_NAMES = createRegionDisplayNames('en');
const CHINESE_REGION_NAMES = createRegionDisplayNames('zh-CN');
const COUNTRIES_BY_CODE = new Map(
  ALL_COUNTRIES.map(country => [country.key.toUpperCase(), country])
);

function createRegionDisplayNames(locale) {
  if (typeof Intl.DisplayNames !== 'function') return null;
  try {
    return new Intl.DisplayNames([locale], { type: 'region' });
  } catch {
    return null;
  }
}

function normalizeText(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('en')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

function getRegionName(displayNames, code) {
  try {
    return displayNames?.of(code.toUpperCase()) || null;
  } catch {
    return null;
  }
}

function isValidRegionName(name, code) {
  return Boolean(
    name && name.toUpperCase() !== code.toUpperCase() && !/unknown region/i.test(name)
  );
}

function isDomesticCode(value) {
  return DOMESTIC_REGION_CODES.has(
    String(value || '')
      .trim()
      .toUpperCase()
  );
}

function isDomesticName(value) {
  if (isDomesticCode(value)) return true;
  const normalized = normalizeText(value);
  return DOMESTIC_REGION_NAMES.some(name => {
    const alias = normalizeText(name);
    if (/\p{Script=Han}/u.test(alias)) return normalized.includes(alias);
    return normalized === alias || ` ${normalized} `.includes(` ${alias} `);
  });
}

function getLocationText(value) {
  if (typeof value === 'string') return value;
  if (!value || typeof value !== 'object') return '';
  return [value.name, value.placeName, value.address, value.formattedAddress, value.locationName]
    .filter(item => typeof item === 'string')
    .join(' ');
}

function getCountryMetadata(value) {
  if (!value || typeof value !== 'object') return {};
  return {
    code: value.countryCode ?? value.country_code ?? value.isoCountryCode ?? value.iso2 ?? null,
    name: value.countryName ?? value.country_name ?? value.country ?? null,
  };
}

export function getCountryByCode(value) {
  const inputCode = String(value || '')
    .trim()
    .toUpperCase();
  const code = COUNTRY_CODE_ALIASES[inputCode] || inputCode;
  if (!/^[A-Z]{2}$/.test(code) || !ISO_COUNTRY_AREA_CODES.has(code) || isDomesticCode(code))
    return null;

  const existing = COUNTRIES_BY_CODE.get(code);
  if (existing) {
    return {
      ...existing,
      englishName: getRegionName(ENGLISH_REGION_NAMES, code) || null,
      aliases: COUNTRY_ALIASES[existing.key] || [],
    };
  }

  const englishName = getRegionName(ENGLISH_REGION_NAMES, code);
  if (!isValidRegionName(englishName, code)) return null;
  const localizedName = getRegionName(CHINESE_REGION_NAMES, code);
  return {
    key: code.toLowerCase(),
    name: isValidRegionName(localizedName, code) ? localizedName : englishName,
    englishName,
    aliases: [],
  };
}

const BASE_COUNTRY_DIRECTORY = ALL_COUNTRIES.map(country => getCountryByCode(country.key)).filter(
  Boolean
);

export {
  BASE_COUNTRY_DIRECTORY,
  getCountryMetadata,
  getLocationText,
  isDomesticCode,
  isDomesticName,
  normalizeText,
};
