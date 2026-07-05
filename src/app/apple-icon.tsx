// iOS 홈 화면 아이콘 (180×180) — icon.tsx와 동일한 "출석 도장" 디자인의 대형 버전
// iOS가 모서리를 자체 마스킹하므로 배경은 풀블리드

import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

const STAMP = "#e05f3d"; // --stamp (테라코타)
const PAPER = "#fdfcf5"; // --paper (크림)

export default function AppleIcon() {
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
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 148,
            height: 148,
            borderRadius: "50%",
            border: `11px solid ${STAMP}`,
            transform: "rotate(-10deg)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 114,
              height: 114,
              borderRadius: "50%",
              border: `5px solid ${STAMP}`,
            }}
          >
            <div
              style={{
                width: 60,
                height: 33,
                borderLeft: `14px solid ${STAMP}`,
                borderBottom: `14px solid ${STAMP}`,
                transform: "rotate(-45deg) translate(3px, -8px)",
              }}
            />
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
