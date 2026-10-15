import { test, expect } from "@playwright/test";
test("홈의 홈 화면 추가 안내와 기기별 가이드, 복사, 설치 이벤트", async ({
  page,
}) => {
  await page.goto("/");
  const promotion = page.getByRole("region", {
    name: "운동 전, 홈 화면에 꼭 추가하세요",
  });
  await expect(promotion).toBeVisible();
  await promotion.getByRole("link", { name: "홈 화면 추가" }).click();
  await expect(
    page.getByRole("heading", {
      name: "홈 화면에 추가하고, 운동에만 집중하세요.",
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "iPhone · iPad" }).click();
  await expect(
    page.getByRole("heading", { name: "공유 버튼을 누르세요" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Android", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "오른쪽 위 메뉴 ⋮를 누르세요" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "주소 복사" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: /주소를 복사|아래 주소/ }),
  ).toBeVisible();
  await page.evaluate(() => {
    const event = Object.assign(
      new Event("beforeinstallprompt", { cancelable: true }),
      {
        prompt: () => Promise.resolve(),
        userChoice: Promise.resolve({ outcome: "dismissed" }),
      },
    );
    window.dispatchEvent(event);
  });
  await page.getByRole("button", { name: "지금 설치" }).click();
  await expect(page.getByRole("button", { name: "지금 설치" })).toHaveCount(0);
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "test-results/install-guide.png",
    fullPage: true,
  });
  await page.getByRole("link", { name: "홈으로", exact: true }).click();
  await page.evaluate(() => window.dispatchEvent(new Event("appinstalled")));
  await expect(
    page.getByRole("region", { name: "운동 전, 홈 화면에 꼭 추가하세요" }),
  ).toHaveCount(0);
});
test("카카오톡 인앱 브라우저 안내와 standalone 실행시 권유 숨김", async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({
    baseURL,
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 KAKAOTALK",
    viewport: { width: 390, height: 844 },
  });
  try {
    const page = await context.newPage();
    await page.goto("/install");
    await expect(page.getByText("카카오톡에서 열고 계신가요?")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "iPhone · iPad" }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("button", { name: "지금 설치" })).toHaveCount(
      0,
    );
  } finally {
    await context.close();
  }
  const standalone = await browser.newContext({
    baseURL,
  });
  try {
    await standalone.addInitScript(() => {
      const original = window.matchMedia.bind(window);
      window.matchMedia = (query) => {
        const media = original(query);
        if (query === "(display-mode: standalone)")
          Object.defineProperty(media, "matches", { value: true });
        return media;
      };
    });
    const page = await standalone.newPage();
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "오늘도, 한 세트 더." }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "홈 화면 추가" })).toHaveCount(
      0,
    );
  } finally {
    await standalone.close();
  }
});
test("JavaScript 없이 OG 태그와 1200×630 PNG 공유 이미지를 제공한다", async ({
  browser,
  request,
  baseURL,
}) => {
  const context = await browser.newContext({
    baseURL,
    javaScriptEnabled: false,
  });
  try {
    const page = await context.newPage();
    await page.goto("/");
    const image = await page
      .locator('meta[property="og:image"]')
      .getAttribute("content");
    if (image) {
      expect(["https:", "http:"]).toContain(new URL(image).protocol);
      expect(new URL(image).pathname).toBe("/og/setlog-share-v1.png");
    }
    if (!image) throw new Error("OG 이미지 누락");
    const canonical = await page
      .locator("link[rel=canonical]")
      .getAttribute("href");
    expect(new URL(image).origin).toBe(new URL(canonical ?? "").origin);
    expect(
      await page.locator('meta[property="og:title"]').getAttribute("content"),
    ).toContain("모든 세트가");
    const response = await request.get(new URL(image).pathname);
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("image/png");
    const body = await response.body();
    expect(body.readUInt32BE(16)).toBe(1200);
    expect(body.readUInt32BE(20)).toBe(630);
    const html = await (await request.get("/install")).text();
    expect(html).toContain('property="og:image"');
    expect(html).not.toContain("__SETLOG_SITE_URL__");
  } finally {
    await context.close();
  }
});
