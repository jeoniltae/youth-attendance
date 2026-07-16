"use client";
// 비밀번호 입력 모달 — /members(관리자) + 공개 4화면(교사) 공용 인증 게이트

import { useState } from "react";
import { Lock } from "lucide-react";

interface AuthGateModalProps {
  title: string;
  /** 줄바꿈이 필요하면 "\n"으로 구분 */
  description: string;
  onLogin: (password: string) => Promise<void>;
  /** 없으면 취소 버튼을 렌더링하지 않음 — 공개 화면은 돌아갈 곳이 마땅치 않으므로 생략 */
  onCancel?: () => void;
}

export function AuthGateModal({ title, description, onLogin, onCancel }: AuthGateModalProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isPending, setIsPending] = useState(false);
  // 비밀번호 오류 시 모달을 흔든다. 애니메이션이 끝나면 false로 되돌려야
  // 연속으로 틀렸을 때도 매번 다시 재생된다.
  const [shake, setShake] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!password || isPending) return;
    setError("");
    setIsPending(true);
    try {
      await onLogin(password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "오류가 발생했습니다");
      setShake(true);
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/20 backdrop-blur-sm">
      <div
        // animationend는 버블링되므로 카드 자신의 애니메이션일 때만 초기화
        onAnimationEnd={(e) => {
          if (e.target === e.currentTarget) setShake(false);
        }}
        className={`mx-4 w-full max-w-sm rounded-2xl border-[1.5px] border-ink/15 bg-paper p-6 shadow-xl ${
          shake ? "animate-[shake_0.4s_ease-in-out] motion-reduce:animate-none" : ""
        }`}
      >
        <div className="mb-5 flex flex-col items-center gap-2">
          <div className="flex size-12 items-center justify-center rounded-full bg-ink/5">
            <Lock className="size-5 text-ink/50" />
          </div>
          <h2 className="font-display text-lg font-bold text-ink">{title}</h2>
          <p className="text-center text-sm text-ink/50">
            {description.split("\n").map((line, i) => (
              <span key={i}>
                {i > 0 && <br />}
                {line}
              </span>
            ))}
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
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 rounded-full border border-ink/20 py-2.5 text-sm font-medium text-ink/60 hover:border-ink/40 hover:text-ink"
              >
                취소
              </button>
            )}
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
