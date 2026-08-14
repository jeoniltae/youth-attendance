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
  /**
   * 숫자 아래 얇은 설명 줄. 기간 조회에서 "6주 평균"처럼 숫자의 기준을 밝혀
   * 평균 인원이 하루 수치로 오독되는 것을 막는다.
   * compact(플로팅 바)에서도 표시한다 — 스크롤한 상태에서 오히려 기준을 잊기 쉽다.
   */
  caption?: string;
}

export function SummaryBar({
  total,
  attended,
  showAbsent = false,
  loading = false,
  compact = false,
  caption,
}: SummaryBarProps) {
  const rate = total === 0 ? 0 : Math.round((attended / total) * 100);

  const stats: { label: string; value: number; suffix?: string }[] = [
    { label: '전체', value: total },
    { label: '출석', value: attended },
    ...(showAbsent ? [{ label: '결석', value: total - attended }] : []),
    { label: '출석률', value: rate, suffix: '%' },
  ];

  const showCaption = !!caption;

  return (
    <div className="overflow-hidden rounded-2xl bg-ink">
    <div className="flex divide-x divide-paper/15">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className={`flex flex-1 flex-col items-center gap-0.5 ${compact ? 'px-3 py-1.5' : 'px-4 py-4'}`}
        >
          <span className="font-display text-[14px] tracking-[0.25em] text-paper/55">{stat.label}</span>
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
    {/*
      크기는 PC/모바일 공통 14px 고정(항목 라벨과 동일 — 라벨은 compact에서도 14px이다),
      색은 paper 최대 불투명도. 잉크 배경 위에서 gold(2.97:1)·teal(2.92:1)·stamp(4.08:1)
      같은 강조색은 전부 WCAG AA(4.5:1)에 못 미쳐서, 대비가 확보되는 paper 계열로 간다 — 12.4:1.
      compact에서는 세로 여백만 줄여 플로팅 바가 화면을 덜 차지하게 한다.
    */}
    {showCaption && (
      <p
        className={`border-t border-paper/15 bg-paper/8 px-4 text-center font-display text-[14px] font-semibold tracking-[0.15em] text-paper ${
          compact ? 'py-0.5' : 'py-1.5'
        }`}
      >
        {caption}
      </p>
    )}
    </div>
  );
}
