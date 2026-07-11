// 프로젝트 전역 타입 정의

export type Session = '오전' | '오후';
export type MemberType = 'student' | 'teacher';

export interface Student {
  id: string;
  session: Session;
  grade: string;
  class: string;
  name: string;
  phone: string;
  parentPhone: string;
  address: string;
  birthdate: string;
  school: string;
  teacher: string;
  notes: string;
  attendanceRate: string;
  baptism: string;
  gender: string;
}

export interface Teacher {
  id: string;
  session: Session;
  team: string;
  name: string;
  phone: string;
  address: string;
  birthdate: string;
  notes: string;
  /** true면 birthdate가 음력 날짜 — 생일자 조회에서 해당 연도 양력으로 환산해 표시 */
  lunarBirthdate: boolean;
}

export interface AttendanceRecord {
  date: string;
  session: Session;
  grade: string;
  class: string;
  studentId: string;
  name: string;
  status: '출석';
  timestamp: string;
  note: string;
  type: MemberType;
}
