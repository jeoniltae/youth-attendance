// 비밀번호 게이트 인증 훅 — role별로 sessionStorage 키와 검증 대상 비밀번호를 분리한다.
// admin: /members(학생·교사 데이터 수정) / session: 공개 4화면(/, /history, /birthday, /registry)

import { useState, useEffect, useCallback } from "react";

export type AuthRole = "admin" | "session";

const STORAGE_KEY_BY_ROLE: Record<AuthRole, string> = {
  admin: "admin_token",
  session: "session_token",
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
