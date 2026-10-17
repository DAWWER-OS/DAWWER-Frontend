const { defineConfig } = require('@playwright/test');
module.exports = defineConfig({
  testDir: './tests/e2e', fullyParallel: false, workers: 1, timeout: 30000,
  use: { baseURL: 'http://127.0.0.1:4173', channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome', headless: true, trace: 'retain-on-failure' },
  webServer: { command: 'node scripts/serve.cjs', url: 'http://127.0.0.1:4173/login.html', reuseExistingServer: !process.env.CI }
});
