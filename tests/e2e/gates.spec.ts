// 게이트 렌더 차단 E2E — 캐시 누수는 다른 화면을 거쳐 이동할 때만 드러나므로 클라이언트 이동으로 들어간다

import { expect, test, type Page } from "@playwright/test";
import { FIRST_STUDENT, mockGateApis } from "./mock";

async function goClientSide(page: Page, path: string) {
  await page.evaluate((target) => {
    (window as unknown as { next: { router: { push(href: string): void } } }).next.router.push(target);
  }, path);
  await expect(page).toHaveURL(path);
}

async function expectGateOnly(page: Page) {
  await expect(page.getByRole("button", { name: "입장" })).toBeVisible();
  await expect(page.getByText(FIRST_STUDENT)).toHaveCount(0);
}

test.beforeEach(async ({ page }) => {
  await mockGateApis(page);
  await page.addInitScript(() => sessionStorage.setItem("session_token", "e2e"));
});

for (const path of ["/registry", "/teachers"]) {
  test(`메인에서 명단을 받은 뒤 ${path}로 가도 게이트 뒤에 명단이 없다`, async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("button", { name: FIRST_STUDENT })).toBeVisible();

    await goClientSide(page, path);
    await expectGateOnly(page);
  });
}

test("시상 명단을 본 뒤 인증이 풀리면 다시 들어와도 게이트 뒤에 명단이 없다", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: FIRST_STUDENT })).toBeVisible();
  await page.evaluate(() => sessionStorage.setItem("admin_token", "e2e"));
  await goClientSide(page, "/notes/summary");
  await expect(page.getByText(FIRST_STUDENT)).toBeVisible();

  await goClientSide(page, "/");
  await page.evaluate(() => sessionStorage.removeItem("admin_token"));
  await goClientSide(page, "/notes/summary");
  await expectGateOnly(page);
});
