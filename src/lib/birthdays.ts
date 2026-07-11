// 월별 생일자 명단을 학년/교사/새친구 단위로 묶는 유틸 (정렬: 반→이름 한국어 localeCompare)

import type { Student, Teacher } from "@/types";
import { lunarToSolar } from "@/lib/lunar";

export interface BirthdayPerson {
  id: string;
  name: string;
  meta?: string;
  birthMonth: number;
  birthDay: number;
  /** true면 음력 생일을 지정한 연도의 양력으로 환산한 날짜 — 카드에 "(음력)" 표시용 */
  isLunar?: boolean;
}

export interface BirthdayGroup {
  key: string;
  label: string;
  variant: "grade" | "teacher" | "newFriend";
  people: BirthdayPerson[];
}

const GRADE_ORDER = ["1", "2", "3"];

function birthMonthOf(birthdate: string): number {
  return Number(birthdate.split("-")[1]);
}

function birthDayOf(birthdate: string): number {
  return Number(birthdate.split("-")[2]);
}

// 음력 생일 교사는 지정한 연도의 양력으로 환산 — 변환 실패(지원 범위 밖 등) 시 원본 월/일로 폴백
function teacherEffectiveDate(
  teacher: Teacher,
  year: number,
): { month: number; day: number; isLunar: boolean } {
  const rawMonth = birthMonthOf(teacher.birthdate);
  const rawDay = birthDayOf(teacher.birthdate);
  if (!teacher.lunarBirthdate) return { month: rawMonth, day: rawDay, isLunar: false };

  const solar = lunarToSolar(year, rawMonth, rawDay);
  if (!solar) return { month: rawMonth, day: rawDay, isLunar: false };
  return { month: solar.month, day: solar.day, isLunar: true };
}

export function groupBirthdaysByMonth(
  students: Student[],
  teachers: Teacher[],
  month: number,
  year: number,
): BirthdayGroup[] {
  const groups: BirthdayGroup[] = [];

  for (const grade of GRADE_ORDER) {
    const people = students
      .filter((s) => s.grade === grade && birthMonthOf(s.birthdate) === month)
      .sort(
        (a, b) =>
          a.class.localeCompare(b.class, "ko", { numeric: true }) ||
          a.name.localeCompare(b.name, "ko"),
      )
      .map((s) => ({
        id: s.id,
        name: s.name,
        meta: `${s.class}반`,
        birthMonth: birthMonthOf(s.birthdate),
        birthDay: birthDayOf(s.birthdate),
      }));

    if (people.length > 0) {
      groups.push({ key: `grade-${grade}`, label: `${grade}학년`, variant: "grade", people });
    }
  }

  const teacherPeople = teachers
    .map((t) => ({ teacher: t, effective: teacherEffectiveDate(t, year) }))
    .filter(({ effective }) => effective.month === month)
    .sort((a, b) => a.teacher.name.localeCompare(b.teacher.name, "ko"))
    .map(({ teacher: t, effective }) => ({
      id: t.id,
      name: t.name,
      birthMonth: effective.month,
      birthDay: effective.day,
      isLunar: effective.isLunar,
    }));

  if (teacherPeople.length > 0) {
    groups.push({ key: "teachers", label: "선생님", variant: "teacher", people: teacherPeople });
  }

  const newFriendPeople = students
    .filter((s) => s.grade === "새친구" && birthMonthOf(s.birthdate) === month)
    .sort((a, b) => a.name.localeCompare(b.name, "ko"))
    .map((s) => ({
      id: s.id,
      name: s.name,
      birthMonth: birthMonthOf(s.birthdate),
      birthDay: birthDayOf(s.birthdate),
    }));

  if (newFriendPeople.length > 0) {
    groups.push({ key: "new-friend", label: "새친구", variant: "newFriend", people: newFriendPeople });
  }

  return groups;
}
