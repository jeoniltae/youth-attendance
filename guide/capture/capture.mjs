// 가이드 촬영 스크립트 — guide/pages/shots.json의 장면을 순서대로 찍어 guide/capture/raw/<id>.png(+.json 네모 좌표)로 저장한다.
// 사용: node guide/capture/capture.mjs [장면id ...]   (id를 주면 그 장면만 다시 찍음)
// 전제: 촬영용 dev 서버가 GUIDE_BASE(기본 http://localhost:3100)에서 구글 설정을 무효값으로 덮은 채 떠 있어야 한다 — guide/README.md 참고
import { execFileSync, execSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const GUIDE = resolve(HERE, "..");
const RAW = join(HERE, "raw");
const BASE = process.env.GUIDE_BASE ?? "http://localhost:3100";
const SESSION = "guide";
const VIEWPORT = { w: 390, h: 844, scale: 2 };

// agent-browser를 셸 없이 node로 직접 실행 — 한글·공백 인자가 Windows 셸에서 깨지지 않게
const AB_JS = join(execSync("npm root -g").toString().trim(), "agent-browser", "bin", "agent-browser.js");
function ab(...args) {
  return execFileSync(process.execPath, [AB_JS, "--session", SESSION, ...args], { encoding: "utf8" }).trim();
}
function evalJs(js) {
  // eval은 같은 페이지에서 전역 스코프를 공유하므로 블록으로 감싸 let/const 재선언 충돌을 막는다(마지막 식 값은 그대로 반환)
  const out = ab("eval", "-b", Buffer.from(`{\n${js}\n}`, "utf8").toString("base64"));
  try {
    return JSON.parse(out);
  } catch {
    return out;
  }
}

// ── 안전장치 1: 서버가 실제 시트에 연결돼 있으면 촬영하지 않는다 ─────────────
async function assertServerDisconnected() {
  let status;
  try {
    status = (await fetch(`${BASE}/api/roster?session=${encodeURIComponent("오전")}`)).status;
  } catch {
    throw new Error(`촬영 서버(${BASE})에 연결할 수 없습니다 — guide/README.md의 서버 실행 명령을 먼저 실행하세요`);
  }
  if (status === 200) {
    throw new Error("촬영 서버가 실제 스프레드시트에 연결돼 있습니다(응답 200). 구글 환경변수를 무효값으로 덮어 다시 띄우세요");
  }
}

// 페이지 안에서 요소 찾기 — {css} | {text}(정확히 일치) | {contains}(포함), 공통 옵션 nth·self·up·tag(text/contains 후보를 이 선택자로 제한).
// 기본은 버튼·링크 같은 누를 수 있는 조상까지 올라가고, self=true면 찾은 요소 그대로, up=N이면 N단계 부모로
const LOCATE = `
function __locate(loc) {
  const visible = (e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  let el;
  if (loc.css) {
    el = [...document.querySelectorAll(loc.css)].filter(visible)[loc.nth ?? 0];
  } else {
    const norm = (e) => (e.textContent || "").replace(/\\s+/g, " ").trim();
    const hits = [...document.querySelectorAll(loc.tag || "body *")].filter(
      (e) => visible(e) && (loc.contains ? norm(e).includes(loc.contains) : norm(e) === loc.text),
    );
    const minimal = hits.filter((e) => !hits.some((o) => o !== e && e.contains(o)));
    el = minimal[loc.nth ?? 0];
  }
  if (!el) throw new Error("요소를 찾지 못함: " + JSON.stringify(loc));
  if (loc.up) {
    for (let i = 0; i < loc.up; i++) el = el.parentElement;
  } else if (!loc.self) {
    el = el.closest("button, a, label, summary, [role=button], input, select, textarea") || el;
  }
  return el;
}`;

function runAction(a) {
  if (a.wait) return ab("wait", String(a.wait));
  if (a.open) return ab("open", BASE + a.open);
  if (a.click) return evalJs(`${LOCATE}; __locate(${JSON.stringify(a.click)}).click(); true`);
  if (a.scrollTo) {
    return evalJs(`${LOCATE}; __locate(${JSON.stringify(a.scrollTo)}).scrollIntoView({ block: "${a.block ?? "center"}" }); true`);
  }
  if (a.fill) {
    // React 제어 input은 value를 직접 넣으면 무시되므로 네이티브 setter + input 이벤트로 넣는다
    const [loc, text] = a.fill;
    return evalJs(`${LOCATE};
      let el = __locate(${JSON.stringify({ ...loc, self: true })});
      if (!/^(INPUT|TEXTAREA)$/.test(el.tagName)) el = el.querySelector("input, textarea"); // label로 찾았으면 안의 입력칸
      const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(proto, "value").set.call(el, ${JSON.stringify(text)});
      el.dispatchEvent(new Event("input", { bubbles: true })); true`);
  }
  if (a.select) {
    const [loc, value] = a.select;
    return evalJs(`${LOCATE};
      let el = __locate(${JSON.stringify({ ...loc, self: true })});
      if (el.tagName !== "SELECT") el = el.querySelector("select"); // label로 찾았으면 안의 선택칸
      Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value").set.call(el, ${JSON.stringify(value)});
      el.dispatchEvent(new Event("change", { bubbles: true })); true`);
  }
  if (a.eval) return evalJs(a.eval);
  throw new Error("알 수 없는 동작: " + JSON.stringify(a));
}

// 빨간 네모 위치를 화면 대비 %로 측정
function measureMarks(marks = []) {
  if (!marks.length) return [];
  const out = evalJs(`${LOCATE};
    JSON.stringify(${JSON.stringify(marks)}.map((m) => {
      const r = __locate(m).getBoundingClientRect();
      const pad = m.pad ?? 4;
      return {
        l: ((r.left - pad) / innerWidth) * 100, t: ((r.top - pad) / innerHeight) * 100,
        w: ((r.width + pad * 2) / innerWidth) * 100, h: ((r.height + pad * 2) / innerHeight) * 100,
        label: m.label ?? null, soft: !!m.soft,
      };
    }))`);
  return typeof out === "string" ? JSON.parse(out) : out; // eval 결과 문자열은 한 번 더 감싸져 온다
}

async function main() {
  await assertServerDisconnected();

  const { shots } = JSON.parse(readFileSync(join(GUIDE, "pages", "shots.json"), "utf8"));
  const only = process.argv.slice(2);
  const targets = only.length ? shots.filter((s) => only.includes(s.id)) : shots;
  if (!targets.length) throw new Error("찍을 장면이 없습니다: " + only.join(", "));

  // init script = 더미 데이터 + fetch 가로채기 (브라우저를 새로 띄워야 등록된다)
  mkdirSync(join(HERE, "tmp"), { recursive: true });
  const initPath = join(HERE, "tmp", "init.js");
  writeFileSync(
    initPath,
    `window.__GUIDE_DATA = ${readFileSync(join(GUIDE, "mock", "data.json"), "utf8")};\n` +
      readFileSync(join(GUIDE, "mock", "intercept.js"), "utf8"),
  );
  try {
    ab("close");
  } catch {
    /* 열린 세션이 없으면 무시 */
  }
  // 직전 세션이 닫히는 중이면 연결이 거부되므로 몇 번 다시 시도한다
  for (let i = 1; ; i++) {
    try {
      execFileSync(process.execPath, [AB_JS, "--session", SESSION, "--init-script", initPath, "set", "viewport",
        String(VIEWPORT.w), String(VIEWPORT.h), String(VIEWPORT.scale)], { stdio: "ignore" }); // 데몬이 파이프를 물고 있으면 끝나지 않으므로 출력 연결 안 함
      break;
    } catch (e) {
      if (i >= 5) throw e;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1500);
    }
  }
  // 안전장치 2: 가로채기가 놓친 /api 요청은 서버에 닿기 전에 끊는다
  ab("network", "route", "**/api/**", "--abort");

  try {
    mkdirSync(RAW, { recursive: true });
    for (const shot of targets) {
      // 장면마다 가짜 상태를 처음부터 — 앞 장면의 출석·등록 결과가 섞이지 않게
      ab("open", BASE + shot.url);
      evalJs(`sessionStorage.clear(); ${shot.noAuth ? 'sessionStorage.setItem("guide_noauth", "1");' : ""} ${shot.clockDays ? `sessionStorage.setItem("guide_clock_days", "${shot.clockDays}");` : ""} true`);
      ab("open", BASE + shot.url);
      ab("wait", String(shot.settle ?? 1500));
      for (const a of shot.actions ?? []) runAction(a);
      ab("wait", String(shot.after ?? 700)); // 등장 애니메이션이 끝난 뒤에 찍는다
      const marks = measureMarks(shot.marks);
      ab("screenshot", join(RAW, `${shot.id}.png`));
      writeFileSync(join(RAW, `${shot.id}.json`), JSON.stringify({ viewport: VIEWPORT, marks }, null, 2));
      console.log(`✓ ${shot.id}`);
    }
  } finally {
    // 중간에 실패해도 브라우저 세션을 남기지 않는다
    try {
      ab("close");
    } catch {
      /* 이미 닫힘 */
    }
  }
}

main().catch((e) => {
  console.error("✗ " + e.message);
  process.exit(1);
});
