import { defineConfig } from '@playwright/test';
import { existsSync } from 'node:fs';

const localEdge =
  process.platform === 'win32' &&
  !process.env.CI &&
  [process.env.ProgramFiles, process.env['ProgramFiles(x86)']].some(
    root => root && existsSync(`${root}/Microsoft/Edge/Application/msedge.exe`)
  );

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  timeout: 30000,
  use: {
    baseURL: 'http://127.0.0.1:3001',
    channel: process.env.PLAYWRIGHT_CHANNEL || (localEdge ? 'msedge' : undefined),
    launchOptions: { args: ['--enable-unsafe-swiftshader'] },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npm run web:dev',
    url: 'http://127.0.0.1:3001',
    reuseExistingServer: !process.env.CI,
    timeout: 60000,
  },
});
