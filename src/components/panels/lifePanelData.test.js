import { describe, expect, it } from 'vitest';
import {
  ALL_COUNTRIES,
  DEFAULT_COUNTRY_PAGE_SIZE,
  extractCountry,
  extractProvince,
  getCountryByCode,
  getCountryDirectory,
  getCountryList,
  getCountryPage,
  isDomesticLocation,
} from './lifePanelData.js';

describe('life panel location data', () => {
  it('recognizes Chinese and English country names in place labels', () => {
    expect(extractCountry('Tokyo, Japan')).toBe('jp');
    expect(extractCountry('Los Angeles, United States')).toBe('us');
    expect(extractCountry('Seoul, Republic of Korea')).toBe('kr');
    expect(extractCountry('日本京都')).toBe('jp');
    expect(extractCountry('泰国曼谷')).toBe('th');
  });

  it('uses explicit valid country codes and adds missing visited destinations', () => {
    expect(extractCountry({ name: 'Queenstown', countryCode: 'NZ' })).toBe('nz');
    expect(extractCountry({ name: 'Maafushi', countryCode: 'MV' })).toBe('mv');
    expect(extractCountry({ name: 'Los Angeles', country: 'US' })).toBe('us');
    expect(getCountryByCode('MV')).toMatchObject({ key: 'mv', englishName: 'Maldives' });
    expect(getCountryDirectory({ mv: 1 }).some(country => country.key === 'mv')).toBe(true);
    expect(ALL_COUNTRIES.every(country => getCountryByCode(country.key))).toBe(true);
    expect(extractCountry({ name: 'Somewhere', countryCode: 'ZZ' })).toBeNull();
  });

  it('normalizes UK to GB and rejects macroregion, private-use, and unknown codes', () => {
    expect(getCountryByCode('UK')?.key).toBe('gb');
    expect(extractCountry({ countryCode: 'UK' })).toBe('gb');
    ['EU', 'UN', 'QO', 'XA', 'XB', 'ZZ'].forEach(code => {
      expect(getCountryByCode(code)).toBeNull();
    });
  });

  it('counts explicit domestic locations without treating their names as overseas', () => {
    const guangzhou = { name: '中国广东省广州市', countryCode: 'CN' };
    expect(extractCountry(guangzhou)).toBeNull();
    expect(extractProvince(guangzhou)).toBe('广东');
    expect(isDomesticLocation(guangzhou)).toBe(true);
    expect(isDomesticLocation({ name: 'Unmatched city', countryCode: 'CN' })).toBe(true);
    expect(isDomesticLocation({ name: 'London', countryCode: 'GB' })).toBe(false);
  });

  it('prioritizes explicit domestic region text and keeps foreign codes authoritative', () => {
    expect(extractCountry('中国广东省广州市')).toBeNull();
    expect(extractProvince('中国广东省广州市')).toBe('广东');
    expect(extractCountry('广东省日本料理')).toBeNull();
    expect(extractProvince({ name: '广东省日本料理', countryCode: 'CN' })).toBe('广东');
    expect(extractProvince({ name: '广东省', countryCode: 'JP' })).toBeNull();
    expect(isDomesticLocation('未知地点')).toBe(false);
  });
});

describe('overseas destination list', () => {
  const visitedCounts = { jp: 2, us: 1, mv: 1 };

  it('searches by English name or country code and filters visited destinations', () => {
    expect(
      getCountryList(visitedCounts, { query: 'Switzerland' }).map(country => country.key)
    ).toEqual(['ch']);
    expect(getCountryList(visitedCounts, { query: 'CH' }).map(country => country.key)).toEqual([
      'ch',
    ]);
    const visited = getCountryList(visitedCounts, { filterMode: 'visited' }).map(
      country => country.key
    );
    expect(visited[0]).toBe('jp');
    expect(visited).toEqual(expect.arrayContaining(['us', 'mv']));
    expect(
      getCountryList(visitedCounts, { filterMode: 'unvisited' }).every(country => !country.visited)
    ).toBe(true);
  });

  it('sorts by real record count and pages through the destination directory', () => {
    const frequencySorted = getCountryList(visitedCounts, { sortMode: 'frequency' });
    const nameSorted = getCountryList(visitedCounts, { sortMode: 'name' });
    const firstPage = getCountryPage(frequencySorted);
    const secondPage = getCountryPage(frequencySorted, DEFAULT_COUNTRY_PAGE_SIZE * 2);

    expect(frequencySorted[0]).toMatchObject({ key: 'jp', count: 2 });
    expect(nameSorted[0].name.localeCompare(nameSorted[1].name, 'zh-CN')).toBeLessThanOrEqual(0);
    expect(firstPage).toHaveLength(DEFAULT_COUNTRY_PAGE_SIZE);
    expect(secondPage.length).toBeGreaterThanOrEqual(firstPage.length);
    expect(getCountryPage(frequencySorted, 1000)).toHaveLength(frequencySorted.length);
  });
});
