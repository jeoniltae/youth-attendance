"use client";
// 비밀번호 입력 모달 — /members 페이지 인증 게이트

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";

interface AdminModalProps {
  onLogin: (password: string) => Promise<void>;
}

export function AdminModal({ onLogin }: AdminModalProps) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!password || isPending) return;
    setError("");
    setIsPending(true);
    try {
      await onLogin(password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "오류가 발생했습니다");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/20 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-sm rounded-2xl border-[1.5px] border-ink/15 bg-paper p-6 shadow-xl">
        <div className="mb-5 flex flex-col items-center gap-2">
          <div className="flex size-12 items-center justify-center rounded-full bg-ink/5">
            <Lock className="size-5 text-ink/50" />
          </div>
          <h2 className="font-display text-lg font-bold text-ink">관리자 인증</h2>
          <p className="text-center text-sm text-ink/50">
            학생·교사 관리 기능은
            <br />
            관리자만 이용할 수 있습니다
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="비밀번호를 입력하세요"
            autoFocus
            className="rounded-lg border border-ink/15 bg-paper-deep px-4 py-2.5 text-sm text-ink outline-none focus:border-ink/40"
          />
          {error && <p className="text-xs text-celebrate">{error}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 rounded-full border border-ink/20 py-2.5 text-sm font-medium text-ink/60 hover:border-ink/40 hover:text-ink"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isPending || !password}
              className="flex-1 rounded-full bg-ink py-2.5 text-sm font-semibold text-paper hover:bg-ink/85 disabled:opacity-40"
            >
              {isPending ? "확인 중…" : "입장"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
