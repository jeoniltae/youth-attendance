// E2E 가짜 응답 — 사용 안내 촬영용 더미 명단을 재사용하고 /api/*는 시트에 닿기 전에 가로챈다

import type { Page } from "@playwright/test";
import data from "../../guide/mock/data.json";

export const CLASS_TOKEN = "e2e-dummy-token";

const CLASS_STUDENTS = data.students.slice(0, 3).map((student) => ({
  id: student.id,
  name: student.name,
  written: false,
  present: true,
}));

export const FIRST_STUDENT = CLASS_STUDENTS[0].name;

export async function mockClassNotes(page: Page) {
  await page.route("**/api/notes/class?*", (route) =>
    route.fulfill({
      json: { session: "오전", grade: "1", class: "1", students: CLASS_STUDENTS },
    }),
  );
}
