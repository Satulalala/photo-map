const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const semver = require('semver');
const pkg = require('../package.json');

console.log(`Node ${process.version} (项目要求 ${pkg.engines.node})`);
if (!semver.satisfies(process.version, pkg.engines.node)) process.exitCode = 1;

for (const name of ['vite', 'electron', 'vitest', '@electron/rebuild']) {
  try {
    const file = path.join(__dirname, '..', 'node_modules', name, 'package.json');
    console.log(`${name}: ${JSON.parse(fs.readFileSync(file, 'utf8')).version}`);
  } catch {
    console.error(`${name}: 未安装，请运行 npm ci`);
    process.exitCode = 1;
  }
}

// Java 后端是可选服务；缺少工具时给出操作提示，不阻止 Web 离线开发。
if (process.platform === 'win32') {
  const script = path.join(__dirname, 'backend.ps1');
  const result = spawnSync('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', script, 'check'], {
    encoding: 'utf8',
  });
  console.log(`${result.stdout || ''}${result.stderr || ''}`.trim());
} else for (const [tool, args] of [
  ['java', ['-version']],
  ['mvn', ['-version']],
]) {
  const result = spawnSync(tool, args, { encoding: 'utf8', shell: process.platform === 'win32' });
  const output = `${result.stdout || ''}${result.stderr || ''}`.trim();
  console.log(
    result.status === 0
      ? `${tool}: ${output.split(/\r?\n/)[0]}`
      : `${tool}: 未检测到。后端开发需要 JDK 17+ 与 Maven 3.6.3+。`
  );
}
