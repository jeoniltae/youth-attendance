// UI 개발용 더미 학생/교사 데이터 (실제 개인정보 아님)

import type { Student, Teacher } from "@/types";

const STUDENT_NAME_POOL = [
  "홍길동",
  "김철수",
  "이영희",
  "박민수",
  "정수진",
  "최동현",
  "강지훈",
  "조은별",
  "윤서연",
  "임도윤",
  "한소희",
  "오준혁",
  "신유나",
  "권태양",
  "문하늘",
  "배수현",
];

const NEW_FAMILY_NAMES = ["김새봄", "이초록", "박여름", "최가을"];

const TEACHER_NAME_POOL = [
  "안성민",
  "유하경",
  "장도윤",
  "서지안",
  "황민재",
  "구은서",
  "백승우",
  "남궁다은",
  "노현우",
  "곽서윤",
];

function buildStudents(): Student[] {
  const classSizesByGrade: Record<string, number[]> = {
    "1": [5, 4, 3],
    "2": [4, 3],
    "3": [4],
  };
  const students: Student[] = [];
  let nameIdx = 0;

  for (const [grade, classSizes] of Object.entries(classSizesByGrade)) {
    classSizes.forEach((size, classIdx) => {
      const cls = String(classIdx + 1);
      for (let i = 0; i < size; i++) {
        const seq = String(i + 1).padStart(3, "0");
        students.push({
          id: `2025-${grade}-${cls}-${seq}`,
          session: "오전",
          grade,
          class: cls,
          name: STUDENT_NAME_POOL[nameIdx % STUDENT_NAME_POOL.length],
          phone: "010-0000-0000",
          parentPhone: "010-0000-0000",
          address: "",
          birthdate: "",
          school: "",
          teacher: "",
          notes: "",
        });
        nameIdx++;
      }
    });
  }

  NEW_FAMILY_NAMES.forEach((name, i) => {
    students.push({
      id: `2025-새친구-0-${String(i + 1).padStart(3, "0")}`,
      session: "오전",
      grade: "새친구",
      class: "",
      name,
      phone: "010-0000-0000",
      parentPhone: "010-0000-0000",
      address: "",
      birthdate: "",
      school: "",
      teacher: "",
      notes: "",
    });
  });

  return students;
}

function buildTeachers(): Teacher[] {
  const teamSizes: Record<string, number> = {
    총무팀: 2,
    예배지원팀: 2,
    "1학년교사": 3,
    "2학년교사": 2,
    "3학년교사": 2,
  };
  const teachers: Teacher[] = [];
  let nameIdx = 0;

  Object.entries(teamSizes).forEach(([team, size], teamIdx) => {
    for (let i = 0; i < size; i++) {
      teachers.push({
        id: `T-${teamIdx}-${i + 1}`,
        session: "오전",
        team,
        name: TEACHER_NAME_POOL[nameIdx % TEACHER_NAME_POOL.length],
        phone: "010-0000-0000",
        address: "",
        birthdate: "",
        notes: "",
      });
      nameIdx++;
    }
  });

  return teachers;
}

export const mockStudents: Student[] = buildStudents();
export const mockTeachers: Teacher[] = buildTeachers();
