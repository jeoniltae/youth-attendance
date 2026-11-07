// 분석 전송 주소 정리 — 말씀노트 주소는 그 자체가 권한이라 토큰을 외부로 내보내지 않는다

export function redactNoteToken(url: string): string {
  return url.replace(/(\/notes\/c\/)[^/?#]+/, "$1[token]");
}
