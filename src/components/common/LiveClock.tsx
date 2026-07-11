"use client";
// 현재 시각(24시간제 HH:MM:SS)을 초 단위로 보여주는 롤링 시계 — NumberFlow 자릿수 애니메이션.
// Header 전체가 매초 재렌더되지 않도록 시계 상태를 이 컴포넌트 안에 격리한다.

import { useEffect, useState } from "react";
import NumberFlow, { NumberFlowGroup } from "@number-flow/react";
import { getTodayInSeoul } from "@/lib/date";

const TWO_DIGITS = { minimumIntegerDigits: 2 } as const;
// 매초 갱신되므로 다음 틱 전에 끝나도록 기본값보다 짧게
const TIMING: EffectTiming = { duration: 300, easing: "ease-out" };

export function LiveClock({ className }: { className?: string }) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(getTodayInSeoul());
    const id = setInterval(() => setNow(getTodayInSeoul()), 1000);
    return () => clearInterval(id);
  }, []);

  // 서버 렌더 시각과 달라 hydration 불일치가 나므로 마운트 후부터 표시
  if (!now) return null;

  const units = [now.getHours(), now.getMinutes(), now.getSeconds()];

  return (
    <span className={`inline-flex items-baseline tabular-nums ${className ?? ""}`}>
      <NumberFlowGroup>
        {units.map((value, i) => (
          <span key={i} className="inline-flex items-baseline">
            {i > 0 && <span>:</span>}
            <NumberFlow
              value={value}
              format={TWO_DIGITS}
              trend={1} // 59→00 순간에도 역방향(아래로)으로 굴러가지 않도록 항상 증가 방향 고정
              transformTiming={TIMING}
              spinTiming={TIMING}
            />
          </span>
        ))}
      </NumberFlowGroup>
    </span>
  );
}
