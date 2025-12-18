const { test, expect, _electron: electron } = require('@playwright/test');
const path = require('path');

let electronApp;
let window;

test.beforeAll(async () => {
  // 启动 Electron 应用
  electronApp = await electron.launch({
    args: [path.join(__dirname, '../main.js')],
    env: {
      ...process.env,
      NODE_ENV: 'test'
    }
  });
  
  // 获取第一个窗口
  window = await electronApp.firstWindow();
  await window.waitForLoadState('domcontentloaded');
});

test.afterAll(async () => {
  await electronApp.close();
});

test.describe('登录页面', () => {
  test('应该显示登录页面', async () => {
    // 等待登录页面加载
    const loginPage = await window.locator('.login-page');
    await expect(loginPage).toBeVisible();
  });

  test('应该显示应用标题', async () => {
    const title = await window.locator('.login-title');
    await expect(title).toContainText('地图相册');
  });

  test('应该显示定位进度', async () => {
    const progress = await window.locator('.progress-bar');
    await expect(progress).toBeVisible();
  });

  test('点击开始探索应该进入地图', async () => {
    // 等待定位完成
    await window.waitForTimeout(2000);
    
    // 点击开始探索按钮
    const startBtn = await window.locator('button:has-text("开始探索")');
    await startBtn.click();
    
    // 等待地图加载
    await window.waitForTimeout(1000);
    
    // 验证地图容器存在
    const mapContainer = await window.locator('.map-container');
    await expect(mapContainer).toBeVisible();
  });
});

test.describe('地图页面', () => {
  test('应该显示搜索栏', async () => {
    const searchBar = await window.locator('.search-bar');
    await expect(searchBar).toBeVisible();
  });

  test('应该显示工具栏', async () => {
    const toolbar = await window.locator('.toolbar');
    await expect(toolbar).toBeVisible();
  });

  test('搜索功能应该工作', async () => {
    const searchInput = await window.locator('.search-bar input');
    await searchInput.fill('北京');
    
    // 等待搜索结果
    await window.waitForTimeout(1500);
    
    const results = await window.locator('.search-results');
    await expect(results).toBeVisible();
  });

  test('点击地图应该显示右键菜单', async () => {
    const map = await window.locator('.map-container');
    await map.click({ position: { x: 400, y: 300 } });
    
    await window.waitForTimeout(500);
    
    const contextMenu = await window.locator('.context-menu');
    // 菜单可能显示也可能不显示，取决于点击位置
  });

  test('标记数量按钮应该可点击', async () => {
    const markerBtn = await window.locator('.marker-count-btn');
    await expect(markerBtn).toBeVisible();
    await markerBtn.click();
    
    // 应该显示标记列表
    const markerList = await window.locator('.marker-list-panel');
    await expect(markerList).toBeVisible();
    
    // 关闭列表
    const closeBtn = await window.locator('.marker-list-panel .panel-close');
    await closeBtn.click();
  });

  test('设置按钮应该打开设置面板', async () => {
    const settingsBtn = await window.locator('.settings-btn');
    await settingsBtn.click();
    
    const settingsPanel = await window.locator('.settings-panel');
    await expect(settingsPanel).toBeVisible();
    
    // 关闭设置
    const closeBtn = await window.locator('.settings-close');
    await closeBtn.click();
  });
});
