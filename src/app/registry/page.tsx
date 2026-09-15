"use client";
// 교적부 페이지 — 열람 전용 학생 명단 그리드
// 편집 기능이 있는 /members(관리자)와 달리 읽기 전용이다.
//
// ⚠️ 나머지 공개 화면(/, /history, /birthday)과 **다른 비밀번호**를 쓴다(registry role).
// 주소·생년월일·부모 연락처를 한 화면에 모아 보여줘서 교사 전체에게 열어두기엔 범위가 넓다.
// 그래서 PublicGate(교사용 문구 고정)를 쓰지 않고 /teachers와 같은 방식으로
// AuthGateModal을 직접 띄운다 — PublicGate의 props를 건드리면 공개 3화면까지 영향을 받는다.

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { AuthGateModal } from "@/components/common/AuthGateModal";
import { RegistryTable } from "@/components/registry/RegistryTable";
import { RegistryTableSkeleton } from "@/components/registry/RegistryTableSkeleton";
import { useAuthGate } from "@/hooks/useAuthGate";
import { useRoster } from "@/hooks/useRoster";
import { getAttendanceRates } from "@/api/stats";
import type { Session } from "@/types";

export default function RegistryPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session>("오전");

  // URL 쿼리(?session=오후)로 초기 세션 지정 — 공유/북마크용. 마운트 때 1회만 읽는다.
  // 잘못된 값은 무시하고 기본(오전) 유지. window API라 useSearchParams와 달리 Suspense 경계가 불필요.
  // (참고: 다른 화면에서도 필요해지면 작은 공용 훅으로 추출)
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("session");
    if (q === "오전" || q === "오후") setSession(q);
  }, []);

  // 세그먼트 클릭 시 화면과 URL을 함께 갱신 — replaceState라 재요청도, 뒤로가기 히스토리 오염도 없음.
  // 기본(오전)은 쿼리를 제거해 URL을 깔끔하게 유지. 다른 쿼리 파라미터가 있으면 보존.
  const handleSessionChange = (next: Session) => {
    setSession(next);
    const params = new URLSearchParams(window.location.search);
    if (next === "오후") params.set("session", "오후");
    else params.delete("session");
    const qs = params.toString();
    window.history.replaceState(
      null,
      "",
      qs ? `?${qs}` : window.location.pathname,
    );
  };

  // 단일 인스턴스만 유지 — 아래 useRoster/rates의 enabled와 게이트 모달이 같은 state를
  // 봐야 로그인 직후 데이터 조회가 함께 열린다 (훅을 두 번 호출하면 state가 갈라진다)
  const registryAuth = useAuthGate("registry");

  const {
    data: roster,
    isLoading,
    isError,
    // 세션 전환 중 이전 데이터를 보여주는 동안 true — 그리드를 살짝 흐리게 해 "새 세션 로딩 중"을 표시
    isPlaceholderData,
  } = useRoster(session, registryAuth.isAuthenticated, true);

  // 1년 출석률(계산값) — 시트의 출석률 컬럼은 비어 있어 Attendance 기록에서 산출.
  // 세션 무관·변동이 잦지 않아 5분 캐시로 재조회 최소화
  const { data: ratesData } = useQuery({
    queryKey: ["registry-rates"],
    queryFn: getAttendanceRates,
    enabled: registryAuth.isAuthenticated,
    staleTime: 5 * 60_000,
  });

  const students = roster?.students ?? [];

  // sessionStorage 확인 전 — 빈 화면 flash 방지 (/teachers와 동일)
  if (!registryAuth.checked) return null;

  return (
    <main className="mx-auto flex h-dvh w-full max-w-[1368px] flex-col gap-4 overflow-hidden px-4 py-6 sm:px-6 lg:max-w-none lg:px-[15px]">
      {!registryAuth.isAuthenticated && (
        <AuthGateModal
          title="교역자 인증"
          description={
            "학생 교적부는\n교역자 및 부장집사님만 이용할 수 있습니다.\n교적부 문의는 교역자에게 연락해 주세요."
          }
          onLogin={registryAuth.login}
          // 공개 3화면과 달리 취소를 둔다 — 비밀번호를 모르는 교사가 여기서 갇히면
          // 뒤로가기 말고는 나갈 길이 없다. back()이 아니라 "/"로 보내는 이유는
          // 주소창으로 바로 들어온 경우 back()이 앱 밖으로 나가버리기 때문.
          onCancel={() => router.push("/")}
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
          <h1 className="font-display text-3xl font-bold text-ink">교적부</h1>
        </div>
      </div>

      <div
        className="flex min-h-0 flex-1 flex-col animate-[rise-in_0.5s_ease-out_both]"
        style={{ animationDelay: "70ms" }}
      >
        {/*
          ⚠️ 인증 전에는 표를 아예 렌더하지 않는다. useRoster의 enabled:false는 '새 요청'만
          막고 캐시 읽기는 막지 못한다 — 메인(/)이 같은 queryKey(["roster", session])로
          이미 받아둔 데이터가 있으면 여기서 그대로 꺼내져 isLoading이 false가 되고,
          모달 뒤에 명단 전체가 그려진다. 주소창으로 직접 들어오면 캐시가 비어 있어
          증상이 안 보이므로, 반드시 메인을 거쳐 들어와서 확인해야 한다.
        */}
        {!registryAuth.isAuthenticated ? null : isLoading ? (
          <RegistryTableSkeleton />
        ) : isError ? (
          <div className="rounded-2xl border-[1.5px] border-ink/12 bg-paper-deep p-12 text-center text-sm text-celebrate">
            데이터를 불러오지 못했습니다. 새로고침 후 다시 시도해주세요.
          </div>
        ) : (
          <RegistryTable
            students={students}
            session={session}
            onSessionChange={handleSessionChange}
            rates={ratesData?.rates}
            firstHalf={ratesData?.firstHalf}
            secondHalf={ratesData?.secondHalf}
            loading={isPlaceholderData}
          />
        )}
      </div>
    </main>
  );
}
