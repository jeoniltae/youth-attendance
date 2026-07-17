// 학생/교사 목록을 학년·반 또는 교사팀 단위로 묶는 유틸 (정렬: 학년→반→이름, 한국어 localeCompare)

import type { Student, Teacher } from "@/types";

export interface MemberItem {
  id: string;
  name: string;
  secondary?: string;
}

export interface SubGroup {
  key: string;
  label: string;
  members: MemberItem[];
}

export interface TopGroup {
  key: string;
  label: string;
  variant: "grade" | "teacher" | "newFamily" | "incomplete";
  subGroups?: SubGroup[];
  members?: MemberItem[];
}

const GRADE_ORDER = ["1", "2", "3"];
export const TEAM_ORDER = [
  "총무팀",
  "예배지원팀",
  "1학년교사",
  "2학년교사",
  "3학년교사",
  "새친구반",
];

// 레거시 GAS(getStudents/getTeacherMembers)와 동일한 필수 필드 기준.
// 다만 레거시는 이 조건에 걸리면 명단에서 통째로 숨겼던 반면, 새 앱은 숨기지 않고
// "확인 필요" 그룹으로 모아 보여준다 — 조용히 사라지면 그 사람 출석 자체가
// 누락될 수 있어, 데이터를 고쳐야 함을 눈에 띄게 드러내는 쪽을 택함.
// 새친구는 반 개념이 없는 게 정상이라 반 누락 판정에서 제외한다.
function missingStudentFields(s: Student): string[] {
  const missing: string[] = [];
  if (!s.id) missing.push("ID 없음");
  if (!s.name) missing.push("이름 없음");
  if (!s.grade) missing.push("학년 없음");
  if (s.grade && s.grade !== "새친구" && !s.class) missing.push("반 없음");
  return missing;
}

function missingTeacherFields(t: Teacher): string[] {
  const missing: string[] = [];
  if (!t.id) missing.push("ID 없음");
  if (!t.name) missing.push("이름 없음");
  if (!t.team) missing.push("팀 없음");
  return missing;
}

export function groupStudentsAndTeachers(
  students: Student[],
  teachers: Teacher[],
): TopGroup[] {
  const groups: TopGroup[] = [];

  const incompleteMembers: (MemberItem & { _sortKey: string })[] = [];

  const completeStudents = students.filter((s) => {
    const missing = missingStudentFields(s);
    if (missing.length === 0) return true;
    incompleteMembers.push({
      // 실제 ID가 없으면 화면 표시(React key)만을 위한 임시 키 — 이 상태로는
      // 출석 토글의 대상 식별이 불가능하므로 시트에서 ID를 채우는 게 우선이다
      id: s.id || `missing-student-${incompleteMembers.length}`,
      name: s.name || "(이름 없음)",
      secondary: missing.join(" · "),
      _sortKey: s.name || "",
    });
    return false;
  });

  const completeTeachers = teachers.filter((t) => {
    const missing = missingTeacherFields(t);
    if (missing.length === 0) return true;
    incompleteMembers.push({
      id: t.id || `missing-teacher-${incompleteMembers.length}`,
      name: t.name || "(이름 없음)",
      secondary: missing.join(" · "),
      _sortKey: t.name || "",
    });
    return false;
  });

  for (const grade of GRADE_ORDER) {
    const gradeStudents = completeStudents.filter((s) => s.grade === grade);
    if (gradeStudents.length === 0) continue;

    // numeric: true — 반 번호가 문자열이라 "10"이 "1"과 "2" 사이로 정렬되는 것 방지 (1,2,…,9,10 순)
    const classKeys = Array.from(
      new Set(gradeStudents.map((s) => s.class)),
    ).sort((a, b) => a.localeCompare(b, "ko", { numeric: true }));

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
          .map((s) => ({ id: s.id, name: s.name, secondary: s.teacher || undefined })),
      })),
    });
  }

  if (completeTeachers.length > 0) {
    groups.push({
      key: "teachers",
      label: "선생님",
      variant: "teacher",
      subGroups: TEAM_ORDER.filter((team) =>
        completeTeachers.some((t) => t.team === team),
      ).map((team) => ({
        key: `team-${team}`,
        label: team,
        members: completeTeachers
          .filter((t) => t.team === team)
          .sort((a, b) => a.name.localeCompare(b.name, "ko"))
          .map((t) => ({ id: t.id, name: t.name })),
      })),
    });
  }

  const newFamily = completeStudents.filter((s) => s.grade === "새친구");
  if (newFamily.length > 0) {
    groups.push({
      key: "new-family",
      label: "새친구",
      variant: "newFamily",
      members: newFamily
        .sort((a, b) => a.name.localeCompare(b.name, "ko"))
        .map((s) => ({ id: s.id, name: s.name, secondary: s.teacher || undefined })),
    });
  }

  // 학년/교사 구분 없이 데이터가 불완전한 인원을 한데 모아 마지막에 노출
  if (incompleteMembers.length > 0) {
    groups.push({
      key: "incomplete",
      label: "확인 필요",
      variant: "incomplete",
      members: incompleteMembers
        .sort((a, b) => a._sortKey.localeCompare(b._sortKey, "ko"))
        .map(({ _sortKey: _, ...m }) => m),
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
