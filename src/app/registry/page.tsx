"use client";
// 교적부 페이지 — 교사용(session) 열람 전용 학생 명단 그리드
// 편집 기능이 있는 /members(관리자)와 달리 읽기 전용이며, 나머지 공개 화면(/, /history,
// /birthday)과 동일한 교사용 비밀번호(session) 게이트로 보호한다.

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { PublicGate } from "@/components/common/PublicGate";
import { RegistryTable } from "@/components/registry/RegistryTable";
import { useAuthGate } from "@/hooks/useAuthGate";
import { useRoster } from "@/hooks/useRoster";
import { getAttendanceRates } from "@/api/stats";
import type { Session } from "@/types";

export default function RegistryPage() {
  const [session, setSession] = useState<Session>("오전");

  // 단일 인스턴스만 유지 — PublicGate에도 이 값을 그대로 넘겨 로그인 직후
  // useRoster의 enabled가 함께 갱신되도록 한다 (history/page.tsx와 동일 패턴, 별도 호출 금지)
  const sessionAuth = useAuthGate("session");

  const {
    data: roster,
    isLoading,
    isError,
  } = useRoster(session, sessionAuth.isAuthenticated);

  // 1년 출석률(계산값) — 시트의 출석률 컬럼은 비어 있어 Attendance 기록에서 산출.
  // 세션 무관·변동이 잦지 않아 5분 캐시로 재조회 최소화
  const { data: ratesData } = useQuery({
    queryKey: ["registry-rates"],
    queryFn: getAttendanceRates,
    enabled: sessionAuth.isAuthenticated,
    staleTime: 5 * 60_000,
  });

  const students = roster?.students ?? [];

  return (
    <PublicGate
      isAuthenticated={sessionAuth.isAuthenticated}
      checked={sessionAuth.checked}
      login={sessionAuth.login}
    >
      <main className="mx-auto flex w-full max-w-[1368px] flex-col gap-4 px-4 py-6 sm:px-6 lg:px-8">
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
            <h1 className="font-display text-3xl font-bold text-ink">교적부</h1>
          </div>
        </div>

        <div
          className="animate-[rise-in_0.5s_ease-out_both]"
          style={{ animationDelay: "70ms" }}
        >
          {isLoading ? (
            <div className="rounded-2xl border-[1.5px] border-ink/12 bg-paper-deep p-12 text-center text-sm text-ink/50">
              명단을 불러오는 중…
            </div>
          ) : isError ? (
            <div className="rounded-2xl border-[1.5px] border-ink/12 bg-paper-deep p-12 text-center text-sm text-celebrate">
              데이터를 불러오지 못했습니다. 새로고침 후 다시 시도해주세요.
            </div>
          ) : (
            <RegistryTable
              students={students}
              session={session}
              onSessionChange={setSession}
              rates={ratesData?.rates}
            />
          )}
        </div>
      </main>
    </PublicGate>
  );
}
