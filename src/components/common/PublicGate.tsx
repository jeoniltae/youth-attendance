"use client";
// 공개 3화면(/, /history, /birthday) 공용 게이트 — 교사용 비밀번호(session role) 검증.
// /members의 관리자 게이트와 별개 토큰(session_token)을 쓰므로 서로 섞이지 않는다.
// 화면(UI) 레벨 보호만 담당 — 데이터 API 자체는 인증 없이도 호출 가능(스코프 밖).

import { useAuthGate } from "@/hooks/useAuthGate";
import { AuthGateModal } from "./AuthGateModal";

export function PublicGate({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, checked, login } = useAuthGate("session");

  if (!checked) return null;

  return (
    <>
      {children}
      {!isAuthenticated && (
        <AuthGateModal
          title="교사 인증"
          description={"고등부 출석부는\n교사만 이용할 수 있습니다"}
          onLogin={login}
        />
      )}
    </>
  );
}
