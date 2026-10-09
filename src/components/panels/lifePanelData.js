import {
  ALL_COUNTRIES,
  BASE_COUNTRY_DIRECTORY,
  DEFAULT_COUNTRY_PAGE_SIZE,
  PROVINCES,
  getCountryByCode,
  getCountryMetadata,
  getLocationText,
  isDomesticCode,
  isDomesticName,
  normalizeText,
} from './lifePanelCatalog.js';

export { ALL_COUNTRIES, DEFAULT_COUNTRY_PAGE_SIZE, PROVINCES, getCountryByCode };
export function getCountryDirectory(countryCounts = {}) {
  const countries = new Map(BASE_COUNTRY_DIRECTORY.map(country => [country.key, country]));
  Object.keys(countryCounts).forEach(code => {
    const country = getCountryByCode(code);
    if (country) countries.set(country.key, country);
  });
  return [...countries.values()].filter(Boolean);
}

function countryAliases(country) {
  return [country.name, country.englishName, ...(country.aliases || [])].filter(Boolean);
}

let regionAliasEntries;

function getRegionAliasEntries() {
  if (regionAliasEntries) return regionAliasEntries;
  const countries = new Map(getCountryDirectory().map(country => [country.key, country]));

  for (let first = 65; first <= 90; first += 1) {
    for (let second = 65; second <= 90; second += 1) {
      const country = getCountryByCode(String.fromCharCode(first, second));
      if (country) countries.set(country.key, country);
    }
  }

  regionAliasEntries = [...countries.values()]
    .flatMap(country =>
      countryAliases(country).map(alias => ({
        countryKey: country.key,
        normalizedAlias: normalizeText(alias),
        hasHan: /\p{Script=Han}/u.test(alias),
      }))
    )
    .filter(entry => entry.normalizedAlias)
    .sort((a, b) => b.normalizedAlias.length - a.normalizedAlias.length);
  return regionAliasEntries;
}

function findCountryCodeByName(value, allowPartial = false) {
  const normalized = normalizeText(value);
  if (!normalized) return null;
  const paddedValue = ` ${normalized} `;

  for (const entry of getRegionAliasEntries()) {
    const matches = entry.hasHan
      ? allowPartial
        ? normalized.includes(entry.normalizedAlias)
        : normalized === entry.normalizedAlias
      : allowPartial
        ? paddedValue.includes(` ${entry.normalizedAlias} `)
        : normalized === entry.normalizedAlias;
    if (matches) {
      return entry.countryKey;
    }
  }
  return null;
}

export function getCountryList(countryCounts = {}, options = {}) {
  const { query = '', filterMode = 'all', sortMode = 'frequency' } = options;
  const normalizedQuery = normalizeText(query);
  const directCode = /^[a-z]{2}$/i.test(String(query).trim())
    ? getCountryByCode(String(query).trim())?.key
    : null;
  const countryList = getCountryDirectory(countryCounts).map(country => {
    const count = Number(countryCounts[country.key]) || 0;
    return { ...country, count, visited: count > 0 };
  });

  let filtered = countryList;
  if (directCode) {
    filtered = filtered.filter(country => country.key === directCode);
  } else if (normalizedQuery) {
    filtered = filtered.filter(country =>
      countryAliases(country).some(alias => normalizeText(alias).includes(normalizedQuery))
    );
  }

  if (filterMode === 'visited') filtered = filtered.filter(country => country.visited);
  if (filterMode === 'unvisited') filtered = filtered.filter(country => !country.visited);

  return filtered.sort((a, b) => {
    if (sortMode === 'name')
      return a.name.localeCompare(b.name, 'zh-CN') || a.key.localeCompare(b.key);
    return b.count - a.count || a.name.localeCompare(b.name, 'zh-CN') || a.key.localeCompare(b.key);
  });
}

export function getCountryPage(countryList, visibleCount = DEFAULT_COUNTRY_PAGE_SIZE) {
  const count = Math.max(0, Math.floor(Number(visibleCount) || 0));
  return countryList.slice(0, count);
}

function getProvinceFromText(value) {
  const normalized = normalizeText(value);
  const englishNames = {
    北京: ['Beijing'],
    天津: ['Tianjin'],
    河北: ['Hebei'],
    山西: ['Shanxi'],
    内蒙古: ['Inner Mongolia'],
    辽宁: ['Liaoning'],
    吉林: ['Jilin'],
    黑龙江: ['Heilongjiang'],
    上海: ['Shanghai'],
    江苏: ['Jiangsu'],
    浙江: ['Zhejiang'],
    安徽: ['Anhui'],
    福建: ['Fujian'],
    江西: ['Jiangxi'],
    山东: ['Shandong'],
    河南: ['Henan'],
    湖北: ['Hubei'],
    湖南: ['Hunan'],
    广东: ['Guangdong'],
    广西: ['Guangxi'],
    海南: ['Hainan'],
    重庆: ['Chongqing'],
    四川: ['Sichuan'],
    贵州: ['Guizhou'],
    云南: ['Yunnan'],
    西藏: ['Tibet', 'Xizang'],
    陕西: ['Shaanxi'],
    甘肃: ['Gansu'],
    青海: ['Qinghai'],
    宁夏: ['Ningxia'],
    新疆: ['Xinjiang'],
  };

  for (const province of PROVINCES) {
    if (String(value || '').includes(province)) return province;
    if (
      englishNames[province].some(alias => ` ${normalized} `.includes(` ${normalizeText(alias)} `))
    )
      return province;
  }
  return null;
}

export function extractProvince(value) {
  if (!value) return null;
  const metadata = getCountryMetadata(value);
  if (metadata.code && !isDomesticCode(metadata.code)) return null;
  if (
    metadata.name &&
    !isDomesticName(metadata.name) &&
    (getCountryByCode(metadata.name) || findCountryCodeByName(metadata.name))
  ) {
    return null;
  }

  const text = getLocationText(value);
  if (!metadata.code && !metadata.name && extractCountry(text)) return null;
  return getProvinceFromText(text);
}

export function extractCountry(value) {
  if (!value) return null;
  const metadata = getCountryMetadata(value);

  if (metadata.code) {
    if (isDomesticCode(metadata.code)) return null;
    return getCountryByCode(metadata.code)?.key || null;
  }

  if (metadata.name) {
    if (isDomesticName(metadata.name)) return null;
    const code = getCountryByCode(metadata.name)?.key;
    if (code) return code;
    const nameMatch = findCountryCodeByName(metadata.name);
    if (nameMatch) return nameMatch;
  }

  const text = getLocationText(value);
  if (!text || isDomesticName(text) || getProvinceFromText(text)) return null;
  if (/^[a-z]{2}$/i.test(text.trim())) return getCountryByCode(text.trim())?.key || null;
  return findCountryCodeByName(text, true);
}

export function isDomesticLocation(value) {
  if (!value) return false;
  const metadata = getCountryMetadata(value);
  if (metadata.code) return isDomesticCode(metadata.code);
  if (metadata.name) {
    if (isDomesticName(metadata.name)) return true;
    if (getCountryByCode(metadata.name) || findCountryCodeByName(metadata.name)) return false;
  }

  const text = getLocationText(value);
  return isDomesticName(text) || Boolean(extractProvince(value));
}
