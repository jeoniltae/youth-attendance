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
