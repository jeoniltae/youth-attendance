// 월별 생일자 명단을 학년/교사/새친구 단위로 묶는 유틸 (정렬: 반→이름 한국어 localeCompare)

import type { Student, Teacher } from "@/types";

export interface BirthdayPerson {
  id: string;
  name: string;
  meta?: string;
  birthMonth: number;
  birthDay: number;
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

export function groupBirthdaysByMonth(
  students: Student[],
  teachers: Teacher[],
  month: number,
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
    .filter((t) => birthMonthOf(t.birthdate) === month)
    .sort((a, b) => a.name.localeCompare(b.name, "ko"))
    .map((t) => ({
      id: t.id,
      name: t.name,
      birthMonth: birthMonthOf(t.birthdate),
      birthDay: birthDayOf(t.birthdate),
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
