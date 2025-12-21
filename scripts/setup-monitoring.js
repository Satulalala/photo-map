#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

class MonitoringSetup {
  constructor() {
    this.config = {};
    this.envPath = path.join(__dirname, '../.env');
  }

  async setup() {
    console.log('🚀 监控系统设置向导');
    console.log('================');
    console.log('');

    try {
      await this.collectConfig();
      await this.generateEnvFile();
      await this.installDependencies();
      await this.generateVersionFile();
      
      console.log('');
      console.log('✅ 监控系统设置完成！');
      console.log('');
      console.log('📋 下一步：');
      console.log('1. 检查 .env 文件中的配置');
      console.log('2. 运行 npm run dev 测试应用');
      console.log('3. 运行 npm run version:info 查看版本信息');
      console.log('4. 查看 docs/MONITORING_SETUP.md 了解详细使用方法');
      
    } catch (error) {
      console.error('❌ 设置失败:', error.message);
    } finally {
      rl.close();
    }
  }

  async collectConfig() {
    console.log('📝 请提供以下配置信息（可选，直接回车跳过）：');
    console.log('');

    // Sentry 配置
    this.config.sentryDsn = await this.question('Sentry DSN (错误监控): ');
    this.config.sentryOrg = await this.question('Sentry 组织名: ');
    this.config.sentryProject = await this.question('Sentry 项目名: ');
    this.config.sentryAuthToken = await this.question('Sentry 认证令牌: ');

    console.log('');

    // GitHub 配置
    this.config.githubToken = await this.question('GitHub Token (自动发布): ');

    console.log('');

    // Netlify 配置
    this.config.netlifyAuthToken = await this.question('Netlify Auth Token (Web部署): ');
    this.config.netlifySiteId = await this.question('Netlify Site ID: ');

    console.log('');

    // 应用配置
    this.config.appVersion = await this.question('应用版本 [1.0.0]: ') || '1.0.0';
    this.config.nodeEnv = await this.question('环境 [development]: ') || 'development';
  }

  async generateEnvFile() {
    console.log('📄 生成环境配置文件...');

    const envContent = `# 应用配置
NODE_ENV=${this.config.nodeEnv}
APP_VERSION=${this.config.appVersion}

# Sentry 错误监控
SENTRY_DSN=${this.config.sentryDsn || ''}
SENTRY_ORG=${this.config.sentryOrg || ''}
SENTRY_PROJECT=${this.config.sentryProject || 'photo-map'}
SENTRY_AUTH_TOKEN=${this.config.sentryAuthToken || ''}

# 性能监控
PERFORMANCE_ENDPOINT=/api/performance
ANALYTICS_ENDPOINT=/api/analytics

# 构建配置
BUILD_TARGET=desktop
ELECTRON_BUILDER_CACHE_DIR=.cache/electron-builder

# GitHub 发布
GITHUB_TOKEN=${this.config.githubToken || ''}

# Netlify 部署
NETLIFY_AUTH_TOKEN=${this.config.netlifyAuthToken || ''}
NETLIFY_SITE_ID=${this.config.netlifySiteId || ''}

# 开发配置
VITE_DEV_SERVER_PORT=3000
ELECTRON_DEV_PORT=3001
`;

    fs.writeFileSync(this.envPath, envContent);
    console.log('✅ .env 文件已生成');
  }

  async installDependencies() {
    console.log('📦 检查并安装必要依赖...');

    const packageJsonPath = path.join(__dirname, '../package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

    const requiredDeps = {
      '@sentry/electron': '^4.0.0',
      '@sentry/webpack-plugin': '^2.0.0'
    };

    const requiredDevDeps = {
      'semantic-release': '^22.0.0',
      '@semantic-release/changelog': '^6.0.0',
      '@semantic-release/git': '^10.0.0',
      '@semantic-release/github': '^9.0.0',
      'conventional-changelog-cli': '^4.0.0'
    };

    let needsInstall = false;

    // 检查生产依赖
    for (const [dep, version] of Object.entries(requiredDeps)) {
      if (!packageJson.dependencies?.[dep]) {
        packageJson.dependencies = packageJson.dependencies || {};
        packageJson.dependencies[dep] = version;
        needsInstall = true;
        console.log(`➕ 添加依赖: ${dep}`);
      }
    }

    // 检查开发依赖
    for (const [dep, version] of Object.entries(requiredDevDeps)) {
      if (!packageJson.devDependencies?.[dep]) {
        packageJson.devDependencies = packageJson.devDependencies || {};
        packageJson.devDependencies[dep] = version;
        needsInstall = true;
        console.log(`➕ 添加开发依赖: ${dep}`);
      }
    }

    if (needsInstall) {
      fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
      console.log('📝 package.json 已更新');
      console.log('⚠️  请运行 npm install 安装新依赖');
    } else {
      console.log('✅ 所有依赖已存在');
    }
  }

  async generateVersionFile() {
    console.log('📋 生成版本信息文件...');

    try {
      const { execSync } = require('child_process');
      
      const versionInfo = {
        version: this.config.appVersion,
        buildDate: new Date().toISOString(),
        gitHash: this.getGitHash(),
        gitBranch: this.getGitBranch(),
        nodeVersion: process.version,
        platform: process.platform
      };

      const versionPath = path.join(__dirname, '../src/version.json');
      fs.writeFileSync(versionPath, JSON.stringify(versionInfo, null, 2));
      console.log('✅ 版本文件已生成');

    } catch (error) {
      console.warn('⚠️  版本文件生成失败:', error.message);
    }
  }

  getGitHash() {
    try {
      const { execSync } = require('child_process');
      return execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
    } catch {
      return 'unknown';
    }
  }

  getGitBranch() {
    try {
      const { execSync } = require('child_process');
      return execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
    } catch {
      return 'unknown';
    }
  }

  question(prompt) {
    return new Promise((resolve) => {
      rl.question(prompt, (answer) => {
        resolve(answer.trim());
      });
    });
  }
}

// 运行设置向导
if (require.main === module) {
  const setup = new MonitoringSetup();
  setup.setup().catch(console.error);
}

module.exports = MonitoringSetup;