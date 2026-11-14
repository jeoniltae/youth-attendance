"use client";
// 사용 안내 한 단계 — 번호 + 제목 + 설명 + 완성 캡처(휴대폰 틀·빨간 네모가 이미 합성된 이미지)
// 캡처는 guide/ 작업 폴더에서 만들어 public/guide/로 복사한 것만 쓴다. 모바일은 위아래, md 이상은 좌우 배치.
// 캡처를 받는 동안은 같은 크기의 휴대폰 모양 스켈레톤을 깔고, 다 받으면 서서히 보인다(onLoad 때문에 클라이언트 컴포넌트).
// next/image는 이미 받아 둔(캐시) 이미지도 마운트 때 onLoad를 불러 주므로 스켈레톤이 남지 않는다.
import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

// guide/pages/compose.mjs 출력 크기 (뷰포트 390×844 × 2배 + 휴대폰 틀) — 모든 장면이 같다
const SHOT_WIDTH = 628;
const SHOT_HEIGHT = 1326;

interface GuideStepProps {
  n: number;
  title: React.ReactNode;
  /** public/guide/<shot>.png — 없으면 글만 */
  shot?: string;
  alt?: string;
  /** 되돌릴 수 없는 작업(삭제 등)의 단계는 번호를 stamp 색으로 */
  danger?: boolean;
  children?: React.ReactNode;
}

export function GuideStep({ n, title, shot, alt = "", danger = false, children }: GuideStepProps) {
  const [loaded, setLoaded] = useState(false);

  return (
    <li className="grid gap-5 border-b border-ink/12 py-7 last:border-b-0 md:grid-cols-[minmax(0,1fr)_300px] md:items-center md:gap-10">
      <div className="grid min-w-0 content-start gap-2.5">
        <div
          className={cn(
            "grid size-11 place-items-center rounded-full font-display text-xl font-bold text-paper",
            danger ? "bg-stamp" : "bg-ink",
          )}
        >
          {n}
        </div>
        <h3 className="text-lg leading-snug font-bold text-ink [&_em]:not-italic [&_em]:text-stamp">{title}</h3>
        {children ? <div className="grid gap-2 text-ink/80 [&_.hint]:text-sm [&_.hint]:text-ink/55">{children}</div> : null}
      </div>
      {shot ? (
        // 캡처 모서리(휴대폰 틀)에 맞춘 둥근 상자 — 이미지 크기가 고정이라 받기 전후 높이가 같다
        <div
          data-loading={loaded ? undefined : ""}
          className={cn(
            "w-full max-w-75 justify-self-center rounded-2xl",
            !loaded && "animate-pulse bg-ink/8 motion-reduce:animate-none",
          )}
        >
          <Image
            src={`/guide/${shot}.png`}
            alt={alt}
            width={SHOT_WIDTH}
            height={SHOT_HEIGHT}
            sizes="300px"
            onLoad={() => setLoaded(true)}
            className={cn(
              "w-full transition-opacity duration-300 motion-reduce:transition-none",
              loaded ? "opacity-100" : "opacity-0",
            )}
          />
        </div>
      ) : null}
    </li>
  );
}

/** 단계 목록 래퍼 — 번호는 GuideStep의 n으로 직접 매긴다 */
export function GuideSteps({ children }: { children: React.ReactNode }) {
  return <ol className="grid">{children}</ol>;
}
