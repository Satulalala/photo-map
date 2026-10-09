import { expect, test } from '@playwright/test';
const pageErrors = new WeakMap();

test('notes dialog keeps readable spacing at desktop and phone sizes', async ({ page }) => {
  await page.evaluate(async () => {
    const { webStorage } = await import('/src/api/webStorage.js');
    await webStorage.markers.save({
      id: 'notes-layout',
      lat: 31.2,
      lng: 121.5,
      name: '备注布局测试',
      createdAt: Date.now(),
    });
    await webStorage.photos.add('notes-layout', {
      id: 'notes-layout-photo',
      order: 0,
      data: `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160"><rect width="160" height="160" fill="#94a3b8"/></svg>')}`,
      note: '一段需要自然换行的照片备注。'.repeat(10) + 'LongUnbrokenText'.repeat(10),
    });
  });
  await page.reload();
  await expect(page.getByRole('combobox', { name: '搜索地点或地址' })).toBeVisible();
  await page.getByRole('button', { name: /打开我的相册/ }).click();
  await page.getByRole('button', { name: '打开 备注布局测试' }).click();
  await page.getByRole('button', { name: '备注', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: '照片备注', exact: true });
  for (const width of [1752, 768, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(dialog).toBeVisible();
    await page.waitForTimeout(250);
    const bounds = await dialog.boundingBox();
    expect(bounds.width).toBeGreaterThanOrEqual(width === 320 ? 280 : 520);
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
    for (const editing of [false, true]) {
      if (editing) await dialog.getByRole('button', { name: '编辑', exact: true }).click();
      const title = await dialog.locator('h3').boundingBox();
      const actions = await dialog.locator('.header-actions').boundingBox();
      expect(
        title.x + title.width + 12 <= actions.x || title.y + title.height + 8 <= actions.y
      ).toBe(true);
      expect(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
      if (editing) await dialog.getByRole('button', { name: '取消', exact: true }).click();
    }
    await dialog.screenshot({ path: `.codex/ui-previews/notes-layout-${width}.png` });
  }
  await dialog.getByRole('button', { name: '编辑', exact: true }).click();
  await dialog.getByLabel('照片 1 的备注').fill('布局调整后的备注');
  await dialog.getByRole('button', { name: '保存', exact: true }).click();
  await expect(dialog.getByText('布局调整后的备注', { exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
});

// UI smoke tests isolate the external map service. Real basemap rendering is
// checked separately with the configured public token in the local browser.
test.beforeEach(async ({ page }) => {
  const errors = [];
  pageErrors.set(page, errors);
  page.on('pageerror', error => errors.push(error.message));
  await page.route('https://api.mapbox.com/mapbox-gl-js/**/mapbox-gl.js', route =>
    route.fulfill({
      contentType: 'application/javascript',
      body: 'window.mapboxgl = { supported: () => false };',
    })
  );
  await page.route('https://restapi.amap.com/**', route =>
    route.fulfill({ json: { status: '0' } })
  );
  page.on('dialog', dialog => dialog.dismiss());
  await page.goto('/');
  await page.getByText('拒绝', { exact: true }).click();
  await page.getByText('暂不登录', { exact: true }).click();
  await page.getByText('进入地图', { exact: true }).click();
  await expect(page.getByRole('combobox', { name: '搜索地点或地址' })).toBeVisible();
});

test.afterEach(async ({ page }) => {
  expect(pageErrors.get(page)).toEqual([]);
});

test('search empty state, Escape, album and theme settings work', async ({ page }) => {
  const desktop = page.getByRole('button', { name: '桌面版', exact: true });
  await expect(desktop).toHaveCSS('min-height', '44px');
  const desktopBox = await desktop.boundingBox();
  expect(desktopBox.y).toBeGreaterThanOrEqual(0);
  await desktop.click();
  await expect(page.getByRole('dialog', { name: '获取桌面版' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(desktop).toBeFocused();
  const search = page.getByRole('combobox', { name: '搜索地点或地址' });
  await search.focus();
  await expect(search).toBeFocused();
  await expect(search).toHaveCSS('outline-style', 'none');
  await expect(search).toHaveCSS('box-shadow', 'none');
  const searchSurface = page.locator('.search-bar:focus-within');
  await expect(searchSurface).toBeVisible();
  await expect(searchSurface).not.toHaveCSS('box-shadow', 'none');
  const searchBox = await searchSurface.boundingBox();
  await page.screenshot({
    path: '.codex/ui-previews/search-focus.png',
    clip: {
      x: Math.max(0, searchBox.x - 8),
      y: Math.max(0, searchBox.y - 8),
      width: searchBox.width + 16,
      height: searchBox.height + 16,
    },
  });
  await search.fill('不存在的地点');
  await expect(page.getByText(/未找到.*相关地点/)).toBeVisible();
  await search.press('Escape');
  await expect(search).toHaveAttribute('aria-expanded', 'false');
  await page.getByRole('button', { name: /打开我的相册/ }).click();
  await expect(page.locator('.marker-list-panel.open')).toBeVisible();
  await page.getByRole('button', { name: '排序方式' }).click();
  await page.getByRole('button', { name: '地名排序' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.dropdown-menu')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: /打开我的相册/ })).toBeFocused();
  await page.getByRole('button', { name: '打开设置', exact: true }).click();
  await expect(page.getByRole('button', { name: '关闭设置', exact: true })).toBeFocused();
  await expect(page.getByRole('button', { name: '显示设置', exact: true })).toHaveCSS(
    'height',
    '44px'
  );
  await page.getByLabel('明暗模式').selectOption('dark');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByLabel('明暗模式').selectOption('light');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.getByLabel('明暗模式').press('Escape');
  await expect(page.locator('.settings-overlay')).toHaveCount(0);
  await expect(page.getByRole('button', { name: '打开设置', exact: true })).toBeFocused();
});

for (const width of [320, 375, 414, 768, 769, 900, 1024, 1440]) {
  test(`controls and settings fit a ${width}px viewport`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await expect(page.getByRole('button', { name: '打开设置', exact: true })).toBeInViewport();
    await expect(page.getByRole('combobox')).toBeInViewport();
    const search = await page.locator('.search-bar-container').boundingBox();
    const tools = await page.locator('.toolbar-right').boundingBox();
    expect(search.x).toBeGreaterThanOrEqual(0);
    expect(search.x + search.width).toBeLessThanOrEqual(width);
    expect(search.y + search.height <= tools.y || search.x + search.width <= tools.x).toBe(true);
    if (width > 768) {
      const download = await page.locator('.web-download-beside-search').boundingBox();
      expect(download.x + download.width + 8).toBeLessThanOrEqual(tools.x);
      expect(search.x + search.width).toBeLessThanOrEqual(download.x);
    }
    const lifeButton = page.getByRole('button', { name: '打开生活面板' });
    const albumButton = page.getByRole('button', { name: /打开我的相册/ });
    await expect(lifeButton).toBeInViewport();
    const lifeBox = await lifeButton.boundingBox();
    const albumBox = await albumButton.boundingBox();
    expect(lifeBox.x + lifeBox.width).toBeLessThanOrEqual(albumBox.x);
    expect(Math.abs(lifeBox.y - albumBox.y)).toBeLessThan(1);
    expect(albumBox.width).toBeLessThan(190);
    expect(albumBox.height).toBeLessThan(56);
    await expect(page.locator('.toolbar-right [data-action="life"]')).toHaveCount(0);
    await page.getByRole('button', { name: /打开我的相册/ }).click();
    const panel = page.locator('.marker-list-panel');
    await expect(panel).toBeVisible();
    await expect(panel).toHaveCSS('animation-name', 'panel-in');
    await page.waitForTimeout(300);
    const album = await panel.boundingBox();
    expect(album.x).toBeGreaterThanOrEqual(0);
    expect(album.x + album.width).toBeLessThanOrEqual(width);
    expect(Math.abs(album.x + album.width / 2 - width / 2)).toBeLessThan(2);
    expect(album.y).toBeGreaterThanOrEqual(0);
    expect(album.y + album.height).toBeLessThanOrEqual(900);
    await page.getByRole('button', { name: '关闭相册' }).click();
    await expect(panel).toHaveCount(0);
    await page.getByRole('button', { name: '打开设置', exact: true }).click();
    await expect(page.getByLabel('明暗模式')).toBeInViewport();
    await page.waitForTimeout(300);
    const settings = page.getByRole('dialog', { name: '设置', exact: true });
    const frame = await settings.boundingBox();
    const card = await settings.locator('.setting-group').first().boundingBox();
    for (const name of ['个人信息', '性能优化', '关于', '显示设置']) {
      await settings.getByRole('button', { name, exact: true }).click();
      await page.waitForTimeout(220);
      await expect(settings.locator('.settings-scroll')).toHaveJSProperty('scrollTop', 0);
      const current = await settings.boundingBox();
      expect(Math.abs(current.width - frame.width)).toBeLessThan(1);
      expect(Math.abs(current.height - frame.height)).toBeLessThan(1);
      const currentCard = await settings.locator('.setting-group').first().boundingBox();
      expect(Math.abs(currentCard.width - card.width)).toBeLessThan(1);
      const contentOverflow = await settings
        .locator('.settings-scroll')
        .evaluate(element => element.scrollWidth > element.clientWidth);
      expect(contentOverflow).toBe(false);
    }
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    expect(overflow).toBe(false);
  });
}

test('life navigation and village return focus correctly', async ({ page }) => {
  await page.getByRole('button', { name: '打开生活面板' }).click();
  await expect(page.getByRole('dialog', { name: '生活足迹' })).toBeVisible();
  await page.getByRole('button', { name: /中国.*省份/ }).click();
  await page.getByRole('button', { name: '返回' }).click();
  await page.getByRole('button', { name: /海外.*国家/ }).click();
  await page.getByRole('button', { name: '返回' }).click();
  await expect(page.getByRole('button', { name: /生成海报|复制应用链接/ })).toHaveCount(0);
  await expect(page.getByText('快捷操作', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('dialog', { name: '生活足迹' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: '打开生活面板' })).toBeFocused();
  await page.getByRole('button', { name: '打开地球村' }).click();
  await expect(page.getByRole('dialog', { name: '地球村', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '添加', exact: true })).toBeDisabled();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: '打开地球村' })).toBeFocused();
});

test('album remains accessible when the map SDK cannot load', async ({ page }) => {
  await page.route('https://api.mapbox.com/mapbox-gl-js/**/mapbox-gl.js', route => route.abort());
  await page.reload();
  await expect(page.getByRole('status').filter({ hasText: '地图服务未加载' })).toBeVisible();
  await expect(page.getByRole('button', { name: '照片热力图' })).toBeDisabled();
  await page.getByRole('button', { name: /打开我的相册/ }).click();
  await expect(page.getByRole('button', { name: '关闭相册' })).toBeVisible();
});

test('reduced motion closes the album without a long transition', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.getByRole('button', { name: /打开我的相册/ }).click();
  const duration = await page
    .locator('.marker-list-panel')
    .evaluate(element => parseFloat(getComputedStyle(element).animationDuration));
  expect(duration).toBeLessThan(0.01);
  await page.keyboard.press('Escape');
  await expect(page.locator('.marker-list-panel')).toHaveCount(0);
  await page.getByRole('button', { name: /打开我的相册/ }).click();
  await expect(page.locator('.marker-list-panel')).toBeVisible();
});

test('photos remain visible across viewer, editor and export, including mobile', async ({
  page,
}) => {
  await page.evaluate(async () => {
    const { webStorage } = await import('/src/api/webStorage.js');
    const data = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200"><rect width="200" height="200" fill="#2563eb"/><rect x="200" width="200" height="200" fill="#94a3b8"/></svg>')}`;
    await webStorage.markers.save({
      id: 'ui-test-place',
      lat: 31.2,
      lng: 121.5,
      name: '交互测试地点',
      createdAt: Date.now(),
    });
    await webStorage.photos.add('ui-test-place', {
      id: 'ui-test-photo-1',
      data,
      order: 0,
      note: '测试照片一',
    });
    await webStorage.photos.add('ui-test-place', {
      id: 'ui-test-photo-2',
      data,
      order: 1,
      note: '测试照片二',
    });
  });
  await page.reload();
  await expect(page.getByRole('combobox', { name: '搜索地点或地址' })).toBeVisible();
  await page.getByRole('button', { name: /打开我的相册/ }).click();
  await page.getByRole('button', { name: '打开 交互测试地点' }).click();
  await page.getByRole('button', { name: '查看照片', exact: true }).click();
  const storedPhoto = await page.evaluate(async () => {
    const photo = await window.electronAPI.getPhotoInfo('ui-test-photo-1');
    await window.electronAPI.storePhoto({ ...photo, note: '适配层保存测试' });
    const { webStorage } = await import('/src/api/webStorage.js');
    const photos = await webStorage.photos.getByMarkerId('ui-test-place');
    return photos.find(item => item.id === photo.id);
  });
  expect(storedPhoto.note).toBe('适配层保存测试');
  const photo = page.locator('.photo-main-wrapper img');
  await expect(photo).toBeVisible();
  await expect(photo).toHaveJSProperty('naturalWidth', 400);
  await page.keyboard.press('ArrowRight');
  await expect(page.getByText('2 / 2', { exact: true })).toBeVisible();
  await page.setViewportSize({ width: 375, height: 812 });
  await page.getByRole('button', { name: '编辑照片', exact: true }).click();
  await expect(page.locator('.pe-image-container img')).toHaveJSProperty('naturalWidth', 400);
  await expect(page.getByRole('button', { name: '导出副本' })).toBeDisabled();
  await page.getByRole('button', { name: '顺时针旋转' }).click();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: '导出副本' }).click();
  expect((await download).suggestedFilename()).toMatch(/^edited_.*\.jpg$/);
  await expect(photo).toBeVisible();
  await expect(photo).toHaveJSProperty('naturalWidth', 400);
  const strokes = await page
    .locator('.pv-btn .map-icon')
    .evaluateAll(elements => elements.map(element => getComputedStyle(element).fill));
  expect(strokes.every(fill => fill === 'none')).toBe(true);
});
