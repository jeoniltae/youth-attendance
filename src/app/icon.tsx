// 파비콘 — "출석 도장" 모티프 (MemberCard의 출석 스탬프와 동일한 디자인 언어)
// 빌드 타임에 PNG로 생성되어 /icon으로 서빙됨 (SVG 미지원 브라우저 포함 전체 커버)

import { ImageResponse } from "next/og";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

// globals.css 팔레트의 근사 hex (satori는 oklch 미지원)
const STAMP = "#e05f3d"; // --stamp (테라코타)
const PAPER = "#fdfcf5"; // --paper (크림)

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: PAPER,
          borderRadius: 13,
        }}
      >
        {/* 도장 외곽 링 — 살짝 기울여 손으로 찍은 느낌 */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 54,
            height: 54,
            borderRadius: "50%",
            border: `4px solid ${STAMP}`,
            transform: "rotate(-10deg)",
          }}
        >
          {/* 이중 링 (도장 특유의 안쪽 얇은 선) */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 42,
              height: 42,
              borderRadius: "50%",
              border: `2px solid ${STAMP}`,
            }}
          >
            {/* 체크 마크 — L자를 -45° 회전 */}
            <div
              style={{
                width: 22,
                height: 12,
                borderLeft: `5px solid ${STAMP}`,
                borderBottom: `5px solid ${STAMP}`,
                transform: "rotate(-45deg) translate(1px, -3px)",
              }}
            />
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
