import { test, expect, type Page } from "@playwright/test";
async function record(page: Page, name: string, weight: string) {
  await page.goto("/");
  await page.getByRole("button", { name: "운동 시작" }).click();
  await page.getByRole("button", { name: "운동 종목 추가" }).click();
  await page.getByRole("dialog").getByLabel("운동 검색").fill(name);
  await page
    .getByRole("dialog")
    .getByRole("button", {
      name: name + (name === "벤치프레스" ? " 가슴" : " 하체"),
      exact: true,
    })
    .click();
  await page.getByLabel("1세트 중량").fill(weight);
  await expect(page.getByRole("button", { name: "1세트 완료" })).toBeEnabled();
  await page.getByRole("button", { name: "1세트 완료" }).click();
  await page.getByRole("button", { name: "운동 완료", exact: true }).click();
  await page.getByRole("button", { name: "운동 완료 및 저장" }).click();
}
async function download(page: Page) {
  await page.goto("/settings");
  const waiting = page.waitForEvent("download");
  await page.getByRole("button", { name: "내보내기", exact: true }).click();
  const result = await waiting;
  const path = await result.path();
  if (!path) throw new Error("백업 다운로드 실패");
  return path;
}
test("PC 백업을 휴대폰 기록과 병합하고 반복 가져오기 및 최신 수정본을 반영한다", async ({
  page,
  browser,
}) => {
  const pcContext = await browser.newContext({
    baseURL: "http://localhost:4173",
    viewport: { width: 1440, height: 900 },
  });
  try {
    const pc = await pcContext.newPage();
    await record(page, "스쿼트", "100");
    await record(pc, "벤치프레스", "60");
    let file = await download(pc);
    await page.goto("/settings");
    await page.locator("input[type=file]").setInputFiles(file);
    await expect(page.getByRole("dialog")).toContainText("새 운동 1개");
    await page.getByRole("button", { name: "기록 병합", exact: true }).click();
    await expect(page.getByText("백업 병합이 완료되었습니다.")).toBeVisible();
    await page.goto("/history");
    await expect(page.getByText("스쿼트", { exact: true })).toBeVisible();
    await expect(page.getByText("벤치프레스", { exact: true })).toBeVisible();
    await page.goto("/settings");
    await page.locator("input[type=file]").setInputFiles(file);
    await expect(page.getByRole("dialog")).toContainText("새 운동 0개");
    await expect(page.getByRole("dialog")).toContainText("동일 기록 1개");
    await page.getByRole("button", { name: "기록 병합", exact: true }).click();
    await page.goto("/history");
    await expect(page.locator(".history-record")).toHaveCount(2);
    await pc.goto("/history");
    await pc.locator(".history-record").click();
    await pc.getByLabel("1세트 중량").fill("80");
    await expect(
      pc.getByRole("status").filter({ hasText: "저장 완료" }),
    ).toBeVisible();
    file = await download(pc);
    await page.goto("/settings");
    await page.locator("input[type=file]").setInputFiles(file);
    await expect(page.getByRole("dialog")).toContainText(
      "최신 기록으로 갱신 1개",
    );
    await page.screenshot({
      path: "test-results/merge-preview.png",
      fullPage: true,
    });
    await page.getByRole("button", { name: "기록 병합", exact: true }).click();
    await page.goto("/history");
    await expect(page.getByText("80kg × 10회")).toBeVisible();
    await expect(page.getByText("100kg × 10회")).toBeVisible();
    await expect(page.locator(".history-record")).toHaveCount(2);
  } finally {
    await pcContext.close();
  }
});
