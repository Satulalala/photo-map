import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const output = new URL('../test-results/ui-previews/', import.meta.url);
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'msedge', args: ['--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(60000);
await page.addInitScript(() => localStorage.setItem('analytics_consent', 'denied'));
const errors = [];
page.on('pageerror', error => errors.push(error.message));
page.on('dialog', dialog => dialog.dismiss());
const capture = name => page.screenshot({ path: fileURLToPath(new URL(name, output)) });
try {
  await page.goto('http://localhost:3001');
  await page.getByRole('button', { name: '暂不登录', exact: true }).click();
  await page.getByRole('button', { name: '进入地图', exact: true }).click();
  await page.getByRole('button', { name: '照片热力图' }).waitFor({ state: 'visible' });
  await page
    .waitForFunction(() => !document.querySelector('[data-action="heatmap"]').disabled, undefined, {
      timeout: 45000,
    })
    .catch(() => {
      errors.push('Headless map did not become ready within 45 seconds');
    });
  await page.waitForTimeout(1500);
  await capture('map-desktop.png');
  await page.getByRole('button', { name: '打开设置', exact: true }).click();
  await page.waitForTimeout(350);
  await capture('settings-light.png');
  for (const [name, file] of [
    ['个人信息', 'settings-user.png'],
    ['性能优化', 'settings-performance.png'],
    ['关于', 'settings-about.png'],
  ]) {
    await page
      .getByRole('dialog', { name: '设置', exact: true })
      .getByRole('button', { name, exact: true })
      .click();
    await page.waitForTimeout(250);
    await capture(file);
  }
  await page.getByRole('button', { name: '显示设置', exact: true }).click();
  await page.getByLabel('明暗模式').selectOption('dark');
  await page.waitForTimeout(350);
  await capture('settings-dark.png');
  await page.getByLabel('明暗模式').selectOption('light');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: '打开生活面板' }).click();
  await page.waitForTimeout(350);
  await capture('life-desktop.png');
  await page.keyboard.press('Escape');
  await page.setViewportSize({ width: 375, height: 812 });
  await page.waitForTimeout(350);
  await capture('map-mobile.png');
  await page.getByRole('button', { name: '打开设置', exact: true }).click();
  await page.waitForTimeout(350);
  await capture('settings-mobile.png');
  console.log(JSON.stringify({ output: output.pathname, pageErrors: errors }));
} catch (error) {
  await capture('capture-failure.png');
  console.log(await page.locator('body').innerText());
  throw error;
} finally {
  await browser.close();
}
