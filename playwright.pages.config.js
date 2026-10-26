import { defineConfig } from '@playwright/test';
import browserConfig from './playwright.config.js';
export default defineConfig({
  testDir: './tests/pages', timeout: 30000, workers: 1,
  use: { ...browserConfig.use, baseURL: 'http://127.0.0.1:8090/CRICKET-CHAMPION/' },
  // Python serves only the exported files, with no Node server or node_modules.
  webServer: {
    command: 'python3 -m http.server 8090 --bind 0.0.0.0 --directory dist',
    url: 'http://127.0.0.1:8090/CRICKET-CHAMPION/',
    reuseExistingServer: false
  }
});
