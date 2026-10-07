// 사용 안내 경고 상자 — 되돌릴 수 없는 작업(삭제 등) 앞에 둔다
export function GuideWarning({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div role="note" className="mt-4 grid gap-1.5 rounded-2xl border-[1.5px] border-stamp bg-stamp/8 px-4 py-4">
      <strong className="text-lg text-stamp">⚠️ {title}</strong>
      <div className="text-ink/80 [&_ul]:list-disc [&_ul]:pl-5">{children}</div>
    </div>
  );
}
