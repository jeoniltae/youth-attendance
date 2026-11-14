// 사용 안내(/guide) 링크 미리보기(카톡 등) — 페이지가 클라이언트 컴포넌트라 metadata는 이 레이아웃에서 내보낸다.
// metadata는 얕게 합쳐져 openGraph를 쓰면 루트 값이 통째로 바뀌므로 이미지·사이트명도 다시 적는다(루트 layout.tsx와 같은 값).
// 주소의 #뒷부분은 서버로 오지 않아 항목마다 다른 카드는 만들 수 없다 — 항목 이름은 공유 문구 첫 줄로 전달한다.
import type { Metadata } from "next";

const TITLE = "고등부 출석부 사용 안내";
const DESCRIPTION = "출석 체크부터 학생 관리까지 휴대폰 화면으로 안내해요";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: "/guide",
    siteName: "서울광염교회 고등부 출석체크",
    images: [{ url: "/og-img.png", width: 992, height: 517 }],
    locale: "ko_KR",
    type: "website",
  },
};

export default function GuideLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
