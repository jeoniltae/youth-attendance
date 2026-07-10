"use client";
// 생일자 조회 페이지 — 월/세션별 학년·교사·새친구 생일자 명단, 축제 테마 + 동적 배경

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
} from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Cake,
  ChevronLeft,
  ChevronRight,
  Gift,
  PartyPopper,
  Sparkles,
  Star,
} from "lucide-react";
import { RollingNumber } from "@/components/common/RollingNumber";
import { Skeleton } from "@/components/common/Skeleton";
import { PublicGate } from "@/components/common/PublicGate";
import { useBirthdays } from "@/hooks/useBirthdays";
import { useAuthGate } from "@/hooks/useAuthGate";
import { groupBirthdaysByMonth, type BirthdayGroup } from "@/lib/birthdays";
import { getTodayInSeoul } from "@/lib/date";
import type { Session } from "@/types";

const SESSIONS: Session[] = ["오전", "오후"];
const SESSION_LABEL: Record<Session, string> = {
  오전: "오전반",
  오후: "오후반",
};
const CONFETTI_COLORS = [
  "var(--celebrate)",
  "var(--gold)",
  "var(--stamp)",
  "var(--teal)",
];

const VARIANT_STYLE: Record<
  BirthdayGroup["variant"],
  { chip: string; label: string }
> = {
  grade: {
    chip: "border-ink/20 bg-paper text-ink",
    label: "border border-gold/30 bg-gold/15 text-gold",
  },
  teacher: {
    chip: "border-teal/30 bg-paper text-teal",
    label: "border border-teal/30 bg-teal/15 text-teal",
  },
  newFriend: {
    chip: "border-celebrate/30 bg-paper text-celebrate",
    label: "border border-celebrate/30 bg-celebrate/15 text-celebrate",
  },
};

function seededRandom(seed: number): number {
  let t = seed + 0x6d2b79f5;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

// 떠다니는 종이 색종이 — 사각형 조각이 좌우로 흔들리며 천천히 위로 떠오름
const AMBIENT_CONFETTI = Array.from({ length: 100 }, (_, i) => {
  const r1 = seededRandom(i * 17 + 1);
  const r2 = seededRandom(i * 17 + 2);
  const r3 = seededRandom(i * 17 + 3);
  const r4 = seededRandom(i * 17 + 4);
  const r5 = seededRandom(i * 17 + 5);
  return {
    left: r1 * 100,
    delay: r2 * 12,
    duration: 11 + r3 * 9,
    width: 5 + r4 * 5,
    height: 9 + r4 * 7,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    rotate: r5 * 360,
  };
});

// 월/세션 전환 시 선택 카드 정중앙에서 터지는 폭죽
const CARD_BURST_COUNT = 150;

function buildCardBurst(seed: number) {
  return Array.from({ length: CARD_BURST_COUNT }, (_, i) => {
    const r1 = seededRandom(seed * 1000 + i * 9 + 1);
    const r2 = seededRandom(seed * 1000 + i * 9 + 2);
    const r3 = seededRandom(seed * 1000 + i * 9 + 3);
    const r4 = seededRandom(seed * 1000 + i * 9 + 4);
    const angle = r1 * Math.PI * 2;
    const distance = 90 + r2 * 160;
    return {
      dx: Math.cos(angle) * distance,
      dy: Math.sin(angle) * distance,
      rot: (r3 - 0.5) * 720,
      delay: r4 * 80,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    };
  });
}

// 클릭/전환과 무관하게 배경 곳곳의 랜덤한 지점에서 주기적으로 터지는 폭죽
const AMBIENT_BURST_CLUSTERS = 30;
const AMBIENT_BURST_PIECES = 25;
const AMBIENT_BURST_INTERVAL_MS = 4000;

function buildAmbientBursts(seed: number) {
  return Array.from({ length: AMBIENT_BURST_CLUSTERS }, (_, c) => {
    const cr1 = seededRandom(seed * 3000 + c * 13 + 1);
    const cr2 = seededRandom(seed * 3000 + c * 13 + 2);
    const cr3 = seededRandom(seed * 3000 + c * 13 + 3);
    return {
      x: 6 + cr1 * 88, // 터지는 지점 가로 위치 (%)
      y: 6 + cr2 * 62, // 터지는 지점 세로 위치 (%)
      baseDelay: cr3 * 3500, // 주기 안에서 클러스터가 흩어져 터지도록 시차 분산
      pieces: Array.from({ length: AMBIENT_BURST_PIECES }, (_, i) => {
        const s = seed * 1000 + c * 100 + i * 9;
        const r1 = seededRandom(s + 1);
        const r2 = seededRandom(s + 2);
        const r3 = seededRandom(s + 3);
        const r4 = seededRandom(s + 4);
        const angle = r1 * Math.PI * 2;
        const distance = 90 + r2 * 160;
        return {
          dx: Math.cos(angle) * distance,
          dy: Math.sin(angle) * distance,
          rot: (r3 - 0.5) * 720,
          delay: r4 * 80,
          color: CONFETTI_COLORS[(c * AMBIENT_BURST_PIECES + i) % CONFETTI_COLORS.length],
        };
      }),
    };
  });
}

// 평소엔 잠잠하다가 일정 주기로 화면 위에서 쏟아지는 "깜짝 비" 이벤트 — 색깔 배지에 담긴 생일 아이콘
const RAIN_COUNT = 36;
const RAIN_INTERVAL_MS = 10000;
const RAIN_VISIBLE_MS = 8000;
const RAIN_ICONS = [Cake, Gift, Star, PartyPopper, Sparkles];

function buildRain(seed: number) {
  return Array.from({ length: RAIN_COUNT }, (_, i) => {
    const r1 = seededRandom(seed * 2000 + i * 11 + 1);
    const r2 = seededRandom(seed * 2000 + i * 11 + 2);
    const r3 = seededRandom(seed * 2000 + i * 11 + 3);
    const r4 = seededRandom(seed * 2000 + i * 11 + 4);
    const r5 = seededRandom(seed * 2000 + i * 11 + 5);
    return {
      left: r1 * 100,
      delay: r2 * 1.6,
      duration: 3.2 + r3 * 1.6,
      size: 24 + r4 * 14,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      rotate: r5 * 360,
      Icon: RAIN_ICONS[i % RAIN_ICONS.length],
    };
  });
}

export default function BirthdayPage() {
  const today = getTodayInSeoul();
  const [month, setMonth] = useState(() => today.getMonth() + 1);
  const [session, setSession] = useState<Session>("오전");
  const [parallax, setParallax] = useState({ x: 0, y: 0 });
  const [spotlight, setSpotlight] = useState<{ x: number; y: number } | null>(
    null,
  );
  const [burstSeed, setBurstSeed] = useState(0);
  const isFirstChange = useRef(true);

  useEffect(() => {
    if (isFirstChange.current) {
      isFirstChange.current = false;
      return;
    }
    setBurstSeed((s) => s + 1);
  }, [month, session]);

  const cardBurstPieces = useMemo(
    () => (burstSeed > 0 ? buildCardBurst(burstSeed) : []),
    [burstSeed],
  );

  // 배경 폭죽 — 클릭/전환 없이도 주기적으로 새 랜덤 위치에서 자동 반복
  const [ambientBurstSeed, setAmbientBurstSeed] = useState(1);

  useEffect(() => {
    const interval = setInterval(
      () => setAmbientBurstSeed((s) => s + 1),
      AMBIENT_BURST_INTERVAL_MS,
    );
    return () => clearInterval(interval);
  }, []);

  const ambientBurstClusters = useMemo(
    () => buildAmbientBursts(ambientBurstSeed),
    [ambientBurstSeed],
  );

  const [rainSeed, setRainSeed] = useState(0);
  const [showRain, setShowRain] = useState(false);

  useEffect(() => {
    let hideTimer: ReturnType<typeof setTimeout> | undefined;
    function triggerRain() {
      clearTimeout(hideTimer);
      setRainSeed((s) => s + 1);
      setShowRain(true);
      hideTimer = setTimeout(() => setShowRain(false), RAIN_VISIBLE_MS);
    }
    const firstTimer = setTimeout(triggerRain, 3000);
    const interval = setInterval(triggerRain, RAIN_INTERVAL_MS);
    return () => {
      clearTimeout(firstTimer);
      clearTimeout(hideTimer);
      clearInterval(interval);
    };
  }, []);

  const rainPieces = useMemo(
    () => (showRain ? buildRain(rainSeed) : []),
    [rainSeed, showRain],
  );

  // 단일 인스턴스만 유지 — PublicGate에도 이 값을 그대로 props로 넘겨서
  // 로그인 직후 데이터 훅의 enabled가 함께 갱신되도록 한다 (별도 호출 금지)
  const sessionAuth = useAuthGate("session");
  const { data, isLoading, isError } = useBirthdays(session, sessionAuth.isAuthenticated);

  const groups = useMemo(
    () => groupBirthdaysByMonth(data?.students ?? [], data?.teachers ?? [], month),
    [data, month],
  );

  const teacherCount =
    groups.find((g) => g.variant === "teacher")?.people.length ?? 0;
  const studentCount = groups.reduce(
    (sum, g) => sum + (g.variant === "teacher" ? 0 : g.people.length),
    0,
  );
  const total = studentCount + teacherCount;
  const todayMonth = today.getMonth() + 1;
  const todayDay = today.getDate();

  function handleMouseMove(e: MouseEvent<HTMLDivElement>) {
    const x = (e.clientX / window.innerWidth - 0.5) * 2;
    const y = (e.clientY / window.innerHeight - 0.5) * 2;
    setParallax({ x, y });
    setSpotlight({ x: e.clientX, y: e.clientY + window.scrollY });
  }

  return (
    <PublicGate
      isAuthenticated={sessionAuth.isAuthenticated}
      checked={sessionAuth.checked}
      login={sessionAuth.login}
    >
    <div
      onMouseMove={handleMouseMove}
      className="relative min-h-screen overflow-hidden"
    >
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div
          className="absolute -top-24 -left-20 transition-transform duration-700 ease-out"
          style={{
            transform: `translate(${parallax.x * 26}px, ${parallax.y * 20}px)`,
          }}
        >
          <div className="size-72 rounded-full bg-celebrate/25 blur-3xl [animation:blob-breathe_7s_ease-in-out_infinite]" />
        </div>
        <div
          className="absolute top-40 right-0 transition-transform duration-700 ease-out"
          style={{
            transform: `translate(${parallax.x * -22}px, ${parallax.y * 14}px)`,
          }}
        >
          <div className="size-80 rounded-full bg-gold/20 blur-3xl [animation:blob-breathe_8.5s_ease-in-out_infinite_1.2s]" />
        </div>
        <div
          className="absolute bottom-0 left-1/3 transition-transform duration-700 ease-out"
          style={{
            transform: `translate(${parallax.x * 16}px, ${parallax.y * -18}px)`,
          }}
        >
          <div className="size-64 rounded-full bg-stamp/15 blur-3xl [animation:blob-breathe_6.5s_ease-in-out_infinite_2.4s]" />
        </div>

        {spotlight && (
          <div
            className="absolute size-[420px] rounded-full opacity-70 transition-[left,top] duration-300 ease-out"
            style={{
              left: spotlight.x,
              top: spotlight.y,
              transform: "translate(-50%, -50%)",
              background:
                "radial-gradient(circle, color-mix(in oklch, var(--celebrate) 28%, transparent) 0%, transparent 70%)",
            }}
          />
        )}

        {AMBIENT_CONFETTI.map((c, i) => (
          <span
            key={i}
            className="absolute select-none rounded-[2px]"
            style={{
              left: `${c.left}%`,
              bottom: "-6%",
              width: `${c.width}px`,
              height: `${c.height}px`,
              backgroundColor: c.color,
              opacity: 0.75,
              transform: `rotate(${c.rotate}deg)`,
              animation: `confetti-rise ${c.duration}s linear ${c.delay}s infinite`,
            }}
          />
        ))}

        {rainPieces.map((r, i) => (
          <span
            key={`${rainSeed}-${i}`}
            className="absolute flex select-none items-center justify-center rounded-full shadow-[0_2px_6px_rgba(30,34,51,0.18)]"
            style={{
              left: `${r.left}%`,
              top: "-10%",
              width: `${r.size}px`,
              height: `${r.size}px`,
              backgroundColor: r.color,
              transform: `rotate(${r.rotate}deg)`,
              animation: `confetti-rain ${r.duration}s ease-in ${r.delay}s 1 forwards`,
            }}
          >
            <r.Icon
              style={{ color: "var(--paper)" }}
              size={r.size * 0.58}
              strokeWidth={2.2}
            />
          </span>
        ))}

        {/* 배경 곳곳에서 주기적으로 자동 반복되는 폭죽 */}
        {ambientBurstClusters.map((cluster, ci) => (
          <div
            key={`${ambientBurstSeed}-${ci}`}
            className="absolute"
            style={{ left: `${cluster.x}%`, top: `${cluster.y}%` }}
          >
            {cluster.pieces.map((b, i) => (
              <span
                key={i}
                className="absolute size-2 rounded-[2px]"
                style={
                  {
                    backgroundColor: b.color,
                    // 클러스터 시차 대기 중에는 숨김 — 키프레임 0%(opacity 1)가 시작되면 나타남
                    opacity: 0,
                    "--burst-dx": `${b.dx}px`,
                    "--burst-dy": `${b.dy}px`,
                    "--burst-rot": `${b.rot}deg`,
                    animation: `confetti-burst 850ms ease-out ${cluster.baseDelay + b.delay}ms forwards`,
                  } as CSSProperties
                }
              />
            ))}
          </div>
        ))}
      </div>

      <main className="relative z-10 mx-auto flex w-full max-w-[1368px] flex-col gap-4 px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 animate-[rise-in_0.5s_ease-out_both]">
          <Link
            href="/"
            className="flex items-center gap-1.5 justify-self-start rounded-full bg-ink px-3.5 py-2 text-sm font-semibold whitespace-nowrap text-paper hover:bg-ink/85"
          >
            <ArrowLeft className="size-3.5" />
            출석체크
          </Link>
          <div className="text-center">
            <span className="inline-block text-4xl [animation:bounce-soft_2.2s_ease-in-out_infinite]">
              🎂
            </span>
            <h1 className="font-display text-3xl font-bold text-celebrate">
              이번 달, 누구 생일?😎🎉
            </h1>
          </div>
          <div />
        </div>

        <div
          className="relative flex flex-col overflow-hidden rounded-2xl border-[1.5px] border-celebrate/20 bg-paper-deep shadow-[0_2px_0_rgba(30,34,51,0.08)] sm:flex-row animate-[rise-in_0.5s_ease-out_both]"
          style={{ animationDelay: "70ms" }}
        >
          {cardBurstPieces.length > 0 && (
            <div className="pointer-events-none absolute left-1/2 top-1/2 z-20">
              {cardBurstPieces.map((b, i) => (
                <span
                  key={`${burstSeed}-${i}`}
                  className="absolute size-2 rounded-[2px]"
                  style={
                    {
                      backgroundColor: b.color,
                      opacity: 0,
                      "--burst-dx": `${b.dx}px`,
                      "--burst-dy": `${b.dy}px`,
                      "--burst-rot": `${b.rot}deg`,
                      animation: `confetti-burst 850ms ease-out ${b.delay}ms forwards`,
                    } as CSSProperties
                  }
                />
              ))}
            </div>
          )}

          <div className="flex flex-1 items-center justify-center gap-3 px-4 py-3">
            <button
              type="button"
              onClick={() => setMonth((m) => (m === 1 ? 12 : m - 1))}
              aria-label="이전 달"
              className="flex size-8 items-center justify-center rounded-full border border-celebrate/25 text-celebrate/70 hover:border-celebrate/50 hover:text-celebrate"
            >
              <ChevronLeft className="size-4" />
            </button>
            <span className="font-display text-xl font-bold text-ink">
              {month}월
            </span>
            <button
              type="button"
              onClick={() => setMonth((m) => (m === 12 ? 1 : m + 1))}
              aria-label="다음 달"
              className="flex size-8 items-center justify-center rounded-full border border-celebrate/25 text-celebrate/70 hover:border-celebrate/50 hover:text-celebrate"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
          <div className="h-px w-full shrink-0 bg-[repeating-linear-gradient(to_right,var(--ink)_0,var(--ink)_4px,transparent_4px,transparent_9px)] opacity-20 sm:h-auto sm:w-px sm:self-stretch sm:bg-[repeating-linear-gradient(to_bottom,var(--ink)_0,var(--ink)_4px,transparent_4px,transparent_9px)]" />
          <div className="flex flex-1 items-center justify-center px-4 py-3">
            <div className="flex flex-1 max-w-72 gap-1.5">
              {SESSIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSession(s)}
                  className={
                    s === session
                      ? "flex-1 rounded-full bg-celebrate px-4 py-1.5 text-sm font-semibold text-paper"
                      : "flex-1 rounded-full border border-celebrate/25 px-4 py-1.5 text-sm font-medium text-ink/60 hover:border-celebrate/50 hover:text-ink"
                  }
                >
                  {SESSION_LABEL[s]}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div
          className="flex divide-x divide-paper/15 overflow-hidden rounded-2xl bg-ink animate-[rise-in_0.5s_ease-out_both]"
          style={{ animationDelay: "140ms" }}
        >
          {[
            { label: "학생", value: studentCount },
            { label: "선생님", value: teacherCount },
            { label: "전체", value: total },
          ].map((stat) => (
            <div
              key={stat.label}
              className="flex flex-1 flex-col items-center gap-0.5 px-4 py-4"
            >
              <span className="font-display text-[0.65rem] tracking-[0.25em] text-paper/55">
                {stat.label}
              </span>
              {isLoading ? (
                <Skeleton className="my-1 h-6 w-10 bg-paper/20" />
              ) : (
                <RollingNumber
                  value={stat.value}
                  className="font-display text-2xl font-bold tabular-nums text-paper"
                />
              )}
            </div>
          ))}
        </div>

        <div
          className="ticket-notch relative rounded-2xl border-[1.5px] border-ink/12 bg-paper p-5 shadow-[0_3px_0_rgba(30,34,51,0.06)] animate-[rise-in_0.5s_ease-out_both] sm:p-7"
          style={{
            animationDelay: "210ms",
            backgroundImage: [
              "radial-gradient(circle at 1px 1px, color-mix(in oklch, var(--ink) 14%, transparent) 1px, transparent 0)",
              "radial-gradient(circle at 50% 0%, color-mix(in oklch, var(--celebrate) 20%, transparent) 0%, transparent 42%)",
              "linear-gradient(135deg, color-mix(in oklch, var(--celebrate) 7%, transparent), color-mix(in oklch, var(--gold) 7%, transparent))",
            ].join(", "),
            backgroundSize: "16px 16px, 100% 100%, 100% 100%",
            backgroundRepeat: "repeat, no-repeat, no-repeat",
          }}
        >
          <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-2xl">
            🎀
          </span>

          {isLoading ? (
            <div className="flex flex-col gap-6">
              {[0, 1].map((group) => (
                <div key={group}>
                  <Skeleton className="h-7 w-16 rounded-full" />
                  <div className="mt-3 flex flex-wrap gap-2">
                    {["w-24", "w-20", "w-28", "w-20", "w-24"].map((width, i) => (
                      <Skeleton key={i} className={`h-9 rounded-full ${width}`} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : isError ? (
            <p className="py-12 text-center text-ink/40">
              생일자 명단을 불러오지 못했습니다
            </p>
          ) : groups.length === 0 ? (
            <p className="py-12 text-center text-ink/40">
              이번 달은 생일자가 없어요 🎈
            </p>
          ) : (
            <div className="flex flex-col gap-6">
              {groups.map((group, gi) => (
                <div key={group.key}>
                  <span
                    className={`inline-block rounded-full px-3 py-1 text-sm font-semibold ${VARIANT_STYLE[group.variant].label}`}
                  >
                    {group.label}
                  </span>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {group.people.map((p, pi) => {
                      const isToday =
                        p.birthMonth === todayMonth && p.birthDay === todayDay;
                      return (
                        <span
                          key={p.id}
                          className={`flex items-center gap-1.5 rounded-full border-[1.5px] px-3 py-1.5 text-sm font-medium [animation:birthday-pop_0.4s_ease-out_both] ${VARIANT_STYLE[group.variant].chip} ${isToday ? "[animation:birthday-pop_0.4s_ease-out_both,today-glow_1.8s_ease-in-out_infinite]" : ""}`}
                          style={{ animationDelay: `${gi * 90 + pi * 45}ms` }}
                        >
                          {p.meta && (
                            <span className="text-xs text-ink/40">
                              {p.meta}
                            </span>
                          )}
                          {p.name}
                          <span className="text-xs text-ink/30">
                            {p.birthMonth}/{p.birthDay}
                          </span>
                          {isToday && (
                            <span className="rounded-full bg-celebrate px-1.5 text-[0.65rem] font-semibold text-paper">
                              오늘!
                            </span>
                          )}
                        </span>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
    </PublicGate>
  );
}
