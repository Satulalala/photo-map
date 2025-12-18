#!/usr/bin/env node

/**
 * 项目快速设置脚本
 * 帮助用户快速配置项目
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function setup() {
  console.log('🚀 地图相册项目设置向导\n');

  // 检查是否已有 .env 文件
  const envPath = path.join(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    console.log('✅ .env 文件已存在');
    const overwrite = await question('是否要重新配置？(y/N): ');
    if (overwrite.toLowerCase() !== 'y') {
      console.log('设置已取消');
      rl.close();
      return;
    }
  }

  console.log('📝 请提供以下信息：\n');

  // 获取 Mapbox Token
  const mapboxToken = await question('Mapbox Access Token (必需): ');
  if (!mapboxToken) {
    console.log('❌ Mapbox Token 是必需的，请访问 https://mapbox.com 获取');
    rl.close();
    return;
  }

  // 获取应用名称
  const appName = await question('应用名称 (默认: 地图相册): ') || '地图相册';

  // 获取版本号
  const version = await question('版本号 (默认: 1.0.0): ') || '1.0.0';

  // 是否启用分析
  const enableAnalytics = await question('是否启用 Google Analytics？(y/N): ');
  let gaId = '';
  if (enableAnalytics.toLowerCase() === 'y') {
    gaId = await question('Google Analytics ID (G-XXXXXXXXXX): ');
  }

  // 生成 .env 文件内容
  const envContent = `# Mapbox API Token
VITE_MAPBOX_TOKEN=${mapboxToken}

# 应用配置
VITE_APP_NAME=${appName}
VITE_APP_VERSION=${version}

# Web 版本配置
VITE_WEB_MODE=true

${gaId ? `# Google Analytics\nVITE_GA_ID=${gaId}\n` : ''}
# 开发环境配置
VITE_DEV_MODE=true
`;

  // 写入 .env 文件
  fs.writeFileSync(envPath, envContent);

  console.log('\n✅ 配置完成！');
  console.log('\n📋 下一步：');
  console.log('1. 运行 npm install 安装依赖');
  console.log('2. 运行 npm run dev 启动开发服务器');
  console.log('3. 运行 npm run web:dev 启动 Web 版本');
  console.log('\n📖 查看 LAUNCH_GUIDE.md 获取详细部署指南');

  rl.close();
}

setup().catch(console.error);