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

test("칩 줄 오른쪽 끝의 날짜를 누르면 그 칩이 가운데로 오고 페이지는 제자리", async ({ page }) => {
  // 새 기수 유예 기간이라 칩이 20개(2기 + 3기) — 휴대폰 폭에서 칩 줄이 가로로 넘친다
  await page.clock.install({ time: new Date("2026-09-15T12:00:00+09:00") });
  await page.setViewportSize({ width: 375, height: 812 });
  // 페이지가 세로로 스크롤될 만큼 긴 반 (더미 이름)
  await page.route("**/api/notes/class?*", (route) =>
    route.fulfill({
      json: {
        session: "오전",
        grade: "1",
        class: "1",
        students: Array.from({ length: 16 }, (_, i) => ({ id: `d${i}`, name: `홍길동${i + 1}`, written: false, present: true })),
      },
    }),
  );
  await page.goto(`/notes/c/${CLASS_TOKEN}`);
  await expect(page.getByRole("button", { name: "홍길동1", exact: true })).toBeVisible();

  const row = page.locator("main .overflow-x-auto");
  // 처음 열 때 칩 줄은 맨 앞 — 단, 처음 선택된 칩이 맨 앞 칩이라 이 단언만으로는 첫 렌더 방어 코드를 검증하지 못한다
  expect(await row.evaluate((el) => el.scrollLeft)).toBe(0);

  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  const pageY = await page.evaluate(() => window.scrollY);
  expect(pageY).toBeGreaterThan(0);

  // 칩 줄 오른쪽 끝을 넘어선 첫 칩 (끝이 칩 사이 틈에 걸려도 찾도록 오른쪽 끝만 본다)
  const index = await row.evaluate((el) => {
    const right = el.getBoundingClientRect().right;
    return [...el.querySelectorAll("button")].findIndex((b) => b.getBoundingClientRect().right > right);
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
  await expect(page.getByRole("button", { name: "홍길동1", exact: true })).toBeVisible();
  expect(await page.evaluate(() => window.scrollY)).toBe(pageY);
});
