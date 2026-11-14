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
    const enter = page.locator("#members-enter").getByRole("button", { name: "들어가기", exact: true });
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
    const enter = page.locator("#members-enter").getByRole("button", { name: "들어가기", exact: true });
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

test.describe("항목 공유 버튼", () => {
  const shareButtons = (page: Page) => page.getByRole("button", { name: / 링크 공유$/ });
  const statusText = (page: Page) => page.locator("main [role=status]").filter({ hasText: /\S/ });

  test("절 7개·작은 주제 7개에 공유 버튼이 있고, 눌러도 펼침이 바뀌지 않는다", async ({ page }) => {
    // 공유 시트 없는 환경으로 고정 — 복사 경로
    await page.addInitScript(() => Object.defineProperty(Navigator.prototype, "share", { value: undefined, configurable: true }));
    await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto("/guide");
    await expect(shareButtons(page)).toHaveCount(7); // 접힌 상태에서도 절마다 하나

    const history = page.locator("#history").getByRole("button", { name: /출석현황 보기/ }).first();
    await expect(history).toHaveAttribute("aria-expanded", "false");
    await page.getByRole("button", { name: "출석현황 보기 링크 공유" }).click();
    await expect(history).toHaveAttribute("aria-expanded", "false");

    await openMembers(page);
    await expect(shareButtons(page)).toHaveCount(14);
  });

  test("공유 시트가 없으면 세 줄 문구를 복사하고 '링크 복사됨'을 2초 보인다", async ({ page, baseURL }) => {
    await page.addInitScript(() => Object.defineProperty(Navigator.prototype, "share", { value: undefined, configurable: true }));
    await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto("/guide");
    await openMembers(page);

    await page.getByRole("button", { name: "학생 관리 · 지우기 링크 공유" }).click();
    await expect(page.getByText("링크 복사됨", { exact: true }).first()).toBeVisible();
    // Windows 클립보드는 읽을 때 줄바꿈을 CRLF로 돌려준다 — 운영체제 차이라 맞춰서 비교
    const copied = (await page.evaluate(() => navigator.clipboard.readText())).replace(/\r\n/g, "\n");
    expect(copied).toBe(`고등부 출석부 사용 안내 — 학생 관리 · 지우기\n교사 비밀번호가 필요해요\n${baseURL}/guide#members-delete`);
    await expect(page.getByText("링크 복사됨", { exact: true })).toHaveCount(0, { timeout: 4000 });
  });

  test("공유 시트가 있으면 같은 문구로 공유하고, 닫아도 오류 문구가 없다", async ({ page, baseURL }) => {
    // 첫 호출은 공유 성공, 두 번째는 사용자가 닫음(AbortError)
    await page.addInitScript(() => {
      const w = window as unknown as { __shared: unknown[] };
      w.__shared = [];
      Object.defineProperty(Navigator.prototype, "share", {
        configurable: true,
        value: async (data: unknown) => {
          w.__shared.push(data);
          if (w.__shared.length > 1) throw new DOMException("닫음", "AbortError");
        },
      });
    });
    await page.goto("/guide");

    const button = page.getByRole("button", { name: "출석현황 보기 링크 공유" });
    await button.click();
    await button.click();
    const shared = await page.evaluate(() => (window as unknown as { __shared: unknown[] }).__shared);
    expect(shared).toHaveLength(2);
    expect(shared[0]).toEqual({ text: `고등부 출석부 사용 안내 — 출석현황 보기\n교사 비밀번호가 필요해요\n${baseURL}/guide#history` });
    await expect(statusText(page)).toHaveCount(0);
  });

  test("휴대폰 폭에서 머리 줄이 가로로 넘치지 않는다", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto("/guide");
    await openMembers(page);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
});

test.describe("주소창 갱신", () => {
  test("목차·대상 카드로 이동하면 주소가 그 항목으로 바뀌고 기록은 늘지 않는다", async ({ page }) => {
    await page.goto("/guide");
    const before = await page.evaluate(() => history.length);

    await page.getByRole("navigation", { name: "사용 안내 목차" }).getByRole("button", { name: "생일자" }).click();
    await expect(page).toHaveURL(/\/guide#birthday$/);
    await page.getByRole("button", { name: /총무팀용/ }).first().click();
    await expect(page).toHaveURL(/\/guide#members$/);

    expect(await page.evaluate(() => history.length)).toBe(before);
  });

  test("공유 주소로 들어오면 그 절과 작은 주제가 펼쳐진다", async ({ page }) => {
    await page.goto("/guide#members-delete");
    await expect(page.locator("#members").getByRole("button", { name: /학생 관리/ }).first()).toHaveAttribute("aria-expanded", "true");
    await expect(page.locator("#members-delete").getByRole("button", { name: "지우기", exact: true })).toHaveAttribute("aria-expanded", "true");
  });
});

test.describe("리뷰 수정", () => {
  test("캡처를 못 받으면 스켈레톤을 끄고 대체 글자가 보인다", async ({ page }) => {
    await page.route("**/_next/image**", (route) => route.fulfill({ status: 404, body: "" }));
    await page.goto("/guide");
    await openMembers(page);
    await page.locator("#members-enter").getByRole("button", { name: "들어가기", exact: true }).click();
    await expect(page.locator("#members-enter-panel img").first()).toBeAttached();
    await expect(page.locator("#members-enter-panel [data-loading]")).toHaveCount(0);
    await expect(page.locator("#members-enter-panel img").first()).toHaveCSS("opacity", "1");
  });

  test("휴대폰에서 머리가 칩 줄 바로 아래 있어도 '링크 복사됨'이 칩 줄에 가려지지 않는다", async ({ page }) => {
    await page.addInitScript(() => Object.defineProperty(Navigator.prototype, "share", { value: undefined, configurable: true }));
    await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto("/guide");
    // 절이 모두 접혀 있으면 페이지가 짧아 머리를 칩 줄까지 올릴 수 없다 — 아래 절을 펼쳐 길게 만든다
    await openMembers(page);
    await page.locator("#members-register").getByRole("button", { name: "등록하기", exact: true }).click();
    // 손으로 스크롤해 절 머리를 고정 칩 줄 바로 아래에 붙인다(칩으로 이동하면 scroll-mt 여백이 있어 재현되지 않는다)
    await page.evaluate(() => {
      // 목차 nav는 둘(PC 왼쪽 목차는 숨김) — 보이는 칩 줄을 고른다
      const nav = [...document.querySelectorAll("nav[aria-label='사용 안내 목차']")]
        .map((n) => n.getBoundingClientRect())
        .find((r) => r.height > 0)!;
      const top = document.getElementById("history")!.getBoundingClientRect().top;
      window.scrollTo({ top: window.scrollY + top - nav.height, behavior: "instant" });
    });

    await page.getByRole("button", { name: "출석현황 보기 링크 공유" }).click();
    const pill = page.getByText("링크 복사됨", { exact: true }).first();
    await expect(pill).toBeVisible();
    const nav = (await page.getByRole("navigation", { name: "사용 안내 목차" }).boundingBox())!;
    const box = (await pill.boundingBox())!;
    expect(box.y).toBeGreaterThanOrEqual(nav.y + nav.height);
    expect(box.x).toBeGreaterThanOrEqual(0);
  });

  test("머리 버튼으로 펼치면 주소가 그 항목으로 바뀌고, 접으면 그대로다", async ({ page }) => {
    await page.goto("/guide");
    const before = await page.evaluate(() => history.length);
    const head = page.locator("#birthday").getByRole("button", { name: /생일자 보기/ }).first();
    await head.click();
    await expect(page).toHaveURL(/\/guide#birthday$/);
    await openMembers(page);
    await expect(page).toHaveURL(/\/guide#members$/);
    await page.locator("#members-delete").getByRole("button", { name: "지우기", exact: true }).click();
    await expect(page).toHaveURL(/\/guide#members-delete$/);
    await head.click(); // 생일자 접기
    await expect(page).toHaveURL(/\/guide#members-delete$/);
    expect(await page.evaluate(() => history.length)).toBe(before);
  });
});
