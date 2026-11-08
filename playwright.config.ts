import { defineConfig } from "@playwright/test";

const PORT = 3200;

export default defineConfig({
  testDir: "./tests/e2e",
  use: { baseURL: `http://localhost:${PORT}` },
  webServer: {
    // 구글 설정을 무효값으로 덮는다 — 프로세스 환경변수가 .env.local보다 우선이라 이 서버는 실시트에 닿을 수 없다
    command: `npx next dev -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    env: {
      GOOGLE_SPREADSHEET_ID: "disabled-for-e2e",
      GOOGLE_SERVICE_ACCOUNT_EMAIL: "disabled@e2e.invalid",
      GOOGLE_PRIVATE_KEY: "disabled",
    },
  },
});
