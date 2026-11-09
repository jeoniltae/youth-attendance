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
  await expect(page.getByText(`${FIRST_STUDENT} 저장하지 못했어요`)).toBeVisible();
});

test("잘못된 토큰이면 명단 없이 안내만 보여 준다", async ({ page }) => {
  await page.route("**/api/notes/class?*", (route) =>
    route.fulfill({ status: 404, json: { error: "잘못된 주소입니다" } }),
  );

  await page.goto("/notes/c/wrong-token");

  await expect(page.getByRole("heading", { name: "잘못된 주소예요" })).toBeVisible();
  await expect(page.getByRole("button", { name: /학년|\(일\)/ })).toHaveCount(0);
});

test("다른 날짜 조회가 실패해도 반 제목과 날짜 칩은 남는다", async ({ page }) => {
  await mockClassNotes(page);
  await page.goto(`/notes/c/${CLASS_TOKEN}`);
  await expect(page.getByRole("button", { name: FIRST_STUDENT })).toBeVisible();

  await page.route("**/api/notes/class?*", (route) =>
    route.fulfill({ status: 500, json: { error: "서버 오류" } }),
  );
  await page.locator("main .overflow-x-auto button").nth(1).click();

  // React Query 기본 재시도(3회)가 끝나야 오류 상태가 된다
  await expect(page.getByText("명단을 불러오지 못했습니다")).toBeVisible({ timeout: 15000 });
  await expect(page.getByRole("heading", { name: "오전 · 1학년 1반" })).toBeVisible();
  await expect(page.locator("main .overflow-x-auto button").nth(1)).toHaveAttribute("aria-pressed", "true");
});

test("서버가 날짜를 거절하면 다시 고르라고 안내한다", async ({ page }) => {
  await page.route("**/api/notes/class?*", (route) =>
    route.fulfill({ status: 400, json: { error: "날짜가 올바르지 않습니다" } }),
  );
  await page.goto(`/notes/c/${CLASS_TOKEN}`);

  // 재시도하지 않으므로 바로 안내가 나온다
  await expect(page.getByText("고를 수 없는 날짜예요")).toBeVisible();
});
