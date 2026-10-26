import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/browser', timeout: 60000, workers: 1,
  use: { baseURL: 'http://127.0.0.1:8080', viewport: { width: 1366, height: 1000 },
    launchOptions: { executablePath: process.env.CHROMIUM_PATH || (process.platform === 'win32' ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' : '/usr/bin/chromium'), args: ['--no-sandbox'] } },
  webServer: { command: 'npm start', url: 'http://127.0.0.1:8080', reuseExistingServer: !process.env.CI }
});
