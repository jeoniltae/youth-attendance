"use client";
// 사용 안내 페이지 — 출석 체크·확인, 출석현황, 생일자, 학생 관리(등록·교사 현황) 사용법을 캡처와 함께 안내
//
// 캡처는 guide/ 작업 폴더에서 가짜 데이터로 만들어 public/guide/로 복사한 완성본만 쓴다(guide/README.md).
// 교사용(session) 게이트 뒤에 두고, 게이트 통과 전에는 본문을 아예 그리지 않는다(CLAUDE.md 인증 구조 ⚠️).
//
// 단계가 36개라 모두 펼치면 스크롤이 지나치게 길다 → 절·작은 주제를 접힌 채로 시작하고, 대상별 카드·고정 내비·
// 주소 앵커(#id)가 필요한 절만 펼쳐 그 위치로 이동한다(docs/context-notes.md "사용 안내" 섹션).

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PublicGate } from "@/components/common/PublicGate";
import { GuideOpenContext, GuideSection, GuideSubSection, type GuideOpenState } from "@/components/guide/GuideSection";
import { GuideNavBar, GuideNavSide, type GuideNavItem } from "@/components/guide/GuideNav";
import { GuideStep, GuideSteps } from "@/components/guide/GuideStep";
import { GuideWarning } from "@/components/guide/GuideWarning";
import { GuideFaq, type FaqItem } from "@/components/guide/GuideFaq";
import { useAuthGate } from "@/hooks/useAuthGate";

const NAV: GuideNavItem[] = [
  { id: "check", label: "출석 체크" },
  { id: "confirm", label: "출석 확인" },
  { id: "history", label: "출석현황" },
  { id: "birthday", label: "생일자" },
  {
    id: "members",
    label: "학생 관리",
    children: [
      { id: "members-enter", label: "들어가기" },
      { id: "members-register", label: "등록하기" },
      { id: "members-edit", label: "정보 고치기" },
      { id: "members-attendance", label: "지난 출석 고치기" },
      { id: "members-delete", label: "지우기" },
      { id: "members-teachers", label: "교사 현황 보기" },
    ],
  },
  { id: "faq", label: "자주 묻는 것" },
];

const SECTION_IDS = NAV.map((n) => n.id);
// 작은 주제 id → 부모 절 id (작은 주제로 바로 갈 때 부모 절도 펼쳐야 한다)
const PARENT: Record<string, string> = Object.fromEntries(
  NAV.flatMap((n) => (n.children ?? []).map((c) => [c.id, n.id])),
);
const KNOWN_IDS = new Set([...SECTION_IDS, ...Object.keys(PARENT)]);
// 작은 주제가 있는 절 id → 첫 작은 주제 id (내비·카드로 그 절에 가면 첫 주제까지 펼쳐 바로 읽을 수 있게)
const FIRST_CHILD: Record<string, string> = Object.fromEntries(
  NAV.filter((n) => n.children?.length).map((n) => [n.id, n.children![0].id]),
);

// 맨 위 대상별 카드 — 누르면 해당 절들을 펼치고 첫 절로 이동
const AUDIENCES = [
  { tag: "학생용", title: "출석 체크", desc: "주일에 내 이름 카드 누르기", open: ["check"] },
  { tag: "교사용", title: "출석 확인·현황", desc: "우리 반 확인 · 출석현황 · 생일자", open: ["confirm", "history", "birthday"] },
  { tag: "총무팀용", title: "학생 관리", desc: "등록 · 고치기 · 지난 출석 · 교사 현황", open: ["members"] },
];

const FAQ: FaqItem[] = [
  {
    q: "비밀번호를 넣었는데 창이 흔들리기만 해요",
    a: "비밀번호가 틀린 거예요. 출석부에 들어갈 때 쓰는 교사용 비밀번호와 학생 관리에 쓰는 관리자 비밀번호는 서로 달라요. 모르면 담당 교역자께 물어보세요.",
  },
  {
    q: "출석부를 열 때마다 비밀번호를 다시 물어요",
    a: "인터넷 창(탭)을 닫으면 다시 물어봐요. 창을 닫지 않고 두면 그동안은 다시 묻지 않아요.",
  },
  {
    q: "카드를 눌러도 아무 반응이 없어요",
    a: "카드는 주일 당일에만 눌려요. 카드에 자물쇠가 보이면 지난 예배를 보고 있는 거예요. 지난 출석을 고치려면 총무팀 선생님에게 문의하세요.",
  },
  {
    q: "내 이름 카드가 안 보여요",
    a: "오전·오후 예배를 바르게 골랐는지 먼저 보세요. 처음 왔다면 새친구 버튼을 눌러 보세요. 그래도 없으면 선생님께 등록을 부탁하세요.",
  },
  {
    q: "누른 출석이 다른 선생님 휴대폰에는 안 보여요",
    a: "다른 휴대폰에는 30초쯤 뒤에 바뀐 내용이 보여요. 바로 보고 싶으면 화면을 새로고침하세요.",
  },
  {
    q: "등록이나 수정 완료를 눌렀는데 창이 안 닫혀요",
    a: "빨간 별(*)이 붙은 칸 중 비어 있는 칸이 없는지 보세요. 인터넷이 약하면 오래 걸릴 수 있으니 잠깐 기다렸다가 다시 눌러 보세요.",
  },
  {
    q: "학생을 잘못 지웠어요",
    a: "화면에서는 되살릴 수 없어요. 바로 관리 담당 선생님께 알려 주세요. 원본 자료에서 복구해야 해요.",
  },
];

export default function GuidePage() {
  const sessionAuth = useAuthGate("session");

  return (
    <PublicGate
      isAuthenticated={sessionAuth.isAuthenticated}
      checked={sessionAuth.checked}
      login={sessionAuth.login}
    >
      {sessionAuth.isAuthenticated ? <GuideContent /> : null}
    </PublicGate>
  );
}

function GuideContent() {
  const [openIds, setOpenIds] = useState<Set<string>>(() => new Set());
  const [activeId, setActiveId] = useState<string | null>(null);
  // 펼친 직후엔 접혀 있던 내용이 아직 DOM에 없으므로, 렌더가 끝난 뒤 스크롤한다
  const pendingScroll = useRef<string | null>(null);

  const openState = useMemo<GuideOpenState>(
    () => ({
      isOpen: (id) => openIds.has(id),
      toggle: (id) =>
        setOpenIds((prev) => {
          const next = new Set(prev);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          return next;
        }),
    }),
    [openIds],
  );

  // id(절 또는 작은 주제)를 펼치고 그 위치로 이동. also는 함께 펼칠 절(대상 카드용).
  // 작은 주제가 있는 절로 가면 첫 작은 주제도 펼친다(학생 관리 → 들어가기). 절 머리 버튼으로 열 때는 해당 없음
  const goTo = useCallback((id: string, also: string[] = []) => {
    const ids = [id, ...also];
    setOpenIds(
      (prev) =>
        new Set([
          ...prev,
          ...ids,
          ...ids.flatMap((x) => (PARENT[x] ? [PARENT[x]] : [])),
          ...ids.flatMap((x) => (FIRST_CHILD[x] ? [FIRST_CHILD[x]] : [])),
        ]),
    );
    pendingScroll.current = id;
  }, []);

  useEffect(() => {
    const id = pendingScroll.current;
    if (!id) return;
    pendingScroll.current = null;
    requestAnimationFrame(() => {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      document.getElementById(id)?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    });
  }, [openIds]);

  // 주소 앵커(/guide#members-delete 등)로 들어오거나 앵커가 바뀌면 그 절을 펼친다
  useEffect(() => {
    const fromHash = () => {
      const id = decodeURIComponent(window.location.hash.slice(1));
      if (KNOWN_IDS.has(id)) goTo(id);
    };
    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
  }, [goTo]);

  // 지금 보고 있는 절 — 기준선(고정 바 바로 아래)을 지난 마지막 절. 펼치고 접으면 높이가 바뀌어 다시 계산
  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      // 페이지 끝에 닿으면 마지막 절들은 기준선까지 못 올라오므로, 그때는 화면에 들어온 마지막 절을 고른다.
      // 단 스크롤이 실제로 있을 때만 — 절이 다 접혀 페이지가 화면보다 짧으면 처음부터 "끝"이라 마지막 절이 잘못 강조된다
      const { scrollHeight } = document.documentElement;
      const atBottom =
        scrollHeight > window.innerHeight + 2 && window.scrollY > 0 && Math.ceil(window.scrollY + window.innerHeight) >= scrollHeight - 2;
      const line = atBottom ? window.innerHeight - 1 : window.innerWidth >= 1024 ? 40 : 96;
      let current: string | null = null;
      for (const id of SECTION_IDS) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= line) current = id;
      }
      setActiveId(current);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [openIds]);

  return (
    <main className="mx-auto w-full max-w-215 px-4 pt-6 pb-16 break-keep sm:px-6 lg:grid lg:max-w-270 lg:grid-cols-[180px_minmax(0,1fr)] lg:gap-10">
      <GuideNavSide items={NAV} activeId={activeId} onGo={goTo} />
      <div className="min-w-0">
        <header className="grid gap-3 pb-5 animate-[rise-in_0.5s_ease-out_both]">
          <Link
            href="/"
            className="flex w-fit items-center gap-1.5 rounded-full bg-ink px-3.5 py-2 text-sm font-semibold text-paper hover:bg-ink/85"
          >
            <ArrowLeft className="size-3.5" />
            출석체크로
          </Link>
          <p className="font-display text-[0.7rem] tracking-[0.3em] text-stamp">USER GUIDE</p>
          <h1 className="font-display text-3xl font-bold text-ink sm:text-4xl">출석부 사용 안내</h1>
          <p className="text-ink/65">
            필요한 것만 눌러서 보세요. 사진 속 <b className="text-stamp">빨간 네모</b>가 누를 곳이에요.
          </p>
          <div className="grid grid-cols-3 gap-2">
            {AUDIENCES.map((a) => (
              <button
                key={a.tag}
                type="button"
                onClick={() => goTo(a.open[0], a.open)}
                className="grid content-start gap-0.5 rounded-2xl border-[1.5px] border-ink/15 bg-paper-deep p-3 text-left hover:border-ink/40 sm:p-4"
              >
                <span className="text-xs font-semibold tracking-[0.08em] text-stamp">{a.tag}</span>
                <span className="font-display text-[15px] leading-snug font-bold text-ink sm:text-lg">{a.title}</span>
                <span className="hidden text-sm text-ink/60 sm:block">{a.desc}</span>
              </button>
            ))}
          </div>
        </header>

        <GuideNavBar items={NAV} activeId={activeId} onGo={goTo} />

        <GuideOpenContext.Provider value={openState}>

          <GuideSection id="check" tag="학생용" title="출석 체크하기" description="주일 예배에 오면 내 이름 카드를 눌러요.">
            <GuideSteps>
              <GuideStep
                n={1}
                shot="10-check-session"
                alt="출석부 첫 화면. 위쪽에 출석일 상자와 오전·오후 예배 버튼이 있다."
                title={<><em>출석일</em>과 <em>예배(오전·오후)</em>를 확인하세요</>}
              >
                <p>① 출석일이 오늘 주일 날짜인지 봐요.</p>
                <p>② 내가 드리는 예배를 골라요. 진한 색 버튼이 지금 고른 예배예요.</p>
              </GuideStep>
              <GuideStep
                n={2}
                shot="11-check-chip"
                alt="반 버튼 목록. 1-1반 버튼에 빨간 네모가 있다."
                title={<><em>내 반 버튼</em>을 누르세요</>}
              >
                <p>1학년 1반이면 <b>1-1반</b>을 눌러요. 우리 반 학생만 모아서 보여 줘요.</p>
                <p className="hint">처음 온 친구는 맨 아래 <b>새친구</b> 버튼을 누르면 돼요. 다시 모두 보려면 맨 앞 <b>전체</b>를 누르세요.</p>
              </GuideStep>
              <GuideStep
                n={3}
                shot="12-check-card"
                alt="1-1반 카드 목록. 아직 누르지 않은 흰색 김하늘 카드에 빨간 네모가 있다."
                title={<><em>내 이름 카드</em>를 누르세요</>}
              >
                <p>카드 아무 곳이나 한 번 누르면 돼요.</p>
              </GuideStep>
              <GuideStep
                n={4}
                shot="13-check-stamped"
                alt="김하늘 카드가 빨간색으로 바뀌고 체크 표시가 붙었다. 위쪽 출석 숫자가 하나 늘었다."
                title={<>카드가 <em>빨갛게 바뀌고 ✓</em>가 붙으면 출석 완료예요</>}
              >
                <p>위쪽의 출석 숫자도 하나 늘어나요.</p>
                <p className="hint">잘못 눌렀다면 같은 카드를 <b>한 번 더</b> 누르세요. ✓가 사라지고 출석이 취소돼요.</p>
              </GuideStep>
            </GuideSteps>
          </GuideSection>

          <GuideSection id="confirm" tag="교사용" title="출석 확인하기" description="우리 반 학생이 잘 눌렀는지 확인하고, 빠진 학생은 대신 눌러요.">
            <GuideSteps>
              <GuideStep
                n={1}
                shot="20-confirm-class"
                alt="1-1반만 보이는 화면. 빨간 카드 두 장과 흰 카드 두 장이 있고, 흰 카드에 빨간 네모가 있다."
                title={<><em>우리 반 버튼</em>을 누르고 흰 카드를 찾으세요</>}
              >
                <p>빨간 카드(✓)는 출석, <b>흰 카드는 아직 안 누른 학생</b>이에요.</p>
                <p className="hint">반 이름 옆 숫자(예: 2 / 4)는 &lsquo;출석 / 전체&rsquo; 인원이에요.</p>
              </GuideStep>
              <GuideStep
                n={2}
                shot="21-confirm-tap"
                alt="최별 카드가 빨간색으로 바뀌었다."
                title={<>예배에 왔는데 안 누른 학생은 <em>선생님이 대신</em> 눌러 주세요</>}
              >
                <p>잘못 눌렀으면 한 번 더 누르면 취소돼요.</p>
                <p className="hint">다른 선생님 휴대폰에서 누른 출석은 30초쯤 뒤에 내 화면에도 보여요. 바로 보고 싶으면 화면을 새로고침하세요.</p>
              </GuideStep>
              <GuideStep
                n={3}
                shot="22-confirm-locked"
                alt="'지난 예배 출석 조회 중' 안내가 보이고, 카드는 회색으로 바뀌어 자물쇠가 붙어 있다."
                title={<><em>지난주 출석</em>은 이 화면에서 고칠 수 없어요</>}
              >
                <p>① 주일이 지나면 위에 &lsquo;지난 예배 출석 조회 중&rsquo; 안내가 나와요.</p>
                <p>② 카드에 자물쇠가 붙고 눌리지 않아요.</p>
                <p className="hint">지난 출석을 고치려면 총무팀 선생님에게 문의하세요.</p>
              </GuideStep>
            </GuideSteps>
          </GuideSection>

          <GuideSection id="history" tag="출석현황" title="출석현황 보기" description="주별·기간별 출석을 반마다 확인해요.">
            <GuideSteps>
              <GuideStep
                n={1}
                shot="30-history-entry"
                alt="메뉴가 열린 출석부 첫 화면. 출석현황 항목에 빨간 네모가 있다."
                title={<>메뉴(☰)를 열고 <em>출석현황</em>을 누르세요</>}
              >
                <p className="hint">PC에서는 메뉴 대신 화면 위쪽에 출석현황 버튼이 바로 보여요.</p>
              </GuideStep>
              <GuideStep
                n={2}
                shot="31-history-week"
                alt="출석 현황 조회 화면 위쪽. 날짜 선택, 기간 선택, 오전·오후 버튼에 빨간 네모가 있다."
                title={<><em>날짜·기간·예배</em>를 고르세요</>}
              >
                <p>① 보고 싶은 주일 날짜를 골라요. 양옆 화살표로 한 주씩 넘길 수도 있어요.</p>
                <p>② 기간을 1주로 두면 그 주일 하루, 4주·8주 등으로 바꾸면 여러 주를 묶어서 봐요.</p>
                <p>③ 오전·오후 예배를 골라요.</p>
              </GuideStep>
              <GuideStep
                n={3}
                shot="32-history-chart"
                alt="학년별 출석 막대 차트. 1-1반 줄에 빨간 네모가 있다."
                title={<>반마다 <em>막대</em>로 출석을 보여 줘요</>}
              >
                <p>빨간 부분이 출석, 회색이 결석이에요. 오른쪽 숫자는 &lsquo;출석 / 전체&rsquo;예요.</p>
              </GuideStep>
              <GuideStep
                n={4}
                shot="33-history-modal"
                alt="1-1반 명단 창. 출석 2명과 결석 2명의 이름이 나뉘어 보인다."
                title={<>반 줄을 누르면 <em>누가 왔는지 명단</em>이 나와요</>}
              >
                <p>출석한 학생과 결석한 학생이 나뉘어 보여요. 창 오른쪽 위 ✕를 누르면 닫혀요.</p>
              </GuideStep>
              <GuideStep
                n={5}
                shot="34-history-period"
                alt="기간을 4주로 바꾼 화면. 4주 평균 숫자, 개근·부분 출석·결석 버튼, 주차별 출석 추이 그래프가 보인다."
                title={<>기간을 늘리면 <em>여러 주 평균</em>과 <em>개근·결석</em>을 볼 수 있어요</>}
              >
                <p>① 기간을 4주로 바꾸면 숫자가 &lsquo;4주 평균&rsquo;으로 바뀌어요.</p>
                <p>② <b>개근</b>(매주 출석)·<b>부분 출석</b>·<b>결석</b>(한 번도 안 옴) 인원이 나와요.</p>
                <p className="hint">아래 &lsquo;주차별 출석 추이&rsquo; 그래프에서 한 주를 누르면 그 주 화면으로 바뀌어요.</p>
              </GuideStep>
              <GuideStep
                n={6}
                shot="35-history-absent"
                alt="결석 명단 창. 4주 중 0회 출석한 학생 이름이 보인다."
                title={<><em>결석</em> 버튼을 누르면 한 번도 안 온 학생 명단이 나와요</>}
              >
                <p>심방이나 연락이 필요한 학생을 찾을 때 쓰면 좋아요.</p>
              </GuideStep>
            </GuideSteps>
          </GuideSection>

          <GuideSection id="birthday" tag="생일자" title="생일자 보기" description="달마다 생일인 학생과 선생님을 확인해요.">
            <GuideSteps>
              <GuideStep
                n={1}
                shot="40-birthday-entry"
                alt="메뉴가 열린 출석부 첫 화면. 생일축하 항목에 빨간 네모가 있다."
                title={<>메뉴(☰)를 열고 <em>생일축하</em>를 누르세요</>}
              >
                <p className="hint">PC에서는 화면 위쪽의 분홍색 생일축하 버튼을 누르면 돼요.</p>
              </GuideStep>
              <GuideStep
                n={2}
                shot="41-birthday-month"
                alt="생일자 화면. 다음 달 화살표와 오전반·오후반 버튼에 빨간 네모가 있다."
                title={<><em>달</em>과 <em>오전반·오후반</em>을 고르세요</>}
              >
                <p>처음에는 이번 달 생일자가 나와요.</p>
                <p>① 화살표로 이전 달·다음 달로 넘겨요.</p>
                <p>② 오전반·오후반을 바꿔 볼 수 있어요.</p>
              </GuideStep>
              <GuideStep
                n={3}
                shot="42-birthday-lunar"
                alt="11월 생일자 명단. 선생님 칸의 '11/23 (음력)' 표시에 빨간 네모가 있다."
                title={<>학년·선생님·새친구별로 <em>이름과 생일 날짜</em>가 나와요</>}
              >
                <p>① 날짜 옆 <b>(음력)</b>은 음력 생일인 분이에요. 날짜는 올해 양력으로 바꿔서 보여 줘요.</p>
                <p className="hint">오늘이 생일인 사람에게는 축하 표시가 붙어요.</p>
              </GuideStep>
            </GuideSteps>
          </GuideSection>

          <GuideSection id="members" tag="총무팀용" title="학생 관리" description="학생·교사·새친구를 등록하고 고치고 지워요. 관리자 비밀번호가 필요해요.">
            <GuideSubSection id="members-enter" title="들어가기">
              <GuideSteps>
                <GuideStep
                  n={1}
                  shot="50-members-menu"
                  alt="메뉴가 열린 출석부 첫 화면. 학생 관리 항목에 빨간 네모가 있다."
                  title={<>메뉴(☰)를 열고 <em>학생 관리</em>를 누르세요</>}
                >
                  <p className="hint">PC에서는 화면 위쪽의 자물쇠 모양 학생 관리 버튼을 누르면 돼요.</p>
                </GuideStep>
                <GuideStep
                  n={2}
                  shot="51-members-password"
                  alt="관리자 인증 창. 비밀번호 입력칸과 입장 버튼에 빨간 네모가 있다."
                  title={<><em>관리자 비밀번호</em>를 넣고 <em>입장</em>을 누르세요</>}
                >
                  <p>출석부에 들어갈 때 쓰는 교사용 비밀번호와 <b>다른 비밀번호</b>예요.</p>
                  <p className="hint">비밀번호가 틀리면 창이 흔들려요. 한 번 들어가면 인터넷 창을 닫기 전까지 다시 묻지 않아요.</p>
                </GuideStep>
              </GuideSteps>
            </GuideSubSection>

            <GuideSubSection id="members-register" title="등록하기">
              <GuideSteps>
                <GuideStep
                  n={1}
                  shot="52-members-buttons"
                  alt="학생·교사 관리 화면 위쪽. 학생, 교사, 새친구 등록 버튼에 빨간 네모가 있다."
                  title={<>위쪽 버튼으로 <em>누구를 등록할지</em> 고르세요</>}
                >
                  <p>① 학생 ② 교사 ③ 새친구(처음 와서 아직 반이 없는 친구)</p>
                  <p className="hint">휴대폰에서는 &lsquo;등록&rsquo; 글자 없이 학생·교사·새친구로만 보여요.</p>
                </GuideStep>
                <GuideStep
                  n={2}
                  shot="53-members-student-form"
                  alt="학생 등록 창. 소속, 이름, 학년, 반 칸에 빨간 네모가 있다."
                  title={<><em>빨간 별(*)</em>이 붙은 칸을 채우세요</>}
                >
                  <p>① 소속(오전반·오후반) ② 이름 ③ 학년 ④ 반은 꼭 넣어야 해요. 나머지 칸은 아는 것만 쓰면 돼요.</p>
                  <p className="hint">연락처는 숫자만 쓰면 가운데 줄(-)이 저절로 들어가요.</p>
                </GuideStep>
                <GuideStep
                  n={3}
                  shot="54-members-student-save"
                  alt="학생 등록 창 맨 아래. 등록 버튼에 빨간 네모가 있다."
                  title={<>맨 아래 <em>등록</em>을 누르세요</>}
                >
                  <p>창이 닫히면 저장이 끝난 거예요. 그만두려면 <b>취소</b>를 누르세요.</p>
                </GuideStep>
                <GuideStep
                  n={4}
                  shot="57-members-registered"
                  alt="출석부 첫 화면의 1-1반. 새로 등록한 홍길동 카드에 빨간 네모가 있다."
                  title={<>출석부에 <em>새 카드</em>가 생겼는지 확인하세요</>}
                >
                  <p>등록한 학생은 바로 출석 체크를 할 수 있어요.</p>
                  <p className="hint">다른 선생님 휴대폰에는 30초쯤 뒤에 보여요.</p>
                </GuideStep>
                <GuideStep
                  n={5}
                  shot="55-members-newfriend"
                  alt="새친구 등록 창. 학년이 새친구로 정해져 있고 반 칸은 비활성이다."
                  title={<>처음 온 친구는 <em>새친구 등록</em>으로 등록하세요</>}
                >
                  <p>① 학년이 &lsquo;새친구&rsquo;로 정해져 있어요. ② 반 칸은 비워 둬요(누를 수 없어요).</p>
                  <p className="hint">나중에 반을 배정받으면 아래 &lsquo;정보 고치기&rsquo;에서 학년과 반을 바꾸면 돼요.</p>
                </GuideStep>
                <GuideStep
                  n={6}
                  shot="56-members-teacher"
                  alt="교사 등록 창. 소속, 이름, 팀 칸에 빨간 네모가 있다."
                  title={<>선생님은 <em>교사 등록</em>으로 등록하세요</>}
                >
                  <p>① 소속 ② 이름 ③ 팀(총무팀·예배지원팀·학년 교사·새친구반)을 넣어요.</p>
                  <p className="hint">음력 생일이면 생년월일 옆 <b>음력</b>에 체크하세요. 생일자 화면에 양력으로 바꿔 보여 줘요.</p>
                </GuideStep>
              </GuideSteps>
            </GuideSubSection>

            <GuideSubSection id="members-edit" title="정보 고치기">
              <GuideSteps>
                <GuideStep
                  n={1}
                  shot="60-edit-open"
                  alt="학생·교사 관리 화면의 1-1반 명단. 김하늘 이름 칸에 빨간 네모가 있다."
                  title={<>고칠 사람의 <em>이름</em>을 누르세요</>}
                >
                  <p>학생이든 선생님이든 같은 방법이에요.</p>
                  <p className="hint">찾기 어려우면 위쪽의 반·팀 버튼을 먼저 누르면 그 반만 보여요.</p>
                </GuideStep>
                <GuideStep
                  n={2}
                  shot="61-edit-form"
                  alt="학생 정보 수정 창. 학년이 1학년, 반이 2로 바뀌어 있고 두 칸에 빨간 네모가 있다."
                  title={<>바꿀 칸을 눌러 <em>새로 쓰세요</em></>}
                >
                  <p>사진은 새친구가 1학년 2반을 배정받아 ① 학년을 &lsquo;1학년&rsquo;으로, ② 반을 &lsquo;2&rsquo;로 바꾸는 모습이에요.</p>
                  <p className="hint">이렇게 바꾸면 새친구 묶음에서 1학년 2반으로 옮겨 가요.</p>
                </GuideStep>
                <GuideStep
                  n={3}
                  shot="62-edit-save"
                  alt="학생 정보 수정 창 맨 아래. 수정 완료 버튼에 빨간 네모가 있다."
                  title={<>화면을 내려 <em>수정 완료</em>를 누르세요</>}
                >
                  <p>창이 닫히면 저장된 거예요. 고친 걸 없던 일로 하려면 <b>취소</b>를 누르세요.</p>
                </GuideStep>
              </GuideSteps>
            </GuideSubSection>

            <GuideSubSection id="members-attendance" title="지난 출석 고치기">
              <GuideSteps>
                <GuideStep
                  n={1}
                  shot="63-attend-form"
                  alt="학생 정보 수정 창 아래쪽의 출석 수정 칸. 예배일 선택과 출석 추가·출석 취소 버튼에 빨간 네모가 있다."
                  title={<>이름을 눌러 창을 열고 맨 아래 <em>출석 수정</em>으로 내려가세요</>}
                >
                  <p>① 고칠 <b>주일 날짜</b>를 골라요.</p>
                  <p>② 그날 왔는데 빠졌으면 <b>출석 추가</b>, ③ 안 왔는데 잘못 눌렸으면 <b>출석 취소</b>를 눌러요.</p>
                  <p className="hint">그 사람의 소속(오전·오후) 예배로 기록돼요. 위쪽의 출석률 숫자도 바로 바뀌어요.</p>
                </GuideStep>
                <GuideStep
                  n={2}
                  shot="64-attend-added"
                  alt="출석 추가 버튼이 '추가됨 ✓'으로 바뀌었다."
                  title={<>버튼이 <em>추가됨 ✓</em>으로 바뀌면 끝이에요</>}
                >
                  <p>이미 출석으로 되어 있는 날에 출석 추가를 누르면 &lsquo;이미 출석 처리되어 있습니다&rsquo;라고 알려 줘요.</p>
                </GuideStep>
              </GuideSteps>
            </GuideSubSection>

            <GuideSubSection id="members-delete" title="지우기">
              <GuideWarning title="지우면 되돌릴 수 없어요">
                <ul>
                  <li>그 사람의 <b>지난 출석 기록도 모두 함께</b> 지워져요.</li>
                  <li>반만 바뀐 거라면 지우지 말고 위의 &lsquo;정보 고치기&rsquo;로 반을 바꾸세요.</li>
                  <li>헷갈리면 지우기 전에 담당 선생님이나 총무팀 선생님에게 먼저 물어보세요.</li>
                </ul>
              </GuideWarning>
              <GuideSteps>
                <GuideStep
                  n={1}
                  danger
                  shot="65-delete"
                  alt="학생 정보 수정 창 맨 아래 왼쪽의 분홍색 삭제 버튼에 빨간 네모가 있다."
                  title={<>지울 사람의 창을 열고 맨 아래 왼쪽 <em>삭제</em>를 누르세요</>}
                />
                <GuideStep
                  n={2}
                  danger
                  shot="66-delete-confirm"
                  alt="'정말 삭제할까요?' 문구 옆에 취소와 삭제 버튼이 나왔다. 삭제 버튼에 빨간 네모가 있다."
                  title={<><em>정말 삭제할까요?</em>가 나오면 한 번 더 <em>삭제</em>를 누르세요</>}
                >
                  <p>마음이 바뀌었으면 옆의 <b>취소</b>를 누르세요. 아무것도 지워지지 않아요.</p>
                </GuideStep>
                <GuideStep
                  n={3}
                  danger
                  shot="67-deleted"
                  alt="학생·교사 관리 화면. 1-1반 버튼의 숫자가 3으로 줄었다."
                  title={<>명단에서 사라졌는지 확인하세요</>}
                >
                  <p>사진에서는 1-1반이 4명에서 <b>3명</b>으로 줄었어요.</p>
                </GuideStep>
              </GuideSteps>
            </GuideSubSection>

            <GuideSubSection id="members-teachers" title="교사 현황 보기">
              <GuideSteps>
                <GuideStep
                  n={1}
                  shot="70-teachers-entry"
                  alt="학생·교사 관리 화면 위쪽. 교사 현황 버튼에 빨간 네모가 있다."
                  title={<>학생 관리 화면에서 <em>교사 현황</em>을 누르세요</>}
                >
                  <p className="hint">학생 관리에 들어갈 때 넣은 관리자 비밀번호로 그대로 열려요.</p>
                </GuideStep>
                <GuideStep
                  n={2}
                  shot="71-teachers-top"
                  alt="교사 현황 화면 위쪽. 오전반·오후반 버튼, 팀 버튼 줄, 이름 검색 칸에 빨간 네모가 있다."
                  title={<><em>반·팀</em>을 고르거나 <em>이름</em>으로 찾으세요</>}
                >
                  <p>① 오전반·오후반 ② 팀(총무팀·예배지원팀·학년 교사·새친구반) ③ 이름 검색</p>
                  <p className="hint">표 맨 위 제목(이름·팀 등)을 누르면 그 순서로 정렬돼요. 팀 버튼은 옆으로 밀어서 더 볼 수 있어요.</p>
                </GuideStep>
                <GuideStep
                  n={3}
                  shot="72-teachers-phone"
                  alt="이름 검색 칸에 김철수를 넣어 한 줄만 남았다. 초록색 연락처에 빨간 네모가 있다."
                  title={<>초록색 <em>연락처</em>를 누르면 바로 전화가 걸려요</>}
                >
                  <p>① 이름을 넣으면 그 선생님만 남아요. ② 휴대폰에서 연락처를 누르면 전화 앱이 열려요.</p>
                </GuideStep>
                <GuideStep
                  n={4}
                  shot="73-teachers-rate"
                  alt="표를 옆으로 민 모습. 출석률(1년기준) 칸에 색 막대와 퍼센트가 보인다."
                  title={<>표를 옆으로 밀면 <em>출석률(1년 기준)</em>이 보여요</>}
                >
                  <p>최근 1년 동안 예배가 있었던 날 중 몇 번 왔는지예요. 막대 색은 초록(80% 이상)·노랑(50% 이상)·빨강(그 아래)이에요.</p>
                </GuideStep>
              </GuideSteps>
            </GuideSubSection>
          </GuideSection>

          <GuideSection id="faq" tag="잘 안 될 때" title="자주 묻는 것">
            <GuideFaq items={FAQ} />
          </GuideSection>
        </GuideOpenContext.Provider>
      </div>
    </main>
  );
}
