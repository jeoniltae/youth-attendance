// 페이지 전환 크로스페이드 — App Router의 template.tsx는 라우트 이동마다 리마운트되므로
// 여기 붙인 진입 애니메이션이 매 이동마다 재생된다(layout.tsx는 유지되므로 안 됨).
//
// opacity만 쓰는 이유(중요): transform 기반 모션을 쓰면 이 래퍼가 containing block이 되어
// 내부의 position:fixed(AuthGateModal, FloatingSummaryBar)가 뷰포트가 아닌 래퍼 기준으로 잡혀
// 깨진다. MobileNavMenu가 같은 문제로 createPortal을 쓰고 있다(해당 파일 주석 참고).
//
// 지속시간이 짧은 이유: 각 페이지가 이미 rise-in 스태거(70ms 간격)로 순차 등장하므로,
// 전환이 길면 이중 애니메이션이 되어 답답해진다. 조정은 아래 duration 값만 바꾸면 된다.
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <div className="animate-[page-fade-in_0.14s_ease-out] motion-reduce:animate-none">
      {children}
    </div>
  );
}
