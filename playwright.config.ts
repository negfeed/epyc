import { defineConfig, devices } from '@playwright/test';

/**
 * E2E config. Tests run against the dev server (ng serve) with the app pointed at
 * the local Firebase emulators via the ?emu=1 flag. Use the `e2e` npm script,
 * which wraps the run in `firebase emulators:exec` so the emulators are started
 * fresh and torn down automatically.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:8108',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm start -- --port 8108',
    url: 'http://localhost:8108',
    reuseExistingServer: true,
    timeout: 180_000,
  },
});
