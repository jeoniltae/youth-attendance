// 가이드 촬영용 가짜 시트 — 페이지 스크립트보다 먼저 실행되어 fetch("/api/*")를 브라우저 메모리 상태로 처리한다.
// capture.mjs가 data.json을 window.__GUIDE_DATA로 앞에 붙여 agent-browser --init-script로 등록한다.
// 앱 코드(src/)와 구글 시트는 건드리지 않는다. 응답 모양은 src/api/*.ts의 타입을 따른다.
(() => {
  const SEED = window.__GUIDE_DATA;
  if (!SEED) {
    console.error("[guide-mock] window.__GUIDE_DATA가 없습니다 — capture.mjs로 실행하세요");
    return;
  }

  // ── 1. 시계 고정: 가장 최근 일요일 11:00(한국 시간) ─────────────────────────
  // 메인 화면은 '가장 최근 일요일'을 보여 주고 그날이 오늘일 때만 카드가 눌린다.
  // 평일에 찍어도 주일 아침 화면이 나오도록 브라우저의 Date만 옮긴다.
  // sessionStorage guide_clock_days=N이면 시계만 N일 뒤로(지난 예배 잠금 장면용). 데이터 기준일은 그대로 일요일
  const RealDate = Date;
  const KST = 9 * 3600e3;
  const realNow = RealDate.now();
  const k = new RealDate(realNow + KST); // UTC 필드 = 한국 시간
  const sunday11 =
    RealDate.UTC(k.getUTCFullYear(), k.getUTCMonth(), k.getUTCDate() - k.getUTCDay(), 11, 0) - KST;
  const clockDays = Number(sessionStorage.getItem("guide_clock_days") || 0);
  const OFFSET = sunday11 + clockDays * 86400e3 - realNow;
  function FakeDate(...args) {
    if (!new.target) return new RealDate(RealDate.now() + OFFSET).toString();
    return args.length ? new RealDate(...args) : new RealDate(RealDate.now() + OFFSET);
  }
  FakeDate.prototype = RealDate.prototype;
  FakeDate.now = () => RealDate.now() + OFFSET;
  FakeDate.UTC = RealDate.UTC;
  FakeDate.parse = RealDate.parse;
  window.Date = FakeDate;

  const DAY = 86400e3;
  const ymd = (ms) => new RealDate(ms + KST).toISOString().slice(0, 10);
  const TODAY = ymd(sunday11);
  const pad = (n) => String(n).padStart(2, "0");
  // 생일 자리표시자 {M0}=이번 달, {M1}=다음 달 (고정한 일요일 기준)
  const month = new RealDate(sunday11 + KST).getUTCMonth() + 1;
  const M0 = pad(month);
  const M1 = pad((month % 12) + 1);

  // ── 2. 상태: 새로고침해도 이어지도록 sessionStorage에 보관 ──────────────────
  const STATE_KEY = "guide_mock_state";

  // 문자열 → [0,1) 고정 난수 (같은 사람·같은 날이면 언제 찍어도 같은 결과)
  function hash01(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
    return ((h >>> 0) % 10000) / 10000;
  }

  function seedState() {
    const fill = (m, d) => {
      const out = { ...d, ...m, birthdate: m.birthdate.replace("{M0}", M0).replace("{M1}", M1) };
      delete out.rate;
      return out;
    };
    const students = SEED.students.map((s) => fill(s, SEED.defaults.student));
    const teachers = SEED.teachers.map((t) => fill(t, SEED.defaults.teacher));
    const rateOf = Object.fromEntries(
      [...SEED.students, ...SEED.teachers].map((m) => [m.id, m.rate]),
    );
    // 지난 400일의 일요일마다 출석 기록 생성. 오늘은 data.json의 todayPresent로 고정(체크 전/후 장면용)
    const attendance = {};
    for (let ms = sunday11; ms > sunday11 - 400 * DAY; ms -= 7 * DAY) {
      const date = ymd(ms);
      attendance[date] =
        date === TODAY
          ? [...SEED.todayPresent]
          : Object.keys(rateOf).filter((id) => hash01(id + date) < rateOf[id]);
    }
    return { students, teachers, attendance };
  }

  let state;
  try {
    state = JSON.parse(sessionStorage.getItem(STATE_KEY)) || seedState();
  } catch {
    state = seedState();
  }
  const save = () => sessionStorage.setItem(STATE_KEY, JSON.stringify(state));
  save();

  // 촬영 장면 대부분은 인증된 상태로 시작. 비밀번호 창을 찍을 때만 guide_noauth를 켠다
  if (!sessionStorage.getItem("guide_noauth")) {
    sessionStorage.setItem("session_token", "guide-mock-token");
    sessionStorage.setItem("admin_token", "guide-mock-token");
  }

  // ── 3. 집계 도우미 ─────────────────────────────────────────────────────────
  const allMembers = () => [...state.students, ...state.teachers];
  const bySession = (list, session) => (session ? list.filter((m) => m.session === session) : list);
  const recordedDates = (from, to) =>
    Object.keys(state.attendance).filter((d) => d >= from && d <= to && state.attendance[d].length);
  const countFor = (id, dates) => dates.filter((d) => state.attendance[d].includes(id)).length;
  const sundaysBetween = (from, to) => {
    const out = [];
    let ms = RealDate.parse(from + "T00:00:00Z");
    while (new RealDate(ms).getUTCDay() !== 0) ms += DAY;
    for (; ymd(ms - KST) <= to; ms += 7 * DAY) out.push(ymd(ms - KST));
    return out;
  };
  const yearAgo = ymd(sunday11 - 365 * DAY);
  const year = TODAY.slice(0, 4);

  function groupStats(ids, dates) {
    const attended = ids.reduce((n, id) => n + countFor(id, dates), 0);
    const total = ids.length * dates.length;
    return { rate: total ? Math.round((attended / total) * 100) : 0, attended, total, count: ids.length };
  }

  // ── 4. 라우트 ──────────────────────────────────────────────────────────────
  function nextId(prefix, list) {
    const seqs = list
      .filter((m) => m.id.startsWith(prefix))
      .map((m) => parseInt(m.id.slice(prefix.length), 10))
      .filter((n) => !isNaN(n));
    return prefix + String(seqs.length ? Math.max(...seqs) + 1 : 1).padStart(3, "0");
  }

  function handle(method, path, q, body) {
    const session = q.get("session");

    if (method === "POST" && path === "/api/auth") {
      if (!body.password) return [401, { error: "비밀번호가 올바르지 않습니다" }];
      return [200, { token: "guide-mock-token" }];
    }
    if (method === "GET" && (path === "/api/roster" || path === "/api/birthdays")) {
      return [200, { students: bySession(state.students, session), teachers: bySession(state.teachers, session) }];
    }
    if (method === "GET" && path === "/api/attendance") {
      const ids = new Set(bySession(allMembers(), session).map((m) => m.id));
      return [200, { studentIds: (state.attendance[q.get("date")] || []).filter((id) => ids.has(id)) }];
    }
    if (method === "POST" && path === "/api/attendance") {
      const list = (state.attendance[body.date] ||= []);
      const has = list.includes(body.studentId);
      const want = body.status ?? (has ? "결석" : "출석");
      if (want === "출석" && !has) list.push(body.studentId);
      if (want === "결석" && has) list.splice(list.indexOf(body.studentId), 1);
      save();
      return [200, { status: want }];
    }
    if (method === "GET" && path === "/api/attendance/range") {
      const dates = {};
      for (const d of recordedDates(q.get("from"), q.get("to"))) dates[d] = [...state.attendance[d]];
      return [200, { dates }];
    }
    if (method === "GET" && path === "/api/stats") {
      const dates = recordedDates(yearAgo, TODAY);
      const ss = bySession(state.students, session);
      const ids = (g) => ss.filter((s) => s.grade === g).map((s) => s.id);
      const all = groupStats([...ss.map((s) => s.id), ...bySession(state.teachers, session).map((t) => t.id)], dates);
      return [200, {
        weeks: dates.length,
        overall: { rate: all.rate, attended: all.attended, total: all.total },
        grade1: groupStats(ids("1"), dates),
        grade2: groupStats(ids("2"), dates),
        grade3: groupStats(ids("3"), dates),
        teachers: groupStats(bySession(state.teachers, session).map((t) => t.id), dates),
      }];
    }
    if (method === "GET" && path === "/api/stats/member") {
      const id = q.get("id");
      const d1y = recordedDates(yearAgo, TODAY);
      const d3m = recordedDates(ymd(sunday11 - 91 * DAY), TODAY);
      return [200, { count3m: countFor(id, d3m), total3m: d3m.length, count1y: countFor(id, d1y), total1y: d1y.length }];
    }
    if (method === "GET" && path === "/api/stats/rates") {
      const d1y = recordedDates(yearAgo, TODAY);
      const half = (from, to) => {
        const days = recordedDates(from, to);
        const counts = {};
        for (const m of allMembers()) {
          const c = countFor(m.id, days);
          if (c) counts[m.id] = c;
        }
        return { total: sundaysBetween(from, to).length, counts };
      };
      const rates = {};
      for (const m of allMembers()) {
        const c = countFor(m.id, d1y);
        if (c) rates[m.id] = Math.round((c / d1y.length) * 100);
      }
      return [200, {
        total1y: d1y.length,
        rates,
        firstHalf: half(`${year}-01-01`, `${year}-06-30`),
        secondHalf: half(`${year}-07-01`, `${year}-12-31`),
      }];
    }

    // 학생·교사 CRUD
    for (const [kind, key] of [["students", "student"], ["teachers", "teacher"]]) {
      const base = `/api/${kind}`;
      if (method === "GET" && path === base) return [200, { [kind]: bySession(state[kind], session) }];
      if (method === "POST" && path === base) {
        const prefix = kind === "students" ? `${year}-${body.grade}-${body.class || "0"}-` : `T-${year}-`;
        const created = { ...SEED.defaults[key], ...body, id: nextId(prefix, state[kind]) };
        state[kind].push(created);
        save();
        return [201, { [key]: created }];
      }
      if (path.startsWith(base + "/")) {
        const id = decodeURIComponent(path.slice(base.length + 1));
        const i = state[kind].findIndex((m) => m.id === id);
        if (i < 0) return [404, { error: "대상을 찾을 수 없습니다" }];
        if (method === "PUT") {
          state[kind][i] = { ...state[kind][i], ...body, id };
          save();
          return [200, { [key]: state[kind][i] }];
        }
        if (method === "DELETE") {
          state[kind].splice(i, 1);
          for (const d of Object.keys(state.attendance)) {
            state.attendance[d] = state.attendance[d].filter((x) => x !== id);
          }
          save();
          return [200, { ok: true }];
        }
      }
    }

    console.error(`[guide-mock] 처리하지 않은 요청: ${method} ${path}`);
    return [404, { error: `guide-mock: ${method} ${path} 미지원` }];
  }

  // ── 5. fetch 가로채기 ───────────────────────────────────────────────────────
  const realFetch = window.fetch.bind(window);
  window.fetch = async (input, init = {}) => {
    const url = new URL(typeof input === "string" || input instanceof URL ? String(input) : input.url, location.href);
    if (url.origin !== location.origin || !url.pathname.startsWith("/api/")) return realFetch(input, init);
    const method = (init.method || (input instanceof Request ? input.method : "GET")).toUpperCase();
    let body = {};
    try {
      body = init.body ? JSON.parse(init.body) : {};
    } catch {
      body = {};
    }
    const [status, json] = handle(method, url.pathname, url.searchParams, body);
    await new Promise((r) => setTimeout(r, 120)); // 실제처럼 짧은 지연 (처리 중 표시 장면용)
    return new Response(JSON.stringify(json), { status, headers: { "Content-Type": "application/json" } });
  };
  // 개발 서버 표시(N 아이콘)·React Query 개발도구 버튼이 캡처에 찍히지 않게 숨긴다
  document.addEventListener("DOMContentLoaded", () => {
    const style = document.createElement("style");
    style.textContent = "nextjs-portal, .tsqd-parent-container, .tsqd-open-btn-container { display: none !important; }";
    document.head.appendChild(style);
  });
  window.__GUIDE_MOCK = { state, today: TODAY };
})();
