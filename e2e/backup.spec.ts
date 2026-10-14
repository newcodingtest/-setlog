import { test, expect } from "@playwright/test";
test("사용자 운동 생성·수정·삭제, 백업 확인과 복구, 기록 삭제", async ({
  page,
}) => {
  await page.goto("/exercises");
  await page.getByRole("button", { name: "추가", exact: true }).click();
  await page.getByLabel("운동명", { exact: true }).fill("나의 풀업");
  await page.getByLabel("운동 부위").selectOption("등");
  await page.getByRole("button", { name: "저장", exact: true }).click();
  await expect(page.getByRole("heading", { name: "나의 풀업" })).toBeVisible();
  await page
    .getByRole("navigation", { name: "모바일 메뉴" })
    .getByRole("link", { name: "홈", exact: true })
    .click();
  await page.getByRole("button", { name: "운동 시작" }).click();
  await page.getByRole("button", { name: "운동 종목 추가" }).click();
  await page.getByRole("dialog").getByLabel("운동 검색").fill("나의 풀업");
  await page
    .getByRole("button", { name: "나의 풀업 등 · 사용자 운동" })
    .click();
  await page.getByLabel("1세트 횟수").fill("12");
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "1세트 완료" }).click();
  await page.getByRole("button", { name: "운동 완료", exact: true }).click();
  await page.getByRole("button", { name: "운동 완료 및 저장" }).click();
  await expect(page.getByText("0kg × 12회")).toBeVisible();
  await page
    .getByRole("navigation", { name: "모바일 메뉴" })
    .getByRole("link", { name: "운동 종목" })
    .click();
  await page.getByRole("button", { name: "나의 풀업 수정" }).click();
  await page.getByLabel("운동명", { exact: true }).fill("수정한 풀업");
  await page.getByRole("button", { name: "저장", exact: true }).click();
  await page.getByRole("button", { name: "수정한 풀업 삭제" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "삭제", exact: true })
    .click();
  await expect(page.getByRole("heading", { name: "수정한 풀업" })).toHaveCount(
    0,
  );
  await page
    .getByRole("navigation", { name: "모바일 메뉴" })
    .getByRole("link", { name: "설정", exact: true })
    .click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "내보내기", exact: true }).click();
  const download = await downloadPromise;
  const backupPath = await download.path();
  expect(backupPath).toBeTruthy();
  await page.locator("input[type=file]").setInputFiles({
    name: "invalid.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"version":99}'),
  });
  await expect(page.getByRole("alert")).toHaveText(
    "지원하지 않는 백업 형식 또는 버전입니다.",
  );
  await page.locator("input[type=file]").setInputFiles(backupPath!);
  await expect(
    page.getByRole("dialog", { name: "기존 데이터를 교체할까요?" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "취소", exact: true }).click();
  await page.getByRole("button", { name: "초기화", exact: true }).click();
  await page.getByRole("button", { name: "영구 삭제" }).click();
  await expect(page.getByText("데이터를 초기화했습니다.")).toBeVisible();
  await page.locator("input[type=file]").setInputFiles(backupPath!);
  await page.getByRole("button", { name: "데이터 교체", exact: true }).click();
  await expect(page.getByText("백업 복구가 완료되었습니다.")).toBeVisible();
  await page
    .getByRole("navigation", { name: "모바일 메뉴" })
    .getByRole("link", { name: "히스토리" })
    .click();
  await expect(page.getByText("나의 풀업", { exact: true })).toBeVisible();
  await page.getByRole("link").filter({ hasText: "총 볼륨 0kg" }).click();
  await expect(page.getByRole("heading", { name: "나의 풀업" })).toBeVisible();
  await page.getByRole("button", { name: "운동 기록 삭제" }).click();
  await page.getByRole("button", { name: "영구 삭제" }).click();
  await expect(
    page.getByRole("heading", { name: "이날의 운동 기록이 없어요" }),
  ).toBeVisible();
});
test("데스크톱과 작은 모바일의 레이아웃·기본 접근성", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await expect(page.getByRole("navigation", { name: "주 메뉴" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "오늘도, 한 세트 더." }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/desktop-home.png",
    fullPage: true,
  });
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
    path: "test-results/mobile-home.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "운동 시작" }).click();
  await page.getByRole("button", { name: "운동 종목 추가" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByLabel("운동 검색")).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("button", { name: "전체", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(page.getByLabel("운동 검색")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "운동 종목 추가" }),
  ).toBeFocused();
});
