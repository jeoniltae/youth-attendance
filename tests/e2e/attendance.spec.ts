// 출석체크 메인 E2E — 저장 실패 롤백. 저장 요청은 page.route가 받아 실패시키므로 서버·시트에 닿지 않는다

import { expect, test } from "@playwright/test";
import { FIRST_STUDENT, mockGateApis } from "./mock";

// 메인은 오늘이 일요일일 때만 카드를 누를 수 있다 — 브라우저 시계를 일요일 예배 시간으로 고정
const SUNDAY_SERVICE = new Date("2026-11-08T11:00:00+09:00");

test("저장에 실패하면 출석 카드가 체크 전 상태로 돌아간다", async ({ page }) => {
  await page.clock.setFixedTime(SUNDAY_SERVICE);
  await mockGateApis(page);
  await page.addInitScript(() => sessionStorage.setItem("session_token", "e2e"));

  // 토글 POST는 쿼리가 없어 mockGateApis의 GET 패턴에 걸리지 않는다 — 여기서 따로 잡는다
  let failSave = () => {};
  const saveHeld = new Promise<void>((resolve) => {
    failSave = resolve;
  });
  let saveCount = 0;
  await page.route("**/api/attendance", async (route) => {
    if (route.request().method() !== "POST") return route.fallback();
    saveCount++;
    await saveHeld;
    await route.fulfill({ status: 500, json: { error: "서버 오류" } });
  });

  await page.goto("/");
  const card = page.getByRole("button", { name: FIRST_STUDENT });
  await expect(card).toHaveAttribute("aria-pressed", "false");

  await card.click();
  await expect(card).toHaveAttribute("aria-pressed", "true");

  failSave();
  await expect(card).toHaveAttribute("aria-pressed", "false");
  expect(saveCount).toBe(1);
});
