// 말씀노트 체크 화면 E2E — 저장 실패 롤백, 잘못된 토큰·날짜 안내, 날짜 칩 가운데 정렬

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

test("칩 줄 오른쪽 끝에 걸친 날짜를 누르면 그 칩이 가운데로 온다", async ({ page }) => {
  // 새 기수 유예 기간이라 칩이 20개(2기 + 3기) — 휴대폰 폭에서 칩 줄이 가로로 넘친다
  await page.clock.install({ time: new Date("2026-09-15T12:00:00+09:00") });
  await page.setViewportSize({ width: 375, height: 812 });
  await mockClassNotes(page);
  await page.goto(`/notes/c/${CLASS_TOKEN}`);
  await expect(page.getByRole("button", { name: FIRST_STUDENT })).toBeVisible();

  const row = page.locator("main .overflow-x-auto");
  // 처음 열 때는 움직이지 않는다
  expect(await row.evaluate((el) => el.scrollLeft)).toBe(0);

  // 오른쪽 끝에 반쯤 걸친 칩
  const index = await row.evaluate((el) => {
    const right = el.getBoundingClientRect().right;
    return [...el.querySelectorAll("button")].findIndex((b) => {
      const r = b.getBoundingClientRect();
      return r.left < right && r.right > right;
    });
  });
  expect(index).toBeGreaterThan(0);
  const chip = row.locator("button").nth(index);
  await chip.click();
  await expect(chip).toHaveAttribute("aria-pressed", "true");

  const offset = () =>
    chip.evaluate((b) => {
      const r = b.getBoundingClientRect();
      const box = b.parentElement!.getBoundingClientRect();
      return Math.abs(r.left + r.width / 2 - (box.left + box.width / 2));
    });
  await expect.poll(offset).toBeLessThan(2);
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
});
