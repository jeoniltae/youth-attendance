// 반별 말씀노트 QR 주소 목록을 출력한다. 출력에 실제 토큰이 있으므로 저장소에 남기지 않는다
// 실행: node scripts/print-notes-qr-urls.mjs https://배포주소

import { google } from 'googleapis';
import { makeClassToken } from '../src/lib/notes-token.ts';

process.loadEnvFile(new URL('../.env.local', import.meta.url));

const baseUrl = (process.argv[2] ?? 'http://localhost:3000').replace(/\/$/, '');

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
});
const sheets = google.sheets({ version: 'v4', auth });

async function main() {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SPREADSHEET_ID,
    range: 'Students',
  });
  const [header, ...rows] = res.data.values ?? [];
  const col = (name) => header.indexOf(name);

  const classes = new Map();
  for (const row of rows) {
    const session = row[col('Session')] ?? '';
    const grade = row[col('Grade')] ?? '';
    const klass = row[col('Class')] ?? '';
    if (!session || !klass || grade === '새친구') continue;
    classes.set(`${session} ${grade}학년 ${klass}반`, makeClassToken(session, grade, klass));
  }

  for (const [label, token] of [...classes].sort(([a], [b]) => a.localeCompare(b, 'ko'))) {
    console.log(`${label}\t${baseUrl}/notes/c/${token}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
