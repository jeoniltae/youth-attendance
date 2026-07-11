import type { Metadata } from "next";
import { Gowun_Batang, IBM_Plex_Sans_KR } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { Providers } from "./providers";
import "./globals.css";

const display = Gowun_Batang({
  variable: "--font-display",
  weight: ["700"],
});

const body = IBM_Plex_Sans_KR({
  variable: "--font-body",
  weight: ["400", "500", "600"],
});

// VERCEL_URL은 배포마다 바뀌는 고유 URL이라 Deployment Protection(SSO)에 걸려
// 카카오톡 등 외부 크롤러가 접근할 수 없다 — 항상 공개된 production 별칭 도메인을 사용
const siteUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "서울광염교회 고등부 출석체크",
  description: "서울광염교회 고등부 출석 및 교적 관리",
  openGraph: {
    title: "서울광염교회 고등부 출석체크",
    description: "서울광염교회 고등부 출석 및 교적 관리",
    url: siteUrl,
    siteName: "서울광염교회 고등부 출석체크",
    images: [{ url: "/og-img.png", width: 992, height: 517 }],
    locale: "ko_KR",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${display.variable} ${body.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-paper text-ink font-body">
        <Providers>{children}</Providers>
        <Analytics />
      </body>
    </html>
  );
}
