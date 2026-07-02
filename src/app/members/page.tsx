"use client";
// 교적 관리 메인 페이지 — 관리자 전용, 학생/교사 정보 추가·수정·삭제 (목업 데이터 기반, 로컬 상태만 변경)

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, UserPlus } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { FilterChips, type FilterState } from "@/components/attendance/FilterChips";
import { StudentForm, type StudentDraft } from "@/components/students/StudentForm";
import { TeacherForm, type TeacherDraft } from "@/components/teachers/TeacherForm";
import { mockStudents, mockTeachers } from "@/lib/mock-data";
import {
  groupStudentsAndTeachers,
  countMembers,
  TEAM_ORDER,
  type TopGroup,
} from "@/lib/group-members";
import type { Session, Student, Teacher } from "@/types";

function applyFilter(groups: TopGroup[], filter: FilterState): TopGroup[] {
  if (filter.level === "all") return groups;
  if (filter.level === "top") {
    return groups.filter((g) => g.key === filter.key);
  }
  return groups
    .filter((g) => g.key === filter.topKey)
    .map((g) => ({
      ...g,
      subGroups: g.subGroups?.filter((sg) => sg.key === filter.subKey),
    }));
}

// 레거시 GAS generateStudentId 규칙(연도-학년-반-순번 3자리, 그룹 내 최대 순번 + 1)과 동일
function nextStudentId(students: Student[], grade: string, klass: string): string {
  const year = new Date().getFullYear();
  const classKey = grade === "새친구" ? "0" : klass;
  const prefix = `${year}-${grade}-${classKey}-`;
  const maxSeq = students.reduce((max, s) => {
    if (!s.id.startsWith(prefix)) return max;
    const seq = Number(s.id.slice(prefix.length));
    return Number.isFinite(seq) && seq > max ? seq : max;
  }, 0);
  return `${prefix}${String(maxSeq + 1).padStart(3, "0")}`;
}

// mock-data.ts의 기존 교사 ID 컨벤션(T-세션-팀순번-순번)을 그대로 따름
function nextTeacherId(teachers: Teacher[], session: Session, team: string): string {
  const teamIdx = Math.max(TEAM_ORDER.indexOf(team), 0);
  const sameGroup = teachers.filter((t) => t.session === session && t.team === team);
  return `T-${session}-${teamIdx}-${sameGroup.length + 1}`;
}

const HEADER_COLOR: Record<TopGroup["variant"], string> = {
  grade: "text-ink",
  teacher: "text-teal",
  newFamily: "text-gold",
};

const CARD_VARIANT: Record<TopGroup["variant"], "default" | "teacher" | "newFamily"> = {
  grade: "default",
  teacher: "teacher",
  newFamily: "newFamily",
};

const CARD_STYLE: Record<"default" | "teacher" | "newFamily", string> = {
  default: "border-ink/20 text-ink hover:border-ink/45 hover:bg-paper-deep",
  teacher: "border-teal/40 text-teal hover:border-teal/70 hover:bg-teal/5",
  newFamily: "border-gold/40 text-gold hover:border-gold/70 hover:bg-gold/5",
};

function RosterCard({
  name,
  secondary,
  variant,
  onClick,
}: {
  name: string;
  secondary?: string;
  variant: "default" | "teacher" | "newFamily";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`ticket-notch flex min-h-11 flex-col items-start justify-center gap-0 rounded-lg border-[1.5px] bg-paper px-4 py-2 text-left transition-all hover:-translate-y-0.5 ${CARD_STYLE[variant]}`}
    >
      <span className="text-sm font-medium">{name}</span>
      {secondary && <span className="text-[0.7rem] text-ink/35">{secondary}</span>}
    </button>
  );
}

function RosterSection({
  group,
  onSelect,
}: {
  group: TopGroup;
  onSelect: (id: string) => void;
}) {
  const cardVariant = CARD_VARIANT[group.variant];

  return (
    <section
      className="rounded-2xl border-[1.5px] border-ink/12 bg-paper-deep p-4 shadow-[0_3px_0_rgba(30,34,51,0.06)] sm:p-5"
    >
      <div className="flex items-center justify-between">
        <h2 className={`font-display text-xl font-bold ${HEADER_COLOR[group.variant]}`}>
          {group.label}
        </h2>
        <span className="font-display text-sm tabular-nums text-ink/40">
          {countMembers(group)}명
        </span>
      </div>

      {group.subGroups && (
        <div className="mt-4 flex flex-col gap-4">
          {group.subGroups.map((sub) => (
            <div key={sub.key}>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-ink/70">{sub.label}</h3>
                <span className="text-xs tabular-nums text-ink/40">
                  {sub.members.length}명
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-2.5">
                {sub.members.map((m) => (
                  <RosterCard
                    key={m.id}
                    name={m.name}
                    secondary={m.secondary}
                    variant={cardVariant}
                    onClick={() => onSelect(m.id)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {group.members && (
        <div className="mt-4 flex flex-wrap gap-2.5">
          {group.members.map((m) => (
            <RosterCard
              key={m.id}
              name={m.name}
              secondary={m.secondary}
              variant={cardVariant}
              onClick={() => onSelect(m.id)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

interface StudentModalState {
  open: boolean;
  student: Student | null;
  defaultGrade?: string;
}

interface TeacherModalState {
  open: boolean;
  teacher: Teacher | null;
}

export default function MembersPage() {
  const [session, setSession] = useState<Session>("오전");
  const [students, setStudents] = useState<Student[]>(() => mockStudents.map((s) => ({ ...s })));
  const [teachers, setTeachers] = useState<Teacher[]>(() => mockTeachers.map((t) => ({ ...t })));
  const [filter, setFilter] = useState<FilterState>({ level: "all" });

  const [studentModal, setStudentModal] = useState<StudentModalState>({
    open: false,
    student: null,
  });
  const [teacherModal, setTeacherModal] = useState<TeacherModalState>({
    open: false,
    teacher: null,
  });

  const sessionStudents = useMemo(
    () => students.filter((s) => s.session === session),
    [students, session],
  );
  const sessionTeachers = useMemo(
    () => teachers.filter((t) => t.session === session),
    [teachers, session],
  );

  const groups = useMemo(
    () => groupStudentsAndTeachers(sessionStudents, sessionTeachers),
    [sessionStudents, sessionTeachers],
  );
  const visibleGroups = useMemo(() => applyFilter(groups, filter), [groups, filter]);
  const total = useMemo(
    () => groups.reduce((sum, g) => sum + countMembers(g), 0),
    [groups],
  );


  function handleSaveStudent(draft: StudentDraft) {
    setStudents((prev) => {
      if (studentModal.student) {
        const id = studentModal.student.id;
        return prev.map((s) => (s.id === id ? { ...s, ...draft } : s));
      }
      const id = nextStudentId(prev, draft.grade, draft.class);
      return [...prev, { ...draft, id, attendanceRate: "" }];
    });
  }

  function handleDeleteStudent(id: string) {
    setStudents((prev) => prev.filter((s) => s.id !== id));
  }

  function handleSaveTeacher(draft: TeacherDraft) {
    setTeachers((prev) => {
      if (teacherModal.teacher) {
        const id = teacherModal.teacher.id;
        return prev.map((t) => (t.id === id ? { ...t, ...draft } : t));
      }
      const id = nextTeacherId(prev, draft.session, draft.team);
      return [...prev, { ...draft, id }];
    });
  }

  function handleDeleteTeacher(id: string) {
    setTeachers((prev) => prev.filter((t) => t.id !== id));
  }

  function openEditMember(memberId: string) {
    const student = sessionStudents.find((s) => s.id === memberId);
    if (student) {
      setStudentModal({ open: true, student });
      return;
    }
    const teacher = sessionTeachers.find((t) => t.id === memberId);
    if (teacher) {
      setTeacherModal({ open: true, teacher });
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-[1368px] flex-col gap-4 px-4 py-6 sm:px-6 lg:px-8">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 animate-[rise-in_0.5s_ease-out_both]">
        <Link
          href="/"
          className="flex items-center gap-1.5 justify-self-start rounded-full bg-ink px-3.5 py-2 text-sm font-semibold whitespace-nowrap text-paper hover:bg-ink/85"
        >
          <ArrowLeft className="size-3.5" />
          출석체크
        </Link>
        <div className="text-center">
          <p className="font-display text-[0.7rem] tracking-[0.3em] text-stamp">
            MEMBER REGISTRY
          </p>
          <h1 className="font-display text-3xl font-bold text-ink">학생·교사 관리</h1>
        </div>
        <div />
      </div>

      <div className="animate-[rise-in_0.5s_ease-out_both]" style={{ animationDelay: "70ms" }}>
        <Header
          session={session}
          onSessionChange={(s) => {
            setSession(s);
            setFilter({ level: "all" });
          }}
          actions={
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setStudentModal({ open: true, student: null })}
                className="flex items-center gap-1.5 rounded-full bg-ink px-3 py-1.5 text-sm font-semibold text-paper hover:bg-ink/85"
              >
                <Plus className="size-3.5" />
                학생 등록
              </button>
              <button
                type="button"
                onClick={() => setTeacherModal({ open: true, teacher: null })}
                className="flex items-center gap-1.5 rounded-full bg-teal px-3 py-1.5 text-sm font-semibold text-paper hover:opacity-90"
              >
                <Plus className="size-3.5" />
                교사 등록
              </button>
              <button
                type="button"
                onClick={() =>
                  setStudentModal({ open: true, student: null, defaultGrade: "새친구" })
                }
                className="flex items-center gap-1.5 rounded-full bg-gold px-3 py-1.5 text-sm font-semibold text-paper hover:opacity-90"
              >
                <UserPlus className="size-3.5" />
                새친구 등록
              </button>
            </div>
          }
        />
      </div>

      <div className="animate-[rise-in_0.5s_ease-out_both]" style={{ animationDelay: "140ms" }}>
        <FilterChips groups={groups} active={filter} onSelect={setFilter} />
      </div>

      <div className="flex flex-col gap-4">
        {total === 0 ? (
          <p className="py-12 text-center text-ink/40">등록된 인원이 없습니다</p>
        ) : (
          visibleGroups.map((group, i) => (
            <div
              key={group.key}
              className="animate-[rise-in_0.5s_ease-out_both]"
              style={{ animationDelay: `${210 + i * 70}ms` }}
            >
              <RosterSection group={group} onSelect={openEditMember} />
            </div>
          ))
        )}
      </div>

      <StudentForm
        open={studentModal.open}
        onOpenChange={(open) => setStudentModal((m) => ({ ...m, open }))}
        session={session}
        student={studentModal.student}
        defaultGrade={studentModal.defaultGrade}
        onSave={handleSaveStudent}
        onDelete={handleDeleteStudent}
      />
      <TeacherForm
        open={teacherModal.open}
        onOpenChange={(open) => setTeacherModal((m) => ({ ...m, open }))}
        session={session}
        teacher={teacherModal.teacher}
        onSave={handleSaveTeacher}
        onDelete={handleDeleteTeacher}
      />
    </main>
  );
}
