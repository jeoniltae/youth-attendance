// 이미지 합성 스크립트 — guide/capture/raw의 캡처에 휴대폰 틀·빨간 네모를 입혀 guide/output/<id>.png로 굽고 public/guide/로 복사한다.
// 사용: node guide/pages/compose.mjs [장면id ...]   (capture.mjs 다음에 실행)
import { execFileSync, execSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const GUIDE = resolve(HERE, "..");
const RAW = join(GUIDE, "capture", "raw");
const TMP = join(GUIDE, "capture", "tmp");
const OUTPUT = join(GUIDE, "output");
const PUBLIC = resolve(GUIDE, "..", "public", "guide");
const SESSION = "guide-compose";

const AB_JS = join(execSync("npm root -g").toString().trim(), "agent-browser", "bin", "agent-browser.js");
const ab = (...args) =>
  execFileSync(process.execPath, [AB_JS, "--session", SESSION, ...args], { encoding: "utf8" }).trim();

const { shots } = JSON.parse(readFileSync(join(HERE, "shots.json"), "utf8"));
const only = process.argv.slice(2);
const targets = only.length ? shots.filter((s) => only.includes(s.id)) : shots;
const template = readFileSync(join(HERE, "frame.html"), "utf8");

mkdirSync(TMP, { recursive: true });
mkdirSync(OUTPUT, { recursive: true });
mkdirSync(PUBLIC, { recursive: true });

// 데몬이 파이프를 물고 있으면 끝나지 않으므로 첫 실행(데몬 기동)은 출력 연결 없이
execFileSync(process.execPath, [AB_JS, "--session", SESSION, "set", "viewport", "400", "900", "2"], { stdio: "ignore" });

let made = 0;
try {
  for (const shot of targets) {
    const png = join(RAW, `${shot.id}.png`);
    const meta = join(RAW, `${shot.id}.json`);
    // 촬영이 중간에 실패하면 png만 남고 좌표(json)가 없을 수 있다 — 둘 다 있어야 합성한다
    if (!existsSync(png) || !existsSync(meta)) {
      console.error(`✗ ${shot.id}: 캡처 없음 — 먼저 node guide/capture/capture.mjs ${shot.id}`);
      process.exitCode = 1;
      continue;
    }
    const { marks } = JSON.parse(readFileSync(meta, "utf8"));
    // 치환값은 함수로 넘긴다 — 문자열로 넘기면 경로·라벨 속 '$'+'&' 같은 글자가 치환 패턴으로 해석돼 JSON이 깨진다
    const html = template.replace("/*SHOT*/ null", () => JSON.stringify({ image: pathToFileURL(png).href, marks }));
    const htmlPath = join(TMP, `frame-${shot.id}.html`);
    writeFileSync(htmlPath, html);
    ab("open", pathToFileURL(htmlPath).href);
    ab("wait", "[data-ready]");
    const out = join(OUTPUT, `${shot.id}.png`);
    ab("screenshot", "#phone", out);
    copyFileSync(out, join(PUBLIC, `${shot.id}.png`));
    console.log(`✓ ${shot.id}`);
    made++;
  }
} finally {
  // 중간에 실패해도 브라우저 세션을 남기지 않는다(다음 실행이 같은 세션에 붙어 설정이 섞이지 않게)
  try {
    ab("close");
  } catch {
    /* 이미 닫힘 */
  }
}
console.log(`${made}/${targets.length}장 → public/guide/`);
