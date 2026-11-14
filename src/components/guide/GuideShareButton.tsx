"use client";
// 사용 안내 절·작은 주제 링크 공유 버튼 — 휴대폰은 공유 시트(카톡 등), 공유 시트가 없는 PC는 클립보드 복사
//
// 문구는 📖 머리말 · ✅ 제목 · (절 설명) · 빈 줄 · 🔒 비밀번호 안내 · 👉 링크. 카톡에서 줄바꿈 하나가 공백으로
// 붙어 보일 때가 있어, 이모지로 줄의 경계를 표시하고 빈 줄로 링크 묶음을 나눈다.
// 링크를 마지막 줄에 둬야 카톡이 그 주소로 미리보기 카드를 만든다.
// share()에 url을 따로 넘기지 않는다 — 문구에 링크가 이미 있어 앱에 따라 링크가 두 번 붙는다.
// 주소의 #id는 사용 안내 페이지가 읽어 그 절을 펼친다(비밀번호를 통과한 뒤에도 유지된다).

import { useEffect, useState } from "react";
import { Check, Link2 } from "lucide-react";
import { cn } from "@/lib/utils";

// 시상 명단 복사와 같은 시간 — 성공 표시는 잠깐만
const COPIED_MS = 2000;

// 절 설명은 절에만 있다 — 작은 주제는 설명 줄 없이 보낸다(부모 절 설명은 그 주제와 어긋날 수 있어 쓰지 않음)
function shareText(label: string, id: string, description?: string) {
  return [
    "📖 [고등부 출석부 사용 안내]",
    `✅ ${label}`,
    ...(description ? [description] : []),
    "",
    "🔒 교사 비밀번호로 들어가요",
    `👉 ${window.location.origin}/guide#${id}`,
  ].join("\n");
}

export function GuideShareButton({ id, label, description }: { id: string; label: string; description?: string }) {
  const [result, setResult] = useState<"copied" | "failed" | null>(null);

  // 성공 표시는 2초 뒤 지우고, 실패 문구는 다시 누를 때까지 남긴다
  useEffect(() => {
    if (result !== "copied") return;
    const timer = setTimeout(() => setResult(null), COPIED_MS);
    return () => clearTimeout(timer);
  }, [result]);

  async function share() {
    setResult(null);
    const text = shareText(label, id, description);
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ text });
        return;
      } catch (e) {
        // 공유 시트를 닫은 것은 오류가 아니다. 그 밖의 실패(권한 등)는 복사로 넘어간다
        if (e instanceof DOMException && e.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(text);
      setResult("copied");
    } catch {
      setResult("failed");
    }
  }

  const message = result === "copied" ? "링크 복사됨" : result === "failed" ? "복사하지 못했어요" : "";

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={share}
        aria-label={`${label} 링크 공유`}
        className="grid size-11 place-items-center rounded-full text-ink/50 hover:bg-ink/6 hover:text-ink"
      >
        {result === "copied" ? (
          <Check aria-hidden className="size-5 text-teal" strokeWidth={3} />
        ) : (
          <Link2 aria-hidden className="size-5" />
        )}
      </button>
      {/* 버튼 안에 글자를 넣으면 좁은 화면에서 제목이 밀린다 — 버튼 왼쪽에 띄운다.
          위에 띄우면 칩 줄로 이동한 직후(머리가 고정 칩 줄 바로 아래)에 칩 줄(z-20) 뒤로 가려진다 */}
      {message ? (
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute top-1/2 right-full z-10 mr-1 -translate-y-1/2 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap text-paper",
            result === "copied" ? "bg-ink" : "bg-stamp",
          )}
        >
          {message}
        </span>
      ) : null}
      <span role="status" className="sr-only">
        {message}
      </span>
    </div>
  );
}
