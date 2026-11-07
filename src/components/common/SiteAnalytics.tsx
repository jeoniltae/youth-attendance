"use client";
// Vercel Analytics 래퍼 — beforeSend는 함수라 서버 컴포넌트인 레이아웃에서 바로 넘길 수 없어 분리

import { Analytics, type BeforeSendEvent } from "@vercel/analytics/next";
import { redactNoteToken } from "@/lib/analytics";

function beforeSend(event: BeforeSendEvent): BeforeSendEvent {
  return { ...event, url: redactNoteToken(event.url) };
}

export function SiteAnalytics() {
  return <Analytics beforeSend={beforeSend} />;
}
