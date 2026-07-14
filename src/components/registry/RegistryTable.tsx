"use client";
// 교적부 통합 테이블 — 상단 컨트롤바(세션/학년 탭 + 이름 검색 + 카운트) + 반별 담당교사 칩 +
// sticky 스프레드시트 그리드. TanStack Table이 정렬/필터 로직을, 마크업/스타일은 직접 통제한다.
//
// sticky 처리: 단일 overflow-auto 컨테이너 안에서 헤더 행(top 고정)과 좌측 번호·이름 2열(left 고정).
// 좌상단 교차 셀은 z-index를 최상위로 둬 가로/세로 스크롤 모두에서 가려지지 않게 한다.

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type SortingFn,
  type SortingState,
} from "@tanstack/react-table";
import { ChevronDown, ChevronUp, ChevronsUpDown, Search, X } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Session, Student } from "@/types";

// 셀/헤더의 sticky·정렬 부가정보 (TanStack ColumnMeta로 전달)
// clamp: 긴 텍스트를 폭 고정 + 최대 2줄로 자름 — 나머지는 nowrap 유지
// widthClass: clamp 컬럼의 폭을 컬럼별로 개별 지정(미지정 시 기본값 사용)
type ColMeta = { sticky?: "num" | "name"; align?: "center"; clamp?: boolean; widthClass?: string };

// 학년 1→2→3→새친구 순서 고정 (기본 문자열 정렬은 "새친구"가 애매하게 끼는 것 방지)
const gradeRank = (g: string) => (g === "새친구" ? 99 : parseInt(g, 10) || 98);
const gradeSort: SortingFn<Student> = (a, b, id) =>
  gradeRank(a.getValue(id)) - gradeRank(b.getValue(id));

// 반 번호가 문자열이라 "10"이 "1","2" 사이로 가는 것 방지 (numeric 비교)
const classSort: SortingFn<Student> = (a, b, id) =>
  String(a.getValue(id)).localeCompare(String(b.getValue(id)), "ko", { numeric: true });

const GRADE_TABS = ["전체", "1", "2", "3"] as const;
type GradeTab = (typeof GRADE_TABS)[number] | "새친구";

function gradeTabLabel(tab: GradeTab): string {
  if (tab === "전체" || tab === "새친구") return tab;
  return `${tab}학년`;
}

interface RegistryTableProps {
  students: Student[];
  session: Session;
  onSessionChange: (session: Session) => void;
  /** id → 1년 출석률(정수 %). 시트의 출석률 컬럼이 비어 있어 Attendance에서 계산한 값 */
  rates?: Record<string, number>;
}

export function RegistryTable({ students, session, onSessionChange, rates }: RegistryTableProps) {
  const [gradeFilter, setGradeFilter] = useState<GradeTab>("전체");
  const [nameQuery, setNameQuery] = useState("");
  const [sorting, setSorting] = useState<SortingState>([
    { id: "grade", desc: false },
    { id: "class", desc: false },
    { id: "name", desc: false },
  ]);

  const hasNewFamily = useMemo(() => students.some((s) => s.grade === "새친구"), [students]);

  // 빈 값은 "—"로 표시하는 공통 셀
  const textCell = (v: unknown) => (v ? String(v) : "—");

  // 연락처 셀 — tel: 링크로 감싸 스마트폰에서 탭하면 바로 전화 연결.
  // 쉼표로 여러 번호가 있으면 각각 별도 링크로 처리(tel: 값은 숫자·+만 남김)
  const telCell = (v: unknown) => {
    const raw = v ? String(v).trim() : "";
    if (!raw) return "—";
    return raw
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean)
      .map((part, idx) => (
        <Fragment key={idx}>
          {idx > 0 && ", "}
          <a
            href={`tel:${part.replace(/[^\d+]/g, "")}`}
            className="whitespace-nowrap font-medium text-teal no-underline hover:underline"
          >
            {part}
          </a>
        </Fragment>
      ));
  };

  const columns = useMemo<ColumnDef<Student>[]>(
    () => [
      { id: "번호", header: "번호", enableSorting: false, cell: () => null, meta: { sticky: "num", align: "center" } satisfies ColMeta },
      { accessorKey: "name", header: "이름", filterFn: "includesString", cell: (c) => textCell(c.getValue()), meta: { sticky: "name" } satisfies ColMeta },
      { accessorKey: "grade", header: "학년", sortingFn: gradeSort, filterFn: "equalsString", cell: (c) => textCell(c.getValue()), meta: { align: "center" } satisfies ColMeta },
      { accessorKey: "class", header: "반", sortingFn: classSort, cell: (c) => { const v = c.getValue<string>(); return v ? `${v}반` : "—"; }, meta: { align: "center" } satisfies ColMeta },
      { accessorKey: "gender", header: "성별", cell: (c) => textCell(c.getValue()), meta: { align: "center" } satisfies ColMeta },
      { accessorKey: "school", header: "학교", cell: (c) => textCell(c.getValue()), meta: { clamp: true, widthClass: "lg:max-w-36 lg:min-w-[100px]" } satisfies ColMeta },
      { accessorKey: "birthdate", header: "생년월일", cell: (c) => textCell(c.getValue()) },
      { accessorKey: "phone", header: "연락처", cell: (c) => telCell(c.getValue()) },
      { accessorKey: "parentPhone", header: "부모님 연락처", cell: (c) => telCell(c.getValue()) },
      { accessorKey: "address", header: "주소", cell: (c) => textCell(c.getValue()) },
      { accessorKey: "baptism", header: "세례", cell: (c) => textCell(c.getValue()), meta: { align: "center" } satisfies ColMeta },
      {
        id: "attendanceRate",
        header: "출석률(1년기준)",
        // 시트 컬럼이 비어 있어 계산된 rates(id→%)에서 값을 가져온다. 기록 없으면 0%
        accessorFn: (s) => rates?.[s.id] ?? 0,
        sortingFn: "basic",
        cell: (c) => (rates ? `${c.getValue<number>()}%` : "—"),
        meta: { align: "center" } satisfies ColMeta,
      },
      { accessorKey: "notes", header: "비고", cell: (c) => textCell(c.getValue()) },
    ],
    [rates],
  );

  const columnFilters = useMemo<ColumnFiltersState>(() => {
    const f: ColumnFiltersState = [];
    if (gradeFilter !== "전체") f.push({ id: "grade", value: gradeFilter });
    if (nameQuery.trim()) f.push({ id: "name", value: nameQuery.trim() });
    return f;
  }, [gradeFilter, nameQuery]);

  const table = useReactTable({
    data: students,
    columns,
    state: { sorting, columnFilters },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const rows = table.getRowModel().rows;

  // 필터/탭/검색/정렬이 바뀌면 그리드를 맨 위로 — 아래로 내려간 상태에서 결과가 바뀌어
  // 중간부터 보이는 어색함 방지 (스크롤 위치를 새 결과의 처음으로 리셋)
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [gradeFilter, nameQuery, sorting]);

  // 선택된 학년(1/2/3)의 반별 담당교사 — 컬럼 대신 상단 칩으로 표시
  const classTeachers = useMemo(() => {
    if (gradeFilter === "전체" || gradeFilter === "새친구") return [];
    const map = new Map<string, Set<string>>();
    for (const s of students) {
      if (s.grade !== gradeFilter || !s.class) continue;
      if (!map.has(s.class)) map.set(s.class, new Set());
      if (s.teacher) map.get(s.class)!.add(s.teacher);
    }
    return [...map.entries()]
      .sort((a, b) => a[0].localeCompare(b[0], "ko", { numeric: true }))
      .map(([cls, set]) => ({ cls, teachers: [...set].join(" / ") }));
  }, [students, gradeFilter]);

  const gradeTabs: GradeTab[] = hasNewFamily ? [...GRADE_TABS, "새친구"] : [...GRADE_TABS];

  // sticky 좌측 열 오프셋 (번호 폭과 이름의 left 값이 일치해야 함)
  const stickyBody = (meta?: ColMeta) =>
    meta?.sticky === "num"
      ? "sticky left-0 z-10 w-[52px] min-w-[52px] bg-paper group-hover:bg-paper-deep"
      : meta?.sticky === "name"
        ? "sticky left-[52px] z-10 min-w-[92px] bg-paper group-hover:bg-paper-deep"
        : "";
  const stickyHead = (meta?: ColMeta) =>
    meta?.sticky === "num"
      ? "left-0 z-30 w-[52px] min-w-[52px]"
      : meta?.sticky === "name"
        ? "left-[52px] z-30 min-w-[92px]"
        : "z-20";

  return (
    <TooltipProvider>
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      {/* ── 통합 컨트롤바 ──
          모바일(<sm): 풀폭 세로 스택(세션 세그먼트 / 학년탭 가로스크롤 / 풀폭 검색 / 카운트).
          sm+: 기존 한 줄 인라인(세션 · 구분선 · 학년탭 · 우측 검색+카운트) */}
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-3 sm:gap-y-2">
        {/* 세션 토글 — 모바일은 반반 세그먼트 */}
        <div className="flex w-full gap-1.5 sm:w-auto">
          {(["오전", "오후"] as Session[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onSessionChange(s)}
              className={`flex-1 rounded-full px-4 py-1.5 text-sm sm:flex-none ${
                s === session
                  ? "bg-ink font-semibold text-paper"
                  : "border border-ink/25 font-medium text-ink/60 hover:border-ink/50 hover:text-ink"
              }`}
            >
              {s}반
            </button>
          ))}
        </div>

        <div className="hidden h-5 w-px bg-ink/15 sm:block" />

        {/* 학년 탭 — 모바일은 가로 스크롤 한 줄 */}
        <div className="flex w-full gap-1.5 overflow-x-auto [&::-webkit-scrollbar]:hidden sm:w-auto sm:flex-wrap sm:overflow-visible">
          {gradeTabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setGradeFilter(tab)}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm ${
                tab === gradeFilter
                  ? "bg-ink font-semibold text-paper"
                  : "border border-ink/20 font-medium text-ink/60 hover:border-ink/45 hover:text-ink"
              }`}
            >
              {gradeTabLabel(tab)}
            </button>
          ))}
        </div>

        {/* 검색 + 카운트 — 모바일 풀폭 세로, sm+ 우측 인라인 */}
        <div className="flex w-full flex-col gap-1 sm:ml-auto sm:w-auto sm:flex-row sm:items-center sm:gap-3">
          <div className="relative w-full sm:w-auto">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink/40" />
            <input
              value={nameQuery}
              onChange={(e) => setNameQuery(e.target.value)}
              placeholder="이름 검색"
              className="w-full rounded-full border border-ink/20 bg-paper py-1.5 pl-9 pr-9 text-sm text-ink placeholder:text-ink/40 focus:border-ink/45 focus:outline-none sm:w-48"
            />
            {nameQuery && (
              <button
                type="button"
                onClick={() => setNameQuery("")}
                aria-label="검색어 지우기"
                className="absolute right-2 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-full text-ink/40 hover:bg-ink/8 hover:text-ink/70"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
          <span className="whitespace-nowrap pl-1 font-display text-xs text-ink/55 sm:pl-0 sm:text-sm">
            {session}반 · {gradeTabLabel(gradeFilter)}{" "}
            <b className="tabular-nums text-ink">{rows.length}</b>명
          </span>
        </div>
      </div>

      {/* ── 반별 담당교사 범례 칩 (특정 학년 선택 시에만) ── */}
      {classTeachers.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-ink/45">담임 및 부담임</span>
          {classTeachers.map((ct) => (
            <span
              key={ct.cls}
              className="inline-flex items-center gap-1.5 rounded-full border border-teal/30 bg-teal/8 px-3 py-1 text-xs"
            >
              <b className="font-semibold text-teal">{ct.cls}반</b>
              <span className="text-ink/60">{ct.teachers || "미배정"}</span>
            </span>
          ))}
        </div>
      )}

      {/* ── sticky 스크롤 그리드 ── */}
      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-auto rounded-xl border-[1.5px] border-ink/15 bg-paper"
      >
        <table className="w-full min-w-[1040px] border-separate border-spacing-0 text-sm">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((header) => {
                  const meta = header.column.columnDef.meta as ColMeta | undefined;
                  const canSort = header.column.getCanSort();
                  const sorted = header.column.getIsSorted();
                  return (
                    <th
                      key={header.id}
                      className={`sticky top-0 border-b border-ink/25 bg-ink px-3 py-2.5 font-semibold whitespace-nowrap text-paper ${
                        meta?.align === "center" ? "text-center" : "text-left"
                      } ${stickyHead(meta)}`}
                    >
                      {canSort ? (
                        <button
                          type="button"
                          onClick={header.column.getToggleSortingHandler()}
                          className={`flex items-center gap-1 ${meta?.align === "center" ? "mx-auto" : ""}`}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {sorted === "asc" ? (
                            <ChevronUp className="size-3.5" />
                          ) : sorted === "desc" ? (
                            <ChevronDown className="size-3.5" />
                          ) : (
                            <ChevronsUpDown className="size-3.5 text-paper/45" />
                          )}
                        </button>
                      ) : (
                        flexRender(header.column.columnDef.header, header.getContext())
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-3 py-12 text-center text-ink/40"
                >
                  표시할 학생이 없습니다
                </td>
              </tr>
            ) : (
              rows.map((row, i) => (
                <tr key={row.id} className="group">
                  {row.getVisibleCells().map((cell) => {
                    const meta = cell.column.columnDef.meta as ColMeta | undefined;
                    const content =
                      cell.column.id === "번호"
                        ? String(i + 1).padStart(2, "0")
                        : flexRender(cell.column.columnDef.cell, cell.getContext());
                    // clamp 열(학교)의 원본 값 — lg에서 잘린 경우 hover 툴팁으로 전체 표시
                    const rawValue = meta?.clamp ? String(cell.getValue() ?? "") : "";
                    return (
                      <td
                        key={cell.id}
                        // clamp 열(학교): lg 이상에서만 폭 고정 + 2줄 말줄임. 좁은 화면은 전체 표시(nowrap)
                        className={`border-b border-ink/8 px-3 py-2 text-ink/80 group-hover:bg-paper-deep ${
                          meta?.clamp
                            ? `whitespace-nowrap lg:whitespace-normal lg:align-middle ${meta.widthClass ?? "lg:max-w-36"}`
                            : "whitespace-nowrap"
                        } ${meta?.align === "center" ? "text-center" : "text-left"} ${stickyBody(meta)}`}
                      >
                        {meta?.clamp && rawValue ? (
                          <Tooltip>
                            <TooltipTrigger
                              render={<span className="wrap-break-word lg:line-clamp-2" />}
                            >
                              {content}
                            </TooltipTrigger>
                            <TooltipContent>{rawValue}</TooltipContent>
                          </Tooltip>
                        ) : (
                          content
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
    </TooltipProvider>
  );
}
