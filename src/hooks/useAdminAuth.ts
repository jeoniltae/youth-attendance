import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "admin_token";

export function useAdminAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    setIsAuthenticated(!!sessionStorage.getItem(STORAGE_KEY));
    setChecked(true);
  }, []);

  const login = useCallback(async (password: string): Promise<void> => {
    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({})) as { error?: string };
      throw new Error(data.error ?? "비밀번호가 올바르지 않습니다");
    }
    const data = await res.json() as { token: string };
    sessionStorage.setItem(STORAGE_KEY, data.token);
    setIsAuthenticated(true);
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEY);
    setIsAuthenticated(false);
  }, []);

  return { isAuthenticated, checked, login, logout };
}
