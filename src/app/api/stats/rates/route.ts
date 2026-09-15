// 전체 인원 출석 집계 일괄 계산 — 교적부(/registry)·교사 현황(/teachers) 컬럼용.
// /api/stats/member와 동일한 기준(세션 무관, 날짜 Set으로 하루 1회)을 Attendance 시트
// 1회 읽기로 전 인원에 적용한다(개별 호출 N번 방지).
//
// 반환하는 집계는 세 가지 — 분모(total)를 잡는 방식이 서로 다르다.
//   · 최근 1년 출석률(rates)  : 오늘 기준 1년 롤링 윈도. 분모는 '실제로 예배가 있던 날 수'
//                               (= 출석 기록이 하나라도 있는 날짜 수).
//   · 올해 상반기(firstHalf)  : 1~6월. 분모는 그 구간의 '일요일 총 수'(고정)
//   · 올해 하반기(secondHalf) : 7~12월. 분모는 그 구간의 '일요일 총 수'(고정)
//
// 반기 분모를 기록 기반이 아니라 달력 기반으로 잡는 이유:
// 기록 기반이면 주가 지날 때마다 분모가 11 → 12 → 13처럼 늘어나서, 같은 사람의
// "8/11"이 다음 주에 "8/12"가 된다. 교적부는 반기 전체를 놓고 보는 화면이라
// 분모가 반기 내내 고정돼 있어야 읽힌다(이미 지난 주와 남은 주를 함께 본다).
// 이 앱은 일요일에만 출석을 체크하므로(수련회·특별예배는 사용하지 않음, 운영 방침)
// 일요일 수가 곧 그 반기의 예배 횟수다.
//
// 반기는 '올해'로 고정한다 — 이 앱은 1년 단위로 시트를 새로 만들어 운영하므로
// (docs/yearly-sheet-operation.md) 시트 내용이 곧 올해 기록이다.

import { NextResponse } from 'next/server';
import { readSheet, SHEET } from '@/lib/sheets';

type Row = Record<string, string>;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * from~to(양끝 포함) 구간의 일요일 수. 반기 컬럼의 분모로 쓴다.
 * 날짜 문자열을 UTC로 고정해 다루므로 서버 타임존에 영향받지 않는다.
 */
function countSundays(from: string, to: string): number {
  const cursor = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T00:00:00Z`);

  // 구간의 첫 일요일로 이동 (getUTCDay: 0=일요일)
  cursor.setUTCDate(cursor.getUTCDate() + ((7 - cursor.getUTCDay()) % 7));
  if (cursor > end) return 0;

  return Math.floor((end.getTime() - cursor.getTime()) / (7 * DAY_MS)) + 1;
}

/**
 * 기간 내 인원별 출석 '날짜 수'를 센다.
 * 같은 날 중복 행이 있어도 Set이라 1회로 센다.
 * 기록이 없는 인원은 키가 없으므로 클라이언트에서 0으로 간주한다.
 */
function countByMember(rows: Row[], from: string, to: string): Record<string, number> {
  const datesById = new Map<string, Set<string>>();

  for (const r of rows) {
    if (r.Status !== '출석' || r.Date < from || r.Date > to) continue;
    if (!r.StudentID) continue;
    let set = datesById.get(r.StudentID);
    if (!set) datesById.set(r.StudentID, (set = new Set()));
    set.add(r.Date);
  }

  const counts: Record<string, number> = {};
  for (const [id, dates] of datesById) counts[id] = dates.size;
  return counts;
}

/** 기록이 하나라도 있는 날짜 수 — 1년 출석률의 분모(실제 예배일) */
function countServiceDays(rows: Row[], from: string, to: string): number {
  const dates = new Set<string>();
  for (const r of rows) {
    if (r.Status !== '출석' || r.Date < from || r.Date > to) continue;
    dates.add(r.Date);
  }
  return dates.size;
}

export async function GET() {
  try {
    // 한국 시간(UTC+9) 기준 오늘 ~ 1년 전
    const nowKST = new Date(Date.now() + 9 * 60 * 60 * 1000);
    const nowStr = nowKST.toISOString().slice(0, 10);
    const yearAgoKST = new Date(nowKST);
    yearAgoKST.setUTCFullYear(nowKST.getUTCFullYear() - 1);
    const yearAgoStr = yearAgoKST.toISOString().slice(0, 10);
    const year = nowKST.getUTCFullYear();

    const attendance = await readSheet(SHEET.ATTENDANCE);

    const total1y = countServiceDays(attendance, yearAgoStr, nowStr);
    const counts1y = countByMember(attendance, yearAgoStr, nowStr);

    const h1From = `${year}-01-01`;
    const h1To = `${year}-06-30`;
    const h2From = `${year}-07-01`;
    const h2To = `${year}-12-31`;

    const firstHalf = {
      total: countSundays(h1From, h1To),
      counts: countByMember(attendance, h1From, h1To),
    };
    const secondHalf = {
      total: countSundays(h2From, h2To),
      counts: countByMember(attendance, h2From, h2To),
    };

    // id → 출석률(정수 %). 출석 기록 없는 인원은 응답에 없으므로 클라이언트에서 0%로 간주
    const rates: Record<string, number> = {};
    if (total1y > 0) {
      for (const [id, count] of Object.entries(counts1y)) {
        rates[id] = Math.round((count / total1y) * 100);
      }
    }

    return NextResponse.json({ total1y, rates, firstHalf, secondHalf });
  } catch (error) {
    console.error('[api/stats/rates][GET]', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 });
  }
}
