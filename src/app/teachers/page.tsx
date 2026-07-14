"use client";
// 교사 교적부 — 관리자(admin) 전용 열람. 학생 교적부(/registry)의 교사판.
// /members와 동일한 관리자 비밀번호(ADMIN_PASSWORD) 게이트로 보호한다.

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { AuthGateModal } from "@/components/common/AuthGateModal";
import { TeacherRegistryTable } from "@/components/registry/TeacherRegistryTable";
import { TeacherRegistryTableSkeleton } from "@/components/registry/TeacherRegistryTableSkeleton";
import { useAuthGate } from "@/hooks/useAuthGate";
import { useRoster } from "@/hooks/useRoster";
import { getAttendanceRates } from "@/api/stats";
import type { Session } from "@/types";

export default function TeachersPage() {
  const [session, setSession] = useState<Session>("오전");
  const router = useRouter();

  const { isAuthenticated, checked, login } = useAuthGate("admin");

  const {
    data: roster,
    isLoading,
    isError,
    isPlaceholderData,
  } = useRoster(session, isAuthenticated, true);

  // 1년 출석률(계산값) — 교사 id 포함. 학생 교적부와 동일 엔드포인트 재사용
  const { data: ratesData } = useQuery({
    queryKey: ["registry-rates"],
    queryFn: getAttendanceRates,
    enabled: isAuthenticated,
    staleTime: 5 * 60_000,
  });

  const teachers = roster?.teachers ?? [];

  // sessionStorage 확인 전 — 빈 화면 flash 방지
  if (!checked) return null;

  return (
    <main className="mx-auto flex h-dvh w-full max-w-[1368px] flex-col gap-4 overflow-hidden px-4 py-6 sm:px-6 lg:max-w-none lg:px-[15px]">
      {!isAuthenticated && (
        <AuthGateModal
          title="관리자 인증"
          description={"교사 명단은\n관리자만 열람할 수 있습니다"}
          onLogin={login}
          onCancel={() => router.back()}
        />
      )}

      <div className="relative flex items-center justify-center animate-[rise-in_0.5s_ease-out_both]">
        <Link
          href="/members"
          className="absolute left-0 top-1/2 hidden -translate-y-1/2 items-center gap-1.5 rounded-full bg-ink px-3.5 py-2 text-sm font-semibold whitespace-nowrap text-paper hover:bg-ink/85 sm:flex"
        >
          <ArrowLeft className="size-3.5" />
          학생·교사 관리
        </Link>
        <div className="text-center">
          <p className="font-display text-[0.7rem] tracking-[0.3em] text-stamp">
            TEACHER REGISTRY
          </p>
          <h1 className="font-display text-3xl font-bold text-ink">교사 현황</h1>
        </div>
      </div>

      <div
        className="flex min-h-0 flex-1 flex-col animate-[rise-in_0.5s_ease-out_both]"
        style={{ animationDelay: "70ms" }}
      >
        {isLoading ? (
          <TeacherRegistryTableSkeleton />
        ) : isError ? (
          <div className="rounded-2xl border-[1.5px] border-ink/12 bg-paper-deep p-12 text-center text-sm text-celebrate">
            데이터를 불러오지 못했습니다. 새로고침 후 다시 시도해주세요.
          </div>
        ) : (
          <TeacherRegistryTable
            teachers={teachers}
            session={session}
            onSessionChange={setSession}
            rates={ratesData?.rates}
            loading={isPlaceholderData}
          />
        )}
      </div>
    </main>
  );
}
