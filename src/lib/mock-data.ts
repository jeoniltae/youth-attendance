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

// id 해시 기반으로 매번 동일한 결과를 만들어내는 더미 출생연월일 (실제 생일 아님)
function hashToUnitInterval(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return (hash % 1000) / 1000;
}

function birthdateFromId(id: string, ageMin: number, ageMax: number): string {
  const month = Math.floor(hashToUnitInterval(`${id}-m`) * 12) + 1;
  const day = Math.floor(hashToUnitInterval(`${id}-d`) * 28) + 1;
  const age = ageMin + Math.floor(hashToUnitInterval(`${id}-y`) * (ageMax - ageMin + 1));
  const year = new Date().getFullYear() - age;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

const BAPTISM_OPTIONS = ["세례", "유아세례", "미세례"];

// id 해시 기반 더미 출석률/세례/성별 (실제 운영 시트의 Notes 뒤 3개 컬럼에 대응)
function studentExtrasFromId(id: string): { attendanceRate: string; baptism: string; gender: string } {
  const attendanceRate = `${Math.floor(hashToUnitInterval(`${id}-rate`) * 100)}%`;
  const baptism = BAPTISM_OPTIONS[Math.floor(hashToUnitInterval(`${id}-baptism`) * BAPTISM_OPTIONS.length)];
  const gender = hashToUnitInterval(`${id}-gender`) < 0.5 ? "남" : "여";
  return { attendanceRate, baptism, gender };
}

function buildStudentsForSession(session: Session, nameOffset: number): Student[] {
  const students: Student[] = [];
  let nameIdx = nameOffset;

  for (const [grade, classSizes] of Object.entries(CLASS_SIZES_BY_SESSION[session])) {
    classSizes.forEach((size, classIdx) => {
      const cls = String(classIdx + 1);
      for (let i = 0; i < size; i++) {
        const seq = String(i + 1).padStart(3, "0");
        const id = `2025-${grade}-${cls}-${seq}`;
        students.push({
          id,
          session,
          grade,
          class: cls,
          name: STUDENT_NAME_POOL[nameIdx % STUDENT_NAME_POOL.length],
          phone: "010-0000-0000",
          parentPhone: "010-0000-0000",
          address: "",
          birthdate: birthdateFromId(id, 16, 18),
          school: "",
          teacher: "",
          notes: "",
          ...studentExtrasFromId(id),
        });
        nameIdx++;
      }
    });
  }

  NEW_FRIEND_NAMES[session].forEach((name, i) => {
    const id = `2025-새친구-0-${String(i + 1).padStart(3, "0")}`;
    students.push({
      id,
      session,
      grade: "새친구",
      class: "",
      name,
      phone: "010-0000-0000",
      parentPhone: "010-0000-0000",
      address: "",
      birthdate: birthdateFromId(id, 16, 19),
      school: "",
      teacher: "",
      notes: "",
      ...studentExtrasFromId(id),
    });
  });

  return students;
}

function buildTeachersForSession(session: Session, nameOffset: number): Teacher[] {
  const teachers: Teacher[] = [];
  let nameIdx = nameOffset;

  Object.entries(TEAM_SIZES_BY_SESSION[session]).forEach(([team, size], teamIdx) => {
    for (let i = 0; i < size; i++) {
      const id = `T-${session}-${teamIdx}-${i + 1}`;
      teachers.push({
        id,
        session,
        team,
        name: TEACHER_NAME_POOL[nameIdx % TEACHER_NAME_POOL.length],
        phone: "010-0000-0000",
        address: "",
        birthdate: birthdateFromId(id, 25, 45),
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

// 출석현황(/history) 데모용 — id 해시 기반으로 매번 동일한 출석 결과를 만들어내는 가짜 출석부
export function getMockAttendedIds(session: Session, dateSeed = ""): Set<string> {
  const attended = new Set<string>();

  for (const student of mockStudents) {
    if (student.session === session && hashToUnitInterval(student.id + dateSeed) < 0.72) {
      attended.add(student.id);
    }
  }
  for (const teacher of mockTeachers) {
    if (teacher.session === session && hashToUnitInterval(teacher.id + dateSeed) < 0.9) {
      attended.add(teacher.id);
    }
  }

  return attended;
}
