// UI 개발용 더미 학생/교사 데이터 (실제 개인정보 아님)

import type { Session, Student, Teacher } from "@/types";

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

const NEW_FRIEND_NAMES: Record<Session, string[]> = {
  오전: ["김새봄", "이초록", "박여름", "최가을"],
  오후: ["서겨울", "한들꽃"],
};

const CLASS_SIZES_BY_SESSION: Record<Session, Record<string, number[]>> = {
  오전: { "1": [5, 4, 3], "2": [4, 3], "3": [4] },
  오후: { "1": [4, 3], "2": [3, 3], "3": [3] },
};

const TEAM_SIZES_BY_SESSION: Record<Session, Record<string, number>> = {
  오전: { 총무팀: 2, 예배지원팀: 2, "1학년교사": 3, "2학년교사": 2, "3학년교사": 2 },
  오후: { 총무팀: 1, 예배지원팀: 2, "1학년교사": 2, "2학년교사": 2, "3학년교사": 1 },
};

function buildStudentsForSession(session: Session, nameOffset: number): Student[] {
  const students: Student[] = [];
  let nameIdx = nameOffset;

  for (const [grade, classSizes] of Object.entries(CLASS_SIZES_BY_SESSION[session])) {
    classSizes.forEach((size, classIdx) => {
      const cls = String(classIdx + 1);
      for (let i = 0; i < size; i++) {
        const seq = String(i + 1).padStart(3, "0");
        students.push({
          id: `2025-${grade}-${cls}-${seq}`,
          session,
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

  NEW_FRIEND_NAMES[session].forEach((name, i) => {
    students.push({
      id: `2025-새친구-0-${String(i + 1).padStart(3, "0")}`,
      session,
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

function buildTeachersForSession(session: Session, nameOffset: number): Teacher[] {
  const teachers: Teacher[] = [];
  let nameIdx = nameOffset;

  Object.entries(TEAM_SIZES_BY_SESSION[session]).forEach(([team, size], teamIdx) => {
    for (let i = 0; i < size; i++) {
      teachers.push({
        id: `T-${session}-${teamIdx}-${i + 1}`,
        session,
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

export const mockStudents: Student[] = [
  ...buildStudentsForSession("오전", 0),
  ...buildStudentsForSession("오후", 8),
];

export const mockTeachers: Teacher[] = [
  ...buildTeachersForSession("오전", 0),
  ...buildTeachersForSession("오후", 5),
];
