import { defineConfig } from "@playwright/test";
const port = Number(process.env.SETLOG_TEST_PORT ?? 4173);
const baseURL = "http://localhost:" + port;
export default defineConfig({
  testDir: "e2e",
  timeout: 60000,
  workers: 1,
  use: {
    baseURL,
    channel: "chrome",
    launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROME_EXECUTABLE },
    viewport: { width: 390, height: 844 },
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run preview -- --port " + port + " --strictPort",
    url: baseURL,
    reuseExistingServer: process.env.SETLOG_TEST_EXTERNAL_SERVER === "1",
  },
});
