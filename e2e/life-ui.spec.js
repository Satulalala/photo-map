import { expect, test } from '@playwright/test';

const pageErrors = new WeakMap();

const markers = [
  { name: '中国广东省广州市', lat: 23.13, lng: 113.26 },
  { name: 'Tokyo, Japan', lat: 35.68, lng: 139.69 },
  { name: '日本京都', lat: 35.01, lng: 135.77 },
  { name: 'Los Angeles, United States', lat: 34.05, lng: -118.24 },
  { name: '泰国曼谷', lat: 13.75, lng: 100.5 },
  { name: 'Queenstown', countryCode: 'NZ', lat: -45.03, lng: 168.66 },
  { name: 'Switzerland', lat: 46.94, lng: 7.45 },
  { name: '沙特阿拉伯利雅得', lat: 24.71, lng: 46.68 },
  { name: 'Maafushi', countryCode: 'MV', lat: 3.94, lng: 73.49 },
  { name: '未识别的地点', lat: 0, lng: 0 },
];

test.beforeEach(async ({ page }) => {
  const errors = [];
  pageErrors.set(page, errors);
  page.on('pageerror', error => errors.push(error.message));
  page.on('dialog', dialog => dialog.dismiss());
  await page.route('https://api.mapbox.com/mapbox-gl-js/**/mapbox-gl.js', route =>
    route.fulfill({
      contentType: 'application/javascript',
      body: 'window.mapboxgl = { supported: () => false };',
    })
  );
  await page.route('https://restapi.amap.com/**', route =>
    route.fulfill({ json: { status: '0' } })
  );
  await page.goto('/');
  await page.getByText('拒绝', { exact: true }).click();
  await page.evaluate(async fixtures => {
    const { webStorage } = await import('/src/api/webStorage.js');
    for (const [index, marker] of fixtures.entries()) {
      const id = `life-fixture-${index}`;
      await webStorage.markers.save({ ...marker, id, createdAt: 1700000000000 + index * 1000 });
      if (index > 0 && index < 4) {
        const data = `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="240" height="160"><rect width="240" height="160" fill="${['#2563eb', '#0d9488', '#64748b'][index - 1]}"/><path d="M0 160 80 60 140 110 190 35 240 160" fill="#fff" opacity=".3"/></svg>`)}`;
        await webStorage.photos.add(id, { id: `${id}-photo`, data, order: 0 });
      }
    }
  }, markers);
  await page.reload();
  await page.getByText('暂不登录', { exact: true }).click();
  await page.getByText('进入地图', { exact: true }).click();
  await expect(page.getByRole('button', { name: /打开我的相册.*10 个地点/ })).toBeVisible();
  await page.getByRole('button', { name: '打开生活面板' }).click();
  await expect(page.getByRole('dialog', { name: '生活足迹' })).toBeVisible();
  await expect(page.locator('.feedback-toast')).toHaveCount(0);
  await page.waitForTimeout(280);
});

test.afterEach(async ({ page }) => {
  expect(pageErrors.get(page)).toEqual([]);
});

test('overseas list recognizes multilingual places and keeps controls visible', async ({
  page,
}) => {
  const photos = page.locator('.life-photo-strip img');
  await expect(photos).toHaveCount(3);
  await expect
    .poll(() => photos.evaluateAll(images => images.every(image => image.naturalWidth > 0)))
    .toBe(true);
  await expect(page.locator('.social-overview-cards .soc-card')).toHaveCount(4);
  const cards = await page
    .locator('.social-overview-cards .soc-card')
    .evaluateAll(elements =>
      elements.map(element => ({ x: element.offsetLeft, y: element.offsetTop }))
    );
  expect(cards[0].y).toBe(cards[1].y);
  expect(cards[2].y).toBe(cards[3].y);
  expect(cards[0].x).toBe(cards[2].x);
  await expect(page.locator('.life-globe-card').filter({ hasText: '中国' })).toContainText(
    '1 个标记'
  );
  await page.getByRole('button', { name: /中国.*省份/ }).click();
  await expect(
    page
      .locator('.soc-card')
      .filter({ hasText: /总标记|国内标记/ })
      .locator('.soc-card-value')
  ).toHaveText('1');
  await page.getByRole('button', { name: '返回', exact: true }).click();
  await page.getByRole('button', { name: /海外.*7 个国家/ }).click();
  await expect(page.getByLabel('搜索国家')).toBeVisible();
  await expect(page.getByLabel('国家筛选')).toBeVisible();
  await page.getByLabel('国家筛选').selectOption('visited');
  const rows = page.locator('.overseas-item');
  await expect(rows).toHaveCount(7);
  await expect(rows.filter({ hasText: '日本' })).toContainText('2');
  for (const country of ['日本', '美国', '泰国', '新西兰', '瑞士', '沙特阿拉伯', '马尔代夫']) {
    await expect(rows.filter({ hasText: country })).toHaveCount(1);
  }
  await page.getByLabel('搜索国家').fill('Switzerland');
  await expect(rows).toHaveCount(1);
  await expect(rows).toContainText('瑞士');
  await page.getByLabel('搜索国家').fill('CH');
  await expect(rows).toHaveCount(1);
  await expect(rows).toContainText('瑞士');
  await page.getByLabel('搜索国家').fill('不存在的国家');
  await expect(rows).toHaveCount(0);
  await expect(page.getByText(/没有.*国家|未找到.*国家/)).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: '打开生活面板' })).toBeFocused();
});

test('empty overview stays useful without removed shortcut actions', async ({ page }) => {
  await expect(page.getByRole('button', { name: /生成海报|复制应用链接/ })).toHaveCount(0);
  await page.keyboard.press('Escape');
  await page.evaluate(async () => {
    const { webStorage } = await import('/src/api/webStorage.js');
    const transaction = await webStorage.getTransaction(['markers', 'photos'], 'readwrite');
    await new Promise((resolve, reject) => {
      transaction.objectStore('markers').clear();
      transaction.objectStore('photos').clear();
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
    });
  });
  await page.reload();
  await expect(page.getByRole('button', { name: /打开我的相册.*0 个地点/ })).toBeVisible();
  await page.getByRole('button', { name: '打开生活面板' }).click();
  await expect(page.getByRole('button', { name: /海外.*0 个国家/ })).toBeVisible();
  await expect(page.getByText(/添加.*地点|标记.*地点|开始.*足迹|暂无.*记录/).first()).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: '打开生活面板' })).toBeFocused();
});

for (const width of [320, 768, 1440]) {
  test(`life overview and full overseas list fit ${width}px in both themes`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const panel = page.locator('.life-panel');
    const frame = await panel.boundingBox();
    const iconFills = await panel
      .locator('.map-icon')
      .evaluateAll(elements => elements.map(element => getComputedStyle(element).fill));
    expect(iconFills.length).toBeGreaterThan(0);
    expect(iconFills.every(fill => fill === 'none')).toBe(true);
    await panel.screenshot({
      path: `.codex/ui-previews/life-overview-${width}.png`,
      animations: 'disabled',
    });
    await page.getByRole('button', { name: /海外.*7 个国家/ }).click();
    await panel.screenshot({
      path: `.codex/ui-previews/life-overseas-list-${width}.png`,
      animations: 'disabled',
    });
    await page.getByLabel('搜索国家').fill('沙特阿拉伯');
    const country = page.locator('.overseas-item');
    await expect(country).toHaveCount(1);
    await expect(country).toContainText('沙特阿拉伯');
    for (const theme of ['light', 'dark']) {
      await page.evaluate(
        value => document.documentElement.setAttribute('data-theme', value),
        theme
      );
      await expect(panel).toBeInViewport();
      const overflow = await panel.evaluate(element =>
        Array.from(element.querySelectorAll('.life-panel-content, .overseas-item')).some(
          item => item.scrollWidth > item.clientWidth + 1
        )
      );
      expect(overflow).toBe(false);
      const countryBox = await country.boundingBox();
      expect(countryBox.x).toBeGreaterThanOrEqual(0);
      expect(countryBox.x + countryBox.width).toBeLessThanOrEqual(width);
      const currentFrame = await panel.boundingBox();
      expect(Math.abs(currentFrame.width - frame.width)).toBeLessThan(1);
      expect(Math.abs(currentFrame.height - frame.height)).toBeLessThan(1);
      await panel.screenshot({
        path: `.codex/ui-previews/life-overseas-${width}-${theme}.png`,
        animations: 'disabled',
      });
    }
    await page.getByLabel('搜索国家').fill('');
    await page.getByLabel('国家筛选').selectOption('all');
    const initialCount = await page.locator('.overseas-item').count();
    await page.getByRole('button', { name: /显示更多/ }).click();
    expect(await page.locator('.overseas-item').count()).toBeGreaterThan(initialCount);
    await page.getByLabel('国家筛选').selectOption('unvisited');
    await expect(page.locator('.overseas-item.visited')).toHaveCount(0);
    await page.getByRole('button', { name: '返回', exact: true }).click();
    await expect(page.getByRole('button', { name: /中国.*省份/ })).toBeVisible();
    await panel.screenshot({
      path: `.codex/ui-previews/life-overview-${width}-dark.png`,
      animations: 'disabled',
    });
  });
}
