import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e",
  timeout: 45000,
  expect: { timeout: 10000 },
  workers: 1,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: process.env.TEST_BASE_URL,
    headless: true,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [320, 375, 768, 1440].map((width) => ({
    name: `${width}px`,
    use: { viewport: { width, height: 900 } },
  })),
});
