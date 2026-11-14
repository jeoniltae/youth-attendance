// 사용 안내(/guide) E2E — 캡처 스켈레톤, 링크 미리보기 메타, 항목 공유 버튼, 주소 갱신
// /guide는 데이터 API를 부르지 않아 교사용 토큰만 넣으면 본문이 그려진다

import { expect, test, type Page } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem("session_token", "e2e"));
});

/** 학생 관리 절을 펼친다 — 첫 작은 주제(들어가기)는 머리 버튼으로 펼칠 때는 열리지 않는다 */
async function openMembers(page: Page) {
  await page.locator("#members").getByRole("button", { name: /학생 관리/ }).first().click();
}

test.describe("캡처 스켈레톤", () => {
  test("캡처를 받는 동안 스켈레톤이 보이고, 받으면 사라지며 높이가 같다", async ({ page }) => {
    // 캡처 응답을 붙잡아 둔다 — 풀어 줄 때까지 스켈레톤 상태
    let release!: () => void;
    const held = new Promise<void>((r) => (release = r));
    await page.route("**/_next/image**", async (route) => {
      await held;
      await route.continue();
    });

    await page.goto("/guide");
    await openMembers(page);
    const enter = page.locator("#members-enter").getByRole("button", { name: "들어가기" });
    await enter.click();

    const box = page.locator("#members-enter-panel [data-loading]").first();
    await expect(box).toBeVisible();
    const step = page.locator("#members-enter-panel li").first();
    const before = (await step.boundingBox())!.height;

    release();
    await expect(page.locator("#members-enter-panel [data-loading]")).toHaveCount(0);
    await expect(page.locator("#members-enter-panel img").first()).toHaveCSS("opacity", "1");
    const after = (await step.boundingBox())!.height;
    expect(Math.abs(after - before)).toBeLessThan(1);
  });

  test("접었다 다시 펼친(캐시된) 캡처에는 스켈레톤이 남지 않는다", async ({ page }) => {
    await page.goto("/guide");
    await openMembers(page);
    const enter = page.locator("#members-enter").getByRole("button", { name: "들어가기" });
    await enter.click();
    await expect(page.locator("#members-enter-panel [data-loading]")).toHaveCount(0);

    await enter.click();
    await enter.click();
    await expect(page.locator("#members-enter-panel img").first()).toBeVisible();
    await expect(page.locator("#members-enter-panel [data-loading]")).toHaveCount(0);
  });
});

test.describe("링크 미리보기", () => {
  const og = (html: string, prop: string) =>
    html.match(new RegExp(`<meta property="${prop}" content="([^"]*)"`))?.[1] ?? null;

  test("/guide는 사용 안내 미리보기, 다른 화면은 기존 미리보기", async ({ request }) => {
    const guide = await (await request.get("/guide")).text();
    expect(og(guide, "og:title")).toBe("고등부 출석부 사용 안내");
    expect(og(guide, "og:description")).toBe("출석 체크부터 학생 관리까지 휴대폰 화면으로 안내해요");
    expect(og(guide, "og:url")).toMatch(/\/guide$/);
    expect(og(guide, "og:image")).toMatch(/\/og-img\.png$/);

    const home = await (await request.get("/")).text();
    expect(og(home, "og:title")).toBe("서울광염교회 고등부 출석체크");
  });
});
