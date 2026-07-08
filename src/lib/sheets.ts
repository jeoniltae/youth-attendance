// Google Sheets API v4 클라이언트 — Service Account 인증

import { google } from 'googleapis';

function getAuth() {
  return new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

export function getSheetsClient() {
  const auth = getAuth();
  return google.sheets({ version: 'v4', auth });
}

export const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID!;

export const SHEET = {
  STUDENTS: 'Students',
  TEACHERS: 'Teachers',
  ATTENDANCE: 'Attendance',
} as const;

// 시트 이름 → sheetId(숫자) 매핑 (deleteRow의 batchUpdate에 필요)
async function getSheetTitleToIdMap(): Promise<Record<string, number>> {
  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.get({
    spreadsheetId: SPREADSHEET_ID,
    fields: 'sheets.properties',
  });

  const map: Record<string, number> = {};
  for (const sheet of res.data.sheets ?? []) {
    const title = sheet.properties?.title;
    const sheetId = sheet.properties?.sheetId;
    if (typeof title === 'string' && typeof sheetId === 'number') {
      map[title] = sheetId;
    }
  }
  return map;
}

// 헤더 행(1행)을 키로 사용해 시트 데이터를 객체 배열로 읽기
export async function readSheet(sheetName: string): Promise<Record<string, string>[]> {
  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: sheetName,
    valueRenderOption: 'FORMATTED_VALUE',
  });

  const rows = (res.data.values ?? []) as unknown[][];
  if (rows.length === 0) return [];

  const [header, ...dataRows] = rows;
  return dataRows.map((row) =>
    header.reduce<Record<string, string>>((acc, key, i) => {
      acc[String(key)] = String(row[i] ?? '');
      return acc;
    }, {}),
  );
}

// 행 추가 (RAW — 날짜처럼 보이는 문자열도 그대로 텍스트로 저장, 자동 변환 방지)
export async function appendRow(sheetName: string, row: string[]): Promise<void> {
  const sheets = getSheetsClient();
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: sheetName,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [row] },
  });
}

// 조건에 맞는 첫 행을 찾아 절대 행 번호(1-based, 헤더 포함) 반환. 없으면 null
export async function findRowNumber(
  sheetName: string,
  predicate: (row: Record<string, string>) => boolean,
): Promise<number | null> {
  const rows = await readSheet(sheetName);
  const index = rows.findIndex(predicate);
  return index === -1 ? null : index + 2;
}

// 특정 행 전체를 새 값으로 교체 (rowNumber는 1-based, 헤더 포함 절대 행 번호)
export async function updateRow(sheetName: string, rowNumber: number, values: string[]): Promise<void> {
  const sheets = getSheetsClient();
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A${rowNumber}`,
    valueInputOption: 'RAW',
    requestBody: { values: [values] },
  });
}

// 조건에 맞는 모든 행을 삭제하고 삭제된 행 수를 반환.
// 절대 행 번호를 내림차순으로 batchUpdate에 넣어(뒤 행부터 삭제) 인덱스 밀림을 방지한다.
export async function deleteRowsWhere(
  sheetName: string,
  predicate: (row: Record<string, string>) => boolean,
): Promise<number> {
  const rows = await readSheet(sheetName);
  const rowNumbers = rows
    .map((row, i) => ({ row, num: i + 2 })) // +2: 헤더(1) + 0-based → 1-based
    .filter(({ row }) => predicate(row))
    .map(({ num }) => num)
    .sort((a, b) => b - a);

  if (rowNumbers.length === 0) return 0;

  const sheets = getSheetsClient();
  const sheetIdMap = await getSheetTitleToIdMap();
  const sheetId = sheetIdMap[sheetName];
  if (sheetId === undefined) {
    throw new Error(`시트를 찾을 수 없습니다: ${sheetName}`);
  }

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      requests: rowNumbers.map((num) => ({
        deleteDimension: {
          range: {
            sheetId,
            dimension: 'ROWS',
            startIndex: num - 1,
            endIndex: num,
          },
        },
      })),
    },
  });
  return rowNumbers.length;
}

// 특정 행 삭제 (rowNumber는 1-based, 헤더 포함 절대 행 번호)
export async function deleteRow(sheetName: string, rowNumber: number): Promise<void> {
  const sheets = getSheetsClient();
  const sheetIdMap = await getSheetTitleToIdMap();
  const sheetId = sheetIdMap[sheetName];
  if (sheetId === undefined) {
    throw new Error(`시트를 찾을 수 없습니다: ${sheetName}`);
  }

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId,
              dimension: 'ROWS',
              startIndex: rowNumber - 1,
              endIndex: rowNumber,
            },
          },
        },
      ],
    },
  });
}
