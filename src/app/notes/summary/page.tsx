"use client";
// 말씀노트 시상 화면 — 총무팀이 기간별 수상자를 확인·복사한다. 관리자(admin) 게이트 뒤에 있다

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AuthGateModal } from "@/components/common/AuthGateModal";
import { NotesSummaryList } from "@/components/notes/NotesSummaryList";
import { useAuthGate } from "@/hooks/useAuthGate";

export default function NotesSummaryPage() {
  const router = useRouter();
  const { isAuthenticated, checked, login } = useAuthGate("admin");

  // sessionStorage 확인 전 — 빈 화면 flash 방지
  if (!checked) return null;

  return (
    <main className="mx-auto flex w-full max-w-[880px] flex-col gap-4 px-4 py-6">
      {!isAuthenticated && (
        <AuthGateModal
          title="관리자 인증"
          description={"말씀노트 시상 명단은\n관리자만 열람할 수 있습니다"}
          onLogin={login}
          onCancel={() => router.back()}
        />
      )}

      <div className="flex items-center gap-3">
        <Link
          href="/members"
          aria-label="학생·교사 관리로 돌아가기"
          className="flex size-10 flex-none items-center justify-center rounded-full bg-ink text-paper hover:bg-ink/85"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <h1 className="font-display text-[28px] font-bold text-ink">말씀노트 시상</h1>
      </div>

      {/* ⚠️ 인증 전에는 목록을 마운트하지 않는다 — 캐시에 남은 명단이 게이트 뒤에 그려지지 않게 한다 */}
      {isAuthenticated ? <NotesSummaryList /> : null}
    </main>
  );
}
