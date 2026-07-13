"use client";
// 공개 4화면(/, /history, /birthday, /registry) 공용 게이트 — 교사용 비밀번호(session role) 검증.
// /members의 관리자 게이트와 별개 토큰(session_token)을 쓰므로 서로 섞이지 않는다.
// 화면(UI) 레벨 보호만 담당 — 데이터 API 자체는 인증 없이도 호출 가능(스코프 밖).
//
// isAuthenticated/checked/login을 props로 받는다(내부에서 useAuthGate를 다시 호출하지
// 않음) — 각 페이지가 데이터 훅의 enabled 게이트에도 동일한 useAuthGate("session")
// 인스턴스를 써야 하므로, 훅을 두 곳에서 각각 호출하면 서로 다른 state가 되어
// 로그인 직후 이 컴포넌트만 갱신되고 페이지의 데이터 훅은 갱신되지 않는 버그가 생긴다.

import { AuthGateModal } from "./AuthGateModal";

interface PublicGateProps {
  isAuthenticated: boolean;
  checked: boolean;
  login: (password: string) => Promise<void>;
  children: React.ReactNode;
}

export function PublicGate({ isAuthenticated, checked, login, children }: PublicGateProps) {
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
