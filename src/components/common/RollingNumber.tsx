// 자릿수가 굴러가는 숫자 (NumberFlow 래퍼) — 점수판류 숫자 표시 공용
// 마운트 직후 0 → 실제 값으로 갱신해 첫 로드에서도 카운팅이 재생되게 함
// (NumberFlow는 마운트 이후의 값 변화에만 애니메이션을 적용하므로)

'use client';

import { useEffect, useState } from 'react';
import NumberFlow from '@number-flow/react';

interface RollingNumberProps {
  value: number;
  suffix?: string;
  className?: string;
}

export function RollingNumber({ value, suffix, className }: RollingNumberProps) {
  const [display, setDisplay] = useState(0);
  useEffect(() => setDisplay(value), [value]);

  return <NumberFlow value={display} suffix={suffix} className={className} />;
}
