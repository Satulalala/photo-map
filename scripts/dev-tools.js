#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🛠️  开发工具集');
console.log('================');

const tools = [
  {
    name: '1. 清理缓存',
    description: '清理 node_modules/.vite 和构建缓存',
    action: () => {
      try {
        execSync('npm run clean', { stdio: 'inherit' });
        console.log('✅ 缓存清理完成');
      } catch (error) {
        console.error('❌ 清理失败:', error.message);
      }
    }
  },
  {
    name: '2. 重新安装依赖',
    description: '删除 node_modules 并重新安装',
    action: () => {
      try {
        execSync('npm run clean:all', { stdio: 'inherit' });
        execSync('npm install', { stdio: 'inherit' });
        console.log('✅ 依赖重新安装完成');
      } catch (error) {
        console.error('❌ 安装失败:', error.message);
      }
    }
  },
  {
    name: '3. 代码检查和格式化',
    description: '运行 ESLint 和 Prettier',
    action: () => {
      try {
        execSync('npm run lint:fix', { stdio: 'inherit' });
        execSync('npm run format', { stdio: 'inherit' });
        console.log('✅ 代码检查和格式化完成');
      } catch (error) {
        console.error('❌ 检查失败:', error.message);
      }
    }
  },
  {
    name: '4. 运行所有测试',
    description: '运行单元测试和 E2E 测试',
    action: () => {
      try {
        execSync('npm run test', { stdio: 'inherit' });
        execSync('npm run test:e2e', { stdio: 'inherit' });
        console.log('✅ 所有测试通过');
      } catch (error) {
        console.error('❌ 测试失败:', error.message);
      }
    }
  },
  {
    name: '5. 生成项目报告',
    description: '生成依赖分析和安全审计报告',
    action: () => {
      try {
        execSync('npm run build:analyze', { stdio: 'inherit' });
        execSync('npm run audit:report', { stdio: 'inherit' });
        console.log('✅ 报告生成完成');
        console.log('📊 查看 dist/stats.html 了解包大小分析');
        console.log('🔒 查看 audit-report.json 了解安全审计');
      } catch (error) {
        console.error('❌ 报告生成失败:', error.message);
      }
    }
  }
];

// 显示菜单
tools.forEach(tool => {
  console.log(`\n${tool.name}`);
  console.log(`   ${tool.description}`);
});

console.log('\n请输入选项编号 (1-5), 或按 Enter 退出:');

process.stdin.setEncoding('utf8');
process.stdin.on('readable', () => {
  const chunk = process.stdin.read();
  if (chunk !== null) {
    const choice = chunk.trim();
    const toolIndex = parseInt(choice) - 1;
    
    if (toolIndex >= 0 && toolIndex < tools.length) {
      console.log(`\n执行: ${tools[toolIndex].name}`);
      tools[toolIndex].action();
    } else if (choice === '') {
      console.log('👋 再见!');
      process.exit(0);
    } else {
      console.log('❌ 无效选项，请输入 1-5');
    }
    
    console.log('\n请输入选项编号 (1-5), 或按 Enter 退出:');
  }
});

process.stdin.on('end', () => {
  console.log('👋 再见!');
  process.exit(0);
});