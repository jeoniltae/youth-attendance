"use client";
// 교사 교적부 통합 테이블 — 학생 교적부(RegistryTable)의 교사판.
// 상단 컨트롤바(세션 세그먼트 / 팀 탭 / 이름 검색 / 카운트) + sticky 스프레드시트 그리드.
// 컬럼: 번호 · 이름 · 팀 · 연락처 · 생년월일 · 주소 · 출석률(1년기준) · 비고

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
import { TEAM_ORDER } from "@/lib/group-members";
import { RollingNumber } from "@/components/common/RollingNumber";
import type { Session, Teacher } from "@/types";

type ColMeta = { sticky?: "num" | "name"; align?: "center" };

// 팀 정렬 — TEAM_ORDER(총무팀→예배지원팀→1·2·3학년교사) 순서 고정
const teamRank = (t: string) => {
  const i = TEAM_ORDER.indexOf(t);
  return i === -1 ? 99 : i;
};
const teamSort: SortingFn<Teacher> = (a, b, id) =>
  teamRank(a.getValue(id)) - teamRank(b.getValue(id));

// 클릭한 탭을 가로 스크롤 컨테이너의 정중앙으로 이동(모바일 탭 UX).
// block:"nearest"로 세로(페이지) 스크롤은 건드리지 않음, 리듀스드모션이면 즉시 이동.
function centerTab(el: HTMLElement) {
  el.scrollIntoView({
    inline: "center",
    block: "nearest",
    behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? "auto"
      : "smooth",
  });
}

interface TeacherRegistryTableProps {
  teachers: Teacher[];
  session: Session;
  onSessionChange: (session: Session) => void;
  /** id → 1년 출석률(정수 %). Attendance 기록에서 계산한 값(교사 id 포함) */
  rates?: Record<string, number>;
  /** 세션 전환 등으로 새 데이터를 불러오는 중 — 그리드를 살짝 흐리게 처리 */
  loading?: boolean;
}

export function TeacherRegistryTable({
  teachers,
  session,
  onSessionChange,
  rates,
  loading = false,
}: TeacherRegistryTableProps) {
  const [teamFilter, setTeamFilter] = useState("전체");
  const [nameQuery, setNameQuery] = useState("");
  const [sorting, setSorting] = useState<SortingState>([
    { id: "team", desc: false },
    { id: "name", desc: false },
  ]);

  const textCell = (v: unknown) => (v ? String(v) : "—");

  // 연락처 셀 — tel: 링크로 감싸 스마트폰에서 탭하면 바로 전화 연결
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

  const columns = useMemo<ColumnDef<Teacher>[]>(
    () => [
      { id: "번호", header: "번호", enableSorting: false, cell: () => null, meta: { sticky: "num", align: "center" } satisfies ColMeta },
      { accessorKey: "name", header: "이름", filterFn: "includesString", cell: (c) => textCell(c.getValue()), meta: { sticky: "name" } satisfies ColMeta },
      { accessorKey: "team", header: "팀", sortingFn: teamSort, filterFn: "equalsString", cell: (c) => textCell(c.getValue()) },
      { accessorKey: "phone", header: "연락처", cell: (c) => telCell(c.getValue()) },
      { accessorKey: "birthdate", header: "생년월일", cell: (c) => textCell(c.getValue()) },
      { accessorKey: "address", header: "주소", cell: (c) => textCell(c.getValue()) },
      {
        id: "attendanceRate",
        header: "출석률(1년기준)",
        // 시트에 교사 출석률 컬럼이 없어 Attendance 기록에서 계산한 rates(id→%) 사용. 기록 없으면 0%
        accessorFn: (t) => rates?.[t.id] ?? 0,
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
    if (teamFilter !== "전체") f.push({ id: "team", value: teamFilter });
    if (nameQuery.trim()) f.push({ id: "name", value: nameQuery.trim() });
    return f;
  }, [teamFilter, nameQuery]);

  const table = useReactTable({
    data: teachers,
    columns,
    state: { sorting, columnFilters },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const rows = table.getRowModel().rows;

  // 필터/탭/검색/정렬이 바뀌면 그리드를 맨 위로 (새 결과의 처음부터 보이게)
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [teamFilter, nameQuery, sorting]);

  // 실제 존재하는 팀만 탭으로 노출 (전체 + TEAM_ORDER 중 인원 있는 팀)
  const teamTabs = useMemo(
    () => ["전체", ...TEAM_ORDER.filter((team) => teachers.some((t) => t.team === team))],
    [teachers],
  );

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
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      {/* ── 통합 컨트롤바 (모바일 풀폭 세로 스택 / sm+ 한 줄 인라인) ── */}
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-3 sm:gap-y-2">
        {/* 세션 토글 — 세그먼트 컨트롤(슬라이딩 썸) */}
        <div className="relative flex w-full rounded-full border border-ink/15 bg-ink/5 p-1 sm:w-auto">
          <span
            aria-hidden
            className={`pointer-events-none absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-full bg-ink shadow-sm transition-transform duration-300 ease-out ${
              session === "오후" ? "translate-x-full" : "translate-x-0"
            }`}
          />
          {(["오전", "오후"] as Session[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onSessionChange(s)}
              className={`relative z-10 flex-1 rounded-full px-4 py-1 text-sm transition-colors sm:flex-none sm:min-w-[64px] ${
                s === session
                  ? "font-semibold text-paper"
                  : "font-medium text-ink/55 hover:text-ink"
              }`}
            >
              {s}반
            </button>
          ))}
        </div>

        <div className="hidden h-5 w-px bg-ink/15 sm:block" />

        {/* 팀 탭 — 모바일은 가로 스크롤 한 줄 */}
        <div className="flex w-full gap-1.5 overflow-x-auto [&::-webkit-scrollbar]:hidden sm:w-auto sm:flex-wrap sm:overflow-visible">
          {teamTabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={(e) => {
                setTeamFilter(tab);
                centerTab(e.currentTarget);
              }}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm ${
                tab === teamFilter
                  ? "bg-ink font-semibold text-paper"
                  : "border border-ink/20 font-medium text-ink/60 hover:border-ink/45 hover:text-ink"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* 인원수 카운트 — PC(sm+)는 탭 우측에 강조 배지로 표시 */}
        <span className="hidden items-center whitespace-nowrap rounded-full bg-stamp/10 px-3 py-1 font-display text-sm font-semibold text-stamp sm:inline-flex">
          {session}반: {teamFilter}&nbsp;
          <RollingNumber value={rows.length} className="font-bold" />명
        </span>

        {/* 검색 + 카운트(모바일) */}
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
          <span className="inline-flex items-center self-start whitespace-nowrap rounded-full bg-stamp/10 px-3 py-1 font-display text-xs font-semibold text-stamp sm:hidden">
            {session}반: {teamFilter}&nbsp;
            <RollingNumber value={rows.length} className="font-bold" />명
          </span>
        </div>
      </div>

      {/* ── sticky 스크롤 그리드 ── */}
      <div
        ref={scrollRef}
        className={`min-h-0 flex-1 overflow-auto rounded-xl border-[1.5px] border-ink/15 bg-paper transition-opacity duration-300 motion-reduce:transition-none ${
          loading ? "pointer-events-none opacity-50" : "opacity-100"
        }`}
      >
        <table className="w-full min-w-[820px] border-separate border-spacing-0 text-sm">
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
                <td colSpan={columns.length} className="px-3 py-12 text-center text-ink/40">
                  표시할 교사가 없습니다
                </td>
              </tr>
            ) : (
              rows.map((row, i) => (
                <tr key={row.id} className="group">
                  {row.getVisibleCells().map((cell) => {
                    const meta = cell.column.columnDef.meta as ColMeta | undefined;
                    return (
                      <td
                        key={cell.id}
                        className={`border-b border-ink/8 px-3 py-2 whitespace-nowrap text-ink/80 group-hover:bg-paper-deep ${
                          meta?.align === "center" ? "text-center" : "text-left"
                        } ${stickyBody(meta)}`}
                      >
                        {cell.column.id === "번호"
                          ? String(i + 1).padStart(2, "0")
                          : flexRender(cell.column.columnDef.cell, cell.getContext())}
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
  );
}
