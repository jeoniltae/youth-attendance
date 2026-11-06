// 말씀노트 체크 화면 E2E — 저장 실패 롤백과 잘못된 토큰 안내

import { expect, test } from "@playwright/test";
import { CLASS_TOKEN, FIRST_STUDENT, mockClassNotes } from "./mock";

test("저장에 실패하면 카드가 체크 전 상태로 돌아간다", async ({ page }) => {
  await mockClassNotes(page);

  let failSave = () => {};
  const saveHeld = new Promise<void>((resolve) => {
    failSave = resolve;
  });
  await page.route("**/api/notes/class", async (route) => {
    await saveHeld;
    await route.fulfill({ status: 500, json: { error: "서버 오류" } });
  });

  await page.goto(`/notes/c/${CLASS_TOKEN}`);
  const card = page.getByRole("button", { name: FIRST_STUDENT });
  await card.click();
  await expect(card).toHaveAttribute("aria-pressed", "true");

  failSave();
  await expect(card).toHaveAttribute("aria-pressed", "false");
});

test("잘못된 토큰이면 명단 없이 안내만 보여 준다", async ({ page }) => {
  await page.route("**/api/notes/class?*", (route) =>
    route.fulfill({ status: 404, json: { error: "잘못된 주소입니다" } }),
  );

  await page.goto("/notes/c/wrong-token");

  await expect(page.getByRole("heading", { name: "잘못된 주소예요" })).toBeVisible();
  await expect(page.getByRole("button", { name: /학년|\(일\)/ })).toHaveCount(0);
});
