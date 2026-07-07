// 전체/출석/(결석)/출석률 요약 통계 바 — 잉크 색 점수판 스타일
// loading 중에는 가짜 0 대신 pulse 박스를 표시 (어두운 배경이라 bg-paper/20 사용)
// 숫자는 NumberFlow로 렌더 — 값이 바뀔 때(첫 로드, 출석 토글, 30초 폴링) 자릿수가 굴러가며 전환

'use client';

import { RollingNumber } from '@/components/common/RollingNumber';
import { Skeleton } from '@/components/common/Skeleton';

export interface SummaryBarProps {
  total: number;
  attended: number;
  showAbsent?: boolean;
  loading?: boolean;
  /** 플로팅(스크롤 고정) 표시용 축소 모드 — 패딩·글자 크기를 줄여 화면 점유를 최소화 */
  compact?: boolean;
}

export function SummaryBar({
  total,
  attended,
  showAbsent = false,
  loading = false,
  compact = false,
}: SummaryBarProps) {
  const rate = total === 0 ? 0 : Math.round((attended / total) * 100);

  const stats: { label: string; value: number; suffix?: string }[] = [
    { label: '전체', value: total },
    { label: '출석', value: attended },
    ...(showAbsent ? [{ label: '결석', value: total - attended }] : []),
    { label: '출석률', value: rate, suffix: '%' },
  ];

  return (
    <div className="flex divide-x divide-paper/15 overflow-hidden rounded-2xl bg-ink">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className={`flex flex-1 flex-col items-center gap-0.5 ${compact ? 'px-3 py-1.5' : 'px-4 py-4'}`}
        >
          <span className="font-display text-[0.65rem] tracking-[0.25em] text-paper/55">{stat.label}</span>
          {loading ? (
            <Skeleton className={`my-1 bg-paper/20 ${compact ? 'h-5 w-8' : 'h-6 w-10'}`} />
          ) : (
            <RollingNumber
              value={stat.value}
              suffix={stat.suffix}
              className={`font-display font-bold tabular-nums text-paper ${compact ? 'text-lg' : 'text-2xl'}`}
            />
          )}
        </div>
      ))}
    </div>
  );
}
