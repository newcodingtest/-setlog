import { test, expect } from "@playwright/test";
test("모바일 운동 기록, 재실행 복구, 이전 기록, 통계, 오프라인 PWA", async ({
  page,
  context,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.getByRole("button", { name: "운동 시작" })).toBeVisible();
  await page.getByRole("button", { name: "운동 시작" }).click();
  await page.getByRole("button", { name: "운동 종목 추가" }).click();
  await page.getByRole("dialog").getByLabel("운동 검색").fill("벤치프레스");
  await page
    .getByRole("button", { name: "벤치프레스 가슴", exact: true })
    .click();
  await page.getByLabel("1세트 중량").fill("60");
  await page.getByLabel("1세트 횟수").fill("10");
  await expect(
    page.getByRole("status").filter({ hasText: "저장 완료" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "1세트 완료" }).click();
  await page.getByRole("button", { name: "세트 추가", exact: true }).click();
  await page.getByLabel("2세트 중량").fill("70");
  await page.getByLabel("2세트 횟수").fill("8");
  await expect(page.getByRole("button", { name: "2세트 완료" })).toBeEnabled();
  await page.getByRole("button", { name: "2세트 완료" }).click();
  await page.getByRole("button", { name: "세트 추가", exact: true }).click();
  await expect(page.getByLabel("3세트 중량")).toHaveValue("70");
  await page.getByRole("button", { name: "3세트 완료" }).click();
  await page.reload();
  await expect(page.getByLabel("3세트 중량")).toHaveValue("70");
  await expect(
    page.getByRole("button", { name: "3세트 완료" }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "운동 완료", exact: true }).click();
  await page.getByRole("button", { name: "운동 완료 및 저장" }).click();
  await expect(page.getByText("총 볼륨 1,720kg · 눌러서 수정")).toBeVisible();
  await page
    .getByRole("navigation", { name: "모바일 메뉴" })
    .getByRole("link", { name: "성장 통계" })
    .click();
  await page.getByLabel("분석할 운동").selectOption({ label: "벤치프레스" });
  await expect(
    page
      .locator(".compact .metric")
      .filter({ hasText: "누적 훈련 볼륨" })
      .getByText("1,720kg", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("navigation", { name: "모바일 메뉴" })
    .getByRole("link", { name: "홈", exact: true })
    .click();
  await page.getByRole("button", { name: "운동 시작" }).click();
  const tomorrow = await page.evaluate(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return [
      d.getFullYear(),
      String(d.getMonth() + 1).padStart(2, "0"),
      String(d.getDate()).padStart(2, "0"),
    ].join("-");
  });
  await page.getByLabel("운동 날짜").fill(tomorrow);
  await expect(
    page.getByRole("status").filter({ hasText: "저장 완료" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "운동 종목 추가" }).click();
  await page.getByRole("dialog").getByLabel("운동 검색").fill("벤치프레스");
  await page
    .getByRole("button", { name: "벤치프레스 가슴", exact: true })
    .click();
  await expect(page.getByText("60 × 10", { exact: true })).toBeVisible();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  await context.setOffline(true);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "오늘의 운동" }),
  ).toBeVisible();
  await page.getByLabel("1세트 중량").fill("62.5");
  await page.getByLabel("1세트 횟수").fill("10");
  await expect(page.getByRole("button", { name: "1세트 완료" })).toBeEnabled();
  await page.getByRole("button", { name: "1세트 완료" }).click();
  await page.reload();
  await expect(page.getByLabel("1세트 중량")).toHaveValue("62.5");
  await expect(
    page.getByRole("button", { name: "1세트 완료" }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.screenshot({
    path: "test-results/mobile-workout.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});
