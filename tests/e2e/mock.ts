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

// 게이트 검사용 — 메인(/)과 시상 화면이 쓰는 API를 같은 더미 학생으로 채운다
export async function mockGateApis(page: Page) {
  const students = data.students.slice(0, 3).map((student) => ({
    ...data.defaults.student,
    ...student,
    session: "오전",
  }));

  await page.route("**/api/roster?*", (route) =>
    route.fulfill({ json: { students, teachers: [] } }),
  );
  await page.route("**/api/attendance?*", (route) => route.fulfill({ json: { studentIds: [] } }));
  await page.route("**/api/notes/summary?*", (route) =>
    route.fulfill({
      json: {
        sundays: 17,
        students: students.map((s) => ({
          id: s.id,
          session: s.session,
          grade: s.grade,
          class: s.class,
          name: s.name,
          phone: s.phone,
          count: 12,
        })),
      },
    }),
  );
}

export async function mockClassNotes(page: Page) {
  await page.route("**/api/notes/class?*", (route) =>
    route.fulfill({
      json: { session: "오전", grade: "1", class: "1", students: CLASS_STUDENTS },
    }),
  );
}
