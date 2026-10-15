import { chromium } from "@playwright/test";
import { fileURLToPath, URL } from "node:url";
import process from "node:process";
const source = new URL("../public/og/setlog-share.svg", import.meta.url);
const output = new URL("../public/og/setlog-share-v1.png", import.meta.url);
const browser = await chromium.launch({
  channel: "chrome",
  executablePath: process.env.PLAYWRIGHT_CHROME_EXECUTABLE,
});
try {
  const page = await browser.newPage({
    viewport: { width: 1200, height: 630 },
    deviceScaleFactor: 1,
  });
  await page.goto(source.href);
  await page.evaluate("document.fonts.ready");
  await page.screenshot({ path: fileURLToPath(output) });
} finally {
  await browser.close();
}
