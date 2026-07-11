"use client";
// 교적 관리 메인 페이지 — 관리자 전용, 학생/교사 정보 추가·수정·삭제

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, PieChart, Plus, UserPlus } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { FilterChips, type FilterState } from "@/components/attendance/FilterChips";
import { GradeSectionSkeleton } from "@/components/attendance/GradeSectionSkeleton";
import { StudentForm, type StudentDraft } from "@/components/students/StudentForm";
import { TeacherForm, type TeacherDraft } from "@/components/teachers/TeacherForm";
import { AuthGateModal } from "@/components/common/AuthGateModal";
import {
  groupStudentsAndTeachers,
  countMembers,
  type TopGroup,
} from "@/lib/group-members";
import { YearlyStats } from "@/components/stats/YearlyStats";
import { mostRecentSunday, toInputDateValue } from "@/lib/date";
import { useStudents } from "@/hooks/useStudents";
import { useTeachers } from "@/hooks/useTeachers";
import { useAuthGate } from "@/hooks/useAuthGate";
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

const HEADER_COLOR: Record<TopGroup["variant"], string> = {
  grade: "text-ink",
  teacher: "text-teal",
  newFamily: "text-gold",
  incomplete: "text-celebrate",
};

const CARD_VARIANT: Record<TopGroup["variant"], "default" | "teacher" | "newFamily"> = {
  grade: "default",
  teacher: "teacher",
  newFamily: "newFamily",
  incomplete: "default",
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
    <section className="rounded-2xl border-[1.5px] border-ink/12 bg-paper-deep p-4 shadow-[0_3px_0_rgba(30,34,51,0.06)] sm:p-5">
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
                <span className="text-xs tabular-nums text-ink/40">{sub.members.length}명</span>
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
  // Header의 DATE 표시용 — 이 페이지의 출석 수정은 학생/교사 폼 내 날짜 드롭다운이 별도로 담당
  const [headerDate] = useState(() => toInputDateValue(mostRecentSunday()));
  const [filter, setFilter] = useState<FilterState>({ level: "all" });
  const resultsRef = useRef<HTMLDivElement>(null);

  // 필터가 특정 그룹으로 좁혀지면(전체 제외) 결과로 자동 스크롤 — 메인 출석체크 화면과 동일한 처리
  useEffect(() => {
    if (filter.level === "all") return;
    resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [filter]);

  const [studentModal, setStudentModal] = useState<StudentModalState>({
    open: false,
    student: null,
  });
  const [teacherModal, setTeacherModal] = useState<TeacherModalState>({
    open: false,
    teacher: null,
  });
  const [showStats, setShowStats] = useState(false);

  const router = useRouter();
  const { isAuthenticated, checked, login } = useAuthGate("admin");
  // 비인증 상태에서는 API 자체를 호출하지 않음 (모달과 별개의 데이터 게이트)
  const studentsHook = useStudents(session, isAuthenticated);
  const teachersHook = useTeachers(session, isAuthenticated);

  const groups = useMemo(
    () => groupStudentsAndTeachers(studentsHook.students, teachersHook.teachers),
    [studentsHook.students, teachersHook.teachers],
  );
  const visibleGroups = useMemo(() => applyFilter(groups, filter), [groups, filter]);
  const total = useMemo(
    () => groups.reduce((sum, g) => sum + countMembers(g), 0),
    [groups],
  );

  async function handleSaveStudent(draft: StudentDraft) {
    if (studentModal.student) {
      await studentsHook.update({
        id: studentModal.student.id,
        attendanceRate: studentModal.student.attendanceRate,
        ...draft,
      });
    } else {
      await studentsHook.create({ ...draft, attendanceRate: "" });
    }
  }

  async function handleDeleteStudent(id: string) {
    await studentsHook.remove(id);
  }

  async function handleSaveTeacher(draft: TeacherDraft) {
    if (teacherModal.teacher) {
      await teachersHook.update({ id: teacherModal.teacher.id, ...draft });
    } else {
      await teachersHook.create(draft);
    }
  }

  async function handleDeleteTeacher(id: string) {
    await teachersHook.remove(id);
  }

  function openEditMember(memberId: string) {
    const student = studentsHook.students.find((s) => s.id === memberId);
    if (student) {
      setStudentModal({ open: true, student });
      return;
    }
    const teacher = teachersHook.teachers.find((t) => t.id === memberId);
    if (teacher) {
      setTeacherModal({ open: true, teacher });
    }
  }

  // sessionStorage 확인 전 — 빈 화면으로 flash 방지
  if (!checked) return null;

  return (
    <main className="mx-auto flex w-full max-w-[1368px] flex-col gap-4 px-4 py-6 sm:px-6 lg:px-8">
      {!isAuthenticated && (
        <AuthGateModal
          title="관리자 인증"
          description={"학생·교사 관리 기능은\n관리자만 이용할 수 있습니다"}
          onLogin={login}
          onCancel={() => router.back()}
        />
      )}

      <div className="relative flex items-center justify-center animate-[rise-in_0.5s_ease-out_both]">
        <Link
          href="/"
          className="absolute left-0 top-1/2 hidden -translate-y-1/2 items-center gap-1.5 rounded-full bg-ink px-3.5 py-2 text-sm font-semibold whitespace-nowrap text-paper hover:bg-ink/85 sm:flex"
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
        <button
          type="button"
          onClick={() => setShowStats(true)}
          className="absolute right-0 top-1/2 flex -translate-y-1/2 items-center gap-1.5 rounded-full border border-ink/20 px-3.5 py-2 text-sm font-medium text-ink/70 hover:border-ink/40 hover:text-ink"
        >
          <PieChart className="size-3.5" />
          <span className="hidden sm:inline">1년 통계</span>
        </button>
      </div>

      <div className="animate-[rise-in_0.5s_ease-out_both]" style={{ animationDelay: "70ms" }}>
        <Header
          session={session}
          date={headerDate}
          onSessionChange={(s) => {
            setSession(s);
            setFilter({ level: "all" });
          }}
          actions={
            <div className="flex w-full items-center justify-center gap-2 sm:w-auto sm:justify-start">
              <button
                type="button"
                onClick={() => setStudentModal({ open: true, student: null })}
                className="flex items-center gap-1.5 whitespace-nowrap rounded-full bg-ink px-3 py-1.5 text-sm font-semibold text-paper hover:bg-ink/85"
              >
                <Plus className="size-3.5" />
                학생<span className="hidden sm:inline"> 등록</span>
              </button>
              <button
                type="button"
                onClick={() => setTeacherModal({ open: true, teacher: null })}
                className="flex items-center gap-1.5 whitespace-nowrap rounded-full bg-teal px-3 py-1.5 text-sm font-semibold text-paper hover:opacity-90"
              >
                <Plus className="size-3.5" />
                교사<span className="hidden sm:inline"> 등록</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  setStudentModal({ open: true, student: null, defaultGrade: "새친구" })
                }
                className="flex items-center gap-1.5 whitespace-nowrap rounded-full bg-gold px-3 py-1.5 text-sm font-semibold text-paper hover:opacity-90"
              >
                <UserPlus className="size-3.5" />
                새친구<span className="hidden sm:inline"> 등록</span>
              </button>
            </div>
          }
        />
      </div>

      <div className="animate-[rise-in_0.5s_ease-out_both]" style={{ animationDelay: "140ms" }}>
        <FilterChips groups={groups} active={filter} onSelect={setFilter} />
      </div>

      <div ref={resultsRef} className="flex flex-col gap-4">
        {studentsHook.isLoading || teachersHook.isLoading ? (
          Array.from({ length: 2 }).map((_, i) => <GradeSectionSkeleton key={i} />)
        ) : studentsHook.isError || teachersHook.isError ? (
          <p className="py-12 text-center text-sm text-celebrate">
            데이터를 불러오지 못했습니다. 새로고침 후 다시 시도해주세요.
          </p>
        ) : total === 0 ? (
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

      {showStats && (
        <YearlyStats
          session={session}
          onClose={() => setShowStats(false)}
          enabled={isAuthenticated}
        />
      )}
    </main>
  );
}
