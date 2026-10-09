import { expect, test } from '@playwright/test';

const pageErrors = new WeakMap();

test.beforeEach(async ({ page }) => {
  const errors = [];
  pageErrors.set(page, errors);
  page.on('pageerror', error => errors.push(error.message));

  // Each Playwright test gets a fresh browser context, including isolated IndexedDB.
  // Keep map SDK behavior deterministic and avoid requests to external map services.
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
  await expect(page.locator('.login-buttons-container')).toBeVisible();
});

test.afterEach(async ({ page }) => {
  expect(pageErrors.get(page)).toEqual([]);
});

test('login choices fit mobile, tablet, desktop, and short viewports', async ({ page }) => {
  const container = page.locator('.login-buttons-container');
  const email = page.getByRole('button', { name: '邮箱登录' });
  const guest = page.getByRole('button', { name: '暂不登录' });
  const github = page.getByRole('button', { name: 'GitHub 登录，尚未接入' });

  await expect(email).toBeVisible();
  await expect(guest).toBeVisible();
  await expect(github).toBeDisabled();
  await expect(github).toContainText('未接入');

  await guest.hover();
  expect(await guest.evaluate(button => button.matches(':hover'))).toBe(true);
  await page.mouse.move(0, 0);

  for (const [width, height] of [
    [320, 480],
    [320, 568],
    [375, 667],
    [768, 768],
    [1440, 900],
  ]) {
    await page.setViewportSize({ width, height });

    const group = await container.boundingBox();
    const emailBox = await email.boundingBox();
    const guestBox = await guest.boundingBox();
    const githubBox = await github.boundingBox();
    expect(group.x).toBeGreaterThanOrEqual(0);
    expect(group.x + group.width).toBeLessThanOrEqual(width);
    expect(group.y + group.height).toBeLessThanOrEqual(height);
    expect(emailBox.height).toBeCloseTo(44, 1);
    expect(guestBox.height).toBeCloseTo(44, 1);
    expect(githubBox.height).toBeCloseTo(36, 1);
    expect(Math.abs(emailBox.y - guestBox.y)).toBeLessThan(1);
    expect(githubBox.y).toBeGreaterThanOrEqual(emailBox.y + emailBox.height);
    const globe = await page.locator('.globe-map-container').boundingBox();
    const content = await page.locator('.globe-content').boundingBox();
    expect(globe.width).toBeCloseTo(width, 0);
    expect(globe.height).toBeCloseTo(height, 0);
    if (width > 760) expect(content.x + content.width).toBeLessThanOrEqual(width * 0.4);
    else expect(content.y).toBeGreaterThanOrEqual(height * 0.38 - 1);
    await expect(email).toHaveCSS('font-size', '14px');
    await expect(email.locator('svg')).toHaveCSS('width', '18px');
  }

  await page.setViewportSize({ width: 320, height: 480 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(container).toHaveCSS('animation-name', 'none');
  await expect(email).toHaveCSS('transition-duration', '0s');
  await expect(email).toHaveCSS('transform', 'none');
  const reducedGroup = await container.boundingBox();
  expect(reducedGroup.x).toBeGreaterThanOrEqual(0);
  expect(reducedGroup.x + reducedGroup.width).toBeLessThanOrEqual(320);
  await email.hover();
  await expect(email).toHaveCSS('transform', 'none');
  await guest.hover();
  await expect(guest).toHaveCSS('transform', 'none');
  await page.mouse.move(0, 0);
  await email.click();
  await expect(page.locator('.email-form-overlay')).toHaveCSS('animation-name', 'none');
  await expect(page.locator('.email-form-modal')).toHaveCSS('animation-name', 'none');
});

test('Escape closes email sign-in and restores focus to its trigger', async ({ page }) => {
  const trigger = page.getByRole('button', { name: '邮箱登录' });
  await trigger.click();
  await expect(page.getByRole('dialog', { name: '邮箱登录' })).toBeVisible();

  await page.keyboard.press('Escape');

  await expect(page.locator('.email-form-overlay')).toHaveCount(0);
  await expect(trigger).toBeFocused();
});

test('registration mode exposes confirmation and password visibility controls', async ({
  page,
}) => {
  await page.getByRole('button', { name: '邮箱登录' }).click();
  const dialog = page.locator('.email-form-overlay');
  await dialog.locator('.email-form-tabs').getByRole('button', { name: '注册' }).click();

  const password = page.getByLabel('密码', { exact: true });
  const confirmation = page.getByLabel('确认密码');
  await expect(confirmation).toBeVisible();
  await password.fill('sample-pass-123');
  await page.getByRole('button', { name: '显示密码' }).click();
  await expect(password).toHaveAttribute('type', 'text');
  await expect(confirmation).toHaveAttribute('type', 'text');

  await page.getByRole('button', { name: '隐藏密码' }).click();
  await expect(password).toHaveAttribute('type', 'password');
  await dialog
    .locator('.email-form-tabs')
    .getByRole('button', { name: '登录', exact: true })
    .click();
  await expect(page.locator('#login-confirm-password')).toHaveCount(0);
});

test('guest choice enables map entry and the map opens the album', async ({ page }) => {
  const enterMap = page.getByRole('button', { name: '进入地图' });
  await expect(enterMap).toBeDisabled();
  await expect(enterMap).toHaveCSS('height', '44px');

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.getByRole('button', { name: '暂不登录' }).click();
  await expect(enterMap).toBeEnabled();
  await expect(enterMap).toHaveCSS('height', '44px');
  await expect(enterMap).toHaveCSS('transition-duration', '0s');
  const desktopEntry = await enterMap.boundingBox();
  expect(desktopEntry.width).toBeGreaterThanOrEqual(240);
  expect(desktopEntry.width).toBeLessThanOrEqual(360);

  await page.setViewportSize({ width: 375, height: 667 });
  const mobileEntry = await enterMap.boundingBox();
  expect(mobileEntry.width).toBe(327);
  await enterMap.hover();
  await expect(enterMap).toHaveCSS('transform', 'none');
  await enterMap.click();
  await expect(page.getByRole('combobox', { name: '搜索地点或地址' })).toBeVisible();
  await page.getByRole('button', { name: /打开我的相册/ }).click();
  await expect(page.locator('.marker-list-panel.open')).toBeVisible();
});

test('guest stays on the map after refresh until settings opens account login', async ({
  page,
}) => {
  await page.getByRole('button', { name: '暂不登录' }).click();
  await page.getByRole('button', { name: '进入地图', exact: true }).click();
  const search = page.getByRole('combobox', { name: '搜索地点或地址' });
  await expect(search).toBeVisible();
  await page.reload();
  await expect(search).toBeVisible();
  await expect(page.locator('.login-buttons-container')).toHaveCount(0);
  await Promise.all([
    page.waitForEvent('load'),
    page.getByRole('button', { name: '刷新地图', exact: true }).click(),
  ]);
  await expect(search).toBeVisible();
  await page.getByRole('button', { name: '打开设置', exact: true }).click();
  await page.getByRole('button', { name: '个人信息', exact: true }).click();
  await page.getByRole('button', { name: '登录账号', exact: true }).click();
  await expect(page.getByRole('button', { name: '邮箱登录', exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: '邮箱登录', exact: true })).toBeVisible();
  await expect(search).toHaveCount(0);
});

test('refreshing after choosing guest does not enter the map before clicking entry', async ({
  page,
}) => {
  await page.getByRole('button', { name: '暂不登录' }).click();
  await expect(page.getByRole('button', { name: '进入地图', exact: true })).toBeEnabled();
  await page.reload();
  await expect(page.getByRole('button', { name: '邮箱登录', exact: true })).toBeVisible();
  await expect(page.getByRole('combobox', { name: '搜索地点或地址' })).toHaveCount(0);
});

test('account stays on the map after refresh and settings logout clears the session', async ({
  page,
}) => {
  // Seed only the local account state; no production account or network login is used.
  await page.evaluate(() => {
    localStorage.setItem(
      'auth_user',
      JSON.stringify({ id: 'refresh-user', email: 'refresh@example.com', type: 'email' })
    );
    localStorage.setItem('auth_token', 'local-test-token');
  });
  await page.reload();
  await expect(page.locator('.logged-in-name')).toHaveText('refresh@example.com');
  await expect(page.getByRole('combobox', { name: '搜索地点或地址' })).toHaveCount(0);
  await page.getByRole('button', { name: '进入地图', exact: true }).click();
  await page.reload();
  await expect(page.getByRole('combobox', { name: '搜索地点或地址' })).toBeVisible();
  await page.getByRole('button', { name: '打开设置', exact: true }).click();
  await page.getByRole('button', { name: '个人信息', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'refresh@example.com', exact: true })
  ).toBeVisible();
  page.removeAllListeners('dialog');
  page.on('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: /退出登录/ }).click();
  await expect(page.getByRole('button', { name: '邮箱登录', exact: true })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('auth_token'))).toBeNull();
  await page.reload();
  await expect(page.getByRole('button', { name: '邮箱登录', exact: true })).toBeVisible();
});
