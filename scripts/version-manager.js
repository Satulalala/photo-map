#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class VersionManager {
  constructor() {
    this.packagePath = path.join(__dirname, '../package.json');
    this.package = JSON.parse(fs.readFileSync(this.packagePath, 'utf8'));
  }

  getCurrentVersion() {
    return this.package.version;
  }

  updateVersion(newVersion) {
    this.package.version = newVersion;
    fs.writeFileSync(this.packagePath, JSON.stringify(this.package, null, 2) + '\n');
    console.log(`✅ Version updated to ${newVersion}`);
  }

  generateChangelog() {
    try {
      execSync('npx conventional-changelog -p angular -i CHANGELOG.md -s', { stdio: 'inherit' });
      console.log('✅ Changelog generated');
    } catch (error) {
      console.error('❌ Failed to generate changelog:', error.message);
    }
  }

  createGitTag(version) {
    try {
      execSync(`git add .`, { stdio: 'inherit' });
      execSync(`git commit -m "chore(release): ${version}"`, { stdio: 'inherit' });
      execSync(`git tag -a v${version} -m "Release v${version}"`, { stdio: 'inherit' });
      console.log(`✅ Git tag v${version} created`);
    } catch (error) {
      console.error('❌ Failed to create git tag:', error.message);
    }
  }

  bumpVersion(type = 'patch') {
    const currentVersion = this.getCurrentVersion();
    const [major, minor, patch] = currentVersion.split('.').map(Number);
    
    let newVersion;
    switch (type) {
      case 'major':
        newVersion = `${major + 1}.0.0`;
        break;
      case 'minor':
        newVersion = `${major}.${minor + 1}.0`;
        break;
      case 'patch':
      default:
        newVersion = `${major}.${minor}.${patch + 1}`;
        break;
    }

    this.updateVersion(newVersion);
    this.generateChangelog();
    this.createGitTag(newVersion);
    
    return newVersion;
  }

  prerelease(type = 'beta') {
    const currentVersion = this.getCurrentVersion();
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[-:]/g, '').replace('T', '');
    const newVersion = `${currentVersion}-${type}.${timestamp}`;
    
    this.updateVersion(newVersion);
    console.log(`✅ Prerelease version: ${newVersion}`);
    
    return newVersion;
  }

  validateCommitMessage(message) {
    const conventionalCommitRegex = /^(feat|fix|docs|style|refactor|test|chore)(\(.+\))?: .{1,50}/;
    return conventionalCommitRegex.test(message);
  }

  getVersionInfo() {
    const version = this.getCurrentVersion();
    const buildDate = new Date().toISOString();
    const gitHash = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
    const gitBranch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
    
    return {
      version,
      buildDate,
      gitHash,
      gitBranch,
      nodeVersion: process.version,
      platform: process.platform
    };
  }

  generateVersionFile() {
    const versionInfo = this.getVersionInfo();
    const versionFilePath = path.join(__dirname, '../src/version.json');
    
    fs.writeFileSync(versionFilePath, JSON.stringify(versionInfo, null, 2));
    console.log('✅ Version file generated:', versionFilePath);
    
    return versionInfo;
  }
}

// CLI 接口
if (require.main === module) {
  const versionManager = new VersionManager();
  const command = process.argv[2];
  const type = process.argv[3];

  switch (command) {
    case 'bump':
      versionManager.bumpVersion(type);
      break;
    case 'prerelease':
      versionManager.prerelease(type);
      break;
    case 'info':
      console.log(JSON.stringify(versionManager.getVersionInfo(), null, 2));
      break;
    case 'generate':
      versionManager.generateVersionFile();
      break;
    case 'validate':
      const message = process.argv.slice(3).join(' ');
      const isValid = versionManager.validateCommitMessage(message);
      console.log(isValid ? '✅ Valid commit message' : '❌ Invalid commit message');
      process.exit(isValid ? 0 : 1);
      break;
    default:
      console.log(`
版本管理工具

用法:
  node scripts/version-manager.js <command> [options]

命令:
  bump [major|minor|patch]  - 升级版本号 (默认: patch)
  prerelease [beta|alpha]   - 创建预发布版本 (默认: beta)
  info                      - 显示版本信息
  generate                  - 生成版本文件
  validate <message>        - 验证提交信息格式

示例:
  node scripts/version-manager.js bump minor
  node scripts/version-manager.js prerelease beta
  node scripts/version-manager.js validate "feat: add new feature"
      `);
  }
}

module.exports = VersionManager;