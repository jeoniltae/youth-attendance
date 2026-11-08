// SermonNotes 탭과 헤더를 만든다 (멱등 — 이미 있으면 스킵). 배포 전·새해 시트마다 실행
// 실행: node scripts/add-sermon-notes-sheet.mjs

import { google } from 'googleapis';

process.loadEnvFile(new URL('../.env.local', import.meta.url));

const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID;
const TAB = 'SermonNotes';
const HEADER = ['Date', 'Session', 'Grade', 'Class', 'StudentID', 'Name', 'Timestamp'];

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});
const sheets = google.sheets({ version: 'v4', auth });

async function main() {
  const meta = await sheets.spreadsheets.get({
    spreadsheetId: SPREADSHEET_ID,
    fields: 'sheets.properties.title',
  });
  const exists = (meta.data.sheets ?? []).some((s) => s.properties?.title === TAB);

  if (exists) {
    console.log(`${TAB} 탭: 이미 존재`);
  } else {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: { requests: [{ addSheet: { properties: { title: TAB } } }] },
    });
    console.log(`${TAB} 탭: 추가 완료`);
  }

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${TAB}!1:1`,
  });
  if ((res.data.values?.[0] ?? []).length > 0) {
    console.log(`${TAB} 헤더: 이미 존재`);
    return;
  }
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${TAB}!A1`,
    valueInputOption: 'RAW',
    requestBody: { values: [HEADER] },
  });
  console.log(`${TAB} 헤더: 추가 완료`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
