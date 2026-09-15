// 비밀번호 게이트 인증 훅 — role별로 sessionStorage 키와 검증 대상 비밀번호를 분리한다.
//   admin    : /members(학생·교사 데이터 수정) · /teachers(교사 명단 열람)
//   session  : 공개 3화면(/, /history, /birthday) — 교사 다수가 공유해서 아는 비밀번호
//   registry : /registry(학생 교적부) — 교역자·부장집사만 아는 별도 비밀번호
//
// registry를 session에서 떼어낸 이유: 교적부는 주소·생년월일·부모 연락처까지 한 화면에
// 모아 보여줘서, 교사 전체가 아는 비밀번호로 열어두기엔 범위가 넓다.
// 세 role은 서로 독립이다 — 관리자라고 교적부가 자동으로 열리지 않는다(의도된 동작).

import { useState, useEffect, useCallback } from "react";

export type AuthRole = "admin" | "session" | "registry";

const STORAGE_KEY_BY_ROLE: Record<AuthRole, string> = {
  admin: "admin_token",
  session: "session_token",
  registry: "registry_token",
};

export function useAuthGate(role: AuthRole) {
  const storageKey = STORAGE_KEY_BY_ROLE[role];
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    setIsAuthenticated(!!sessionStorage.getItem(storageKey));
    setChecked(true);
  }, [storageKey]);

  const login = useCallback(async (password: string): Promise<void> => {
    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password, role }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({})) as { error?: string };
      throw new Error(data.error ?? "비밀번호가 올바르지 않습니다");
    }
    const data = await res.json() as { token: string };
    sessionStorage.setItem(storageKey, data.token);
    setIsAuthenticated(true);
  }, [role, storageKey]);

  const logout = useCallback(() => {
    sessionStorage.removeItem(storageKey);
    setIsAuthenticated(false);
  }, [storageKey]);

  return { isAuthenticated, checked, login, logout };
}
