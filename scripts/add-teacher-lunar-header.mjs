// Teachers 시트에 Lunar 헤더가 없으면 맨 끝 열에 추가 (멱등 — 이미 있으면 스킵)
// 음력 생일 체크박스 기능 추가에 필요. 실시트 전환 시(Phase 8-B)에도 재실행 필요.
// 실행: node scripts/add-teacher-lunar-header.mjs

import { readFileSync } from 'node:fs';
import { google } from 'googleapis';

function loadEnvLocal() {
  const text = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
  const env = {};
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

const env = loadEnvLocal();
const SPREADSHEET_ID = env.GOOGLE_SPREADSHEET_ID;

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});
const sheets = google.sheets({ version: 'v4', auth });

async function ensureLunarHeader() {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: 'Teachers!1:1',
    valueRenderOption: 'FORMATTED_VALUE',
  });
  const header = (res.data.values?.[0] ?? []).map(String);
  if (header.includes('Lunar')) {
    console.log(`Lunar 헤더: 이미 존재 (${header.indexOf('Lunar') + 1}열)`);
    return;
  }
  const col = header.length + 1;
  const colLetter = String.fromCharCode(64 + col);
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `Teachers!${colLetter}1`,
    valueInputOption: 'RAW',
    requestBody: { values: [['Lunar']] },
  });
  console.log(`Lunar 헤더: ${colLetter}1에 추가 완료`);
}

ensureLunarHeader().catch((err) => {
  console.error(err);
  process.exit(1);
});
