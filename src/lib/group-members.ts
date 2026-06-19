// 학생/교사 목록을 학년·반 또는 교사팀 단위로 묶는 유틸 (정렬: 학년→반→이름, 한국어 localeCompare)

import type { Student, Teacher } from "@/types";

export interface MemberItem {
  id: string;
  name: string;
}

export interface SubGroup {
  key: string;
  label: string;
  members: MemberItem[];
}

export interface TopGroup {
  key: string;
  label: string;
  variant: "grade" | "teacher" | "newFamily";
  subGroups?: SubGroup[];
  members?: MemberItem[];
}

const GRADE_ORDER = ["1", "2", "3"];
const TEAM_ORDER = [
  "총무팀",
  "예배지원팀",
  "1학년교사",
  "2학년교사",
  "3학년교사",
];

export function groupStudentsAndTeachers(
  students: Student[],
  teachers: Teacher[],
): TopGroup[] {
  const groups: TopGroup[] = [];

  for (const grade of GRADE_ORDER) {
    const gradeStudents = students.filter((s) => s.grade === grade);
    if (gradeStudents.length === 0) continue;

    const classKeys = Array.from(
      new Set(gradeStudents.map((s) => s.class)),
    ).sort((a, b) => a.localeCompare(b, "ko"));

    groups.push({
      key: `grade-${grade}`,
      label: `${grade}학년`,
      variant: "grade",
      subGroups: classKeys.map((cls) => ({
        key: `grade-${grade}-class-${cls}`,
        label: `${grade}-${cls}반`,
        members: gradeStudents
          .filter((s) => s.class === cls)
          .sort((a, b) => a.name.localeCompare(b.name, "ko"))
          .map((s) => ({ id: s.id, name: s.name })),
      })),
    });
  }

  if (teachers.length > 0) {
    groups.push({
      key: "teachers",
      label: "선생님",
      variant: "teacher",
      subGroups: TEAM_ORDER.filter((team) =>
        teachers.some((t) => t.team === team),
      ).map((team) => ({
        key: `team-${team}`,
        label: team,
        members: teachers
          .filter((t) => t.team === team)
          .sort((a, b) => a.name.localeCompare(b.name, "ko"))
          .map((t) => ({ id: t.id, name: t.name })),
      })),
    });
  }

  const newFamily = students.filter((s) => s.grade === "새친구");
  if (newFamily.length > 0) {
    groups.push({
      key: "new-family",
      label: "새친구",
      variant: "newFamily",
      members: newFamily
        .sort((a, b) => a.name.localeCompare(b.name, "ko"))
        .map((s) => ({ id: s.id, name: s.name })),
    });
  }

  return groups;
}

export function allMembers(group: TopGroup): MemberItem[] {
  return group.members ?? group.subGroups?.flatMap((sg) => sg.members) ?? [];
}

export function countMembers(group: TopGroup): number {
  return allMembers(group).length;
}
