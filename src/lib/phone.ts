// 전화번호 하이픈 표기 유틸 — 입력 중(폼)과 표시(교적부·교사 현황) 양쪽에서 쓴다.
//
// 시트의 연락처 컬럼은 검증 없는 자유 문자열이라 번호만 들어 있지 않다. 실측(820칸) 기준:
//   725칸  010-0000-0000            ← 대다수는 이미 하이픈이 있다
//     11칸  010-0000-0000(모),010-0000-0000(부)   ← 쉼표/줄바꿈으로 이어붙인 복수 번호 + 관계 표기
//      2칸  01000000000             ← 하이픈 없음
//      2칸  010 0000 0000           ← 공백 구분
//      1칸  휴대폰없음               ← 번호가 아예 아님
//      1칸  0000-00-00              ← 생년월일이 잘못 들어간 것으로 보임
//
// 그래서 "무조건 숫자만 남겨 다시 끊는" 방식은 쓸 수 없다. 관계 표기를 지우거나,
// 번호가 아닌 값을 번호처럼 끊어버린다. 아래 두 함수는 **번호로 보일 때만** 손댄다.

/** 하이픈을 넣을 자리 (앞에서부터 끊을 자릿수) */
function splitPoints(digits: string): number[] {
  // 서울 지역번호만 2자리
  if (digits.startsWith('02')) return digits.length > 9 ? [2, 4, 4] : [2, 3, 4];
  // 010은 항상 11자리(3-4-4)로 고정한다 — 입력 중에 [3,3,4]↔[3,4,4]로 바뀌면
  // 10번째 글자에서 하이픈 위치가 튀어 커서가 흔들린다
  if (digits.startsWith('010')) return [3, 4, 4];
  // 011·016~019는 10자리(3-3-4)가 기본, 11자리면 3-4-4
  if (digits.startsWith('01')) return digits.length > 10 ? [3, 4, 4] : [3, 3, 4];
  // 15xx·16xx·18xx 대표번호는 지역번호가 없는 8자리
  if (/^1[5-9]/.test(digits)) return [4, 4];
  // 그 외 지역번호(031·032…)
  return digits.length > 10 ? [3, 4, 4] : [3, 3, 4];
}

/** 숫자열을 splitPoints 기준으로 끊는다. 자릿수가 덜 찼으면 찬 만큼만 끊는다 */
function hyphenate(digits: string): string {
  const parts: string[] = [];
  let i = 0;
  for (const len of splitPoints(digits)) {
    if (i >= digits.length) break;
    parts.push(digits.slice(i, i + len));
    i += len;
  }
  // splitPoints가 예상한 길이보다 숫자가 많으면 남은 건 그대로 뒤에 붙인다
  if (i < digits.length) parts.push(digits.slice(i));
  return parts.join('-');
}

/** 완성된 한국 전화번호로 볼 수 있는 자릿수인가 */
function isCompletePhone(digits: string): boolean {
  return (
    /^02\d{7,8}$/.test(digits) || // 02-123-4567 / 02-1234-5678
    /^01\d{8,9}$/.test(digits) || // 010-0000-0000 / 011-000-0000
    /^0[3-6]\d{7,9}$/.test(digits) || // 031-123-4567 등 지역번호
    /^1[5-9]\d{6}$/.test(digits) // 1588-1234
  );
}

/**
 * 폼 입력용 — 타이핑 도중의 미완성 값도 지금까지 친 만큼 끊어준다.
 *
 * 숫자와 하이픈 외의 글자가 하나라도 있으면 **손대지 않고 그대로 돌려준다.**
 * `010-0000-0000(모),010-0000-0000(부)` 처럼 관계 표기나 복수 번호를 적는 경우가
 * 실제로 있어서, 그런 입력까지 번호로 끊으면 적을 방법이 없어진다.
 */
export function formatPhoneInput(value: string): string {
  if (/[^\d-]/.test(value)) return value;

  const digits = value.replace(/-/g, '');
  // 0 또는 1로 시작하지 않으면 전화번호가 아니다(생년월일 오입력 등) — 건드리지 않는다
  if (!digits || !/^[01]/.test(digits)) return value;

  return hyphenate(digits);
}

/**
 * 표시용 — 저장된 값의 **앞쪽 번호 부분만** 하이픈 표기로 바꾸고 뒤의 설명은 남긴다.
 * 예) `01000000000(모)` → `010-0000-0000(모)`
 *
 * 완성된 번호로 보일 때만 바꾼다. `휴대폰없음`·`0000-00-00`처럼 번호가 아닌 값은
 * 원본 그대로 둔다 — 화면에서 원본을 확인할 수 있어야 시트를 고칠 수 있다.
 */
export function formatPhoneDisplay(value: string): string {
  const raw = value.trim();
  if (!raw) return raw;

  // 앞에서부터 이어지는 숫자·하이픈·공백 덩어리 = 번호 후보, 그 뒤는 설명으로 본다
  const head = raw.match(/^[\d\s-]+/);
  if (!head) return raw;

  const digits = head[0].replace(/\D/g, '');
  if (!isCompletePhone(digits)) return raw;

  return hyphenate(digits) + raw.slice(head[0].length);
}

/**
 * 한 칸에 여러 번호가 들어있는 경우를 쪼갠다.
 * 쉼표뿐 아니라 **줄바꿈**도 구분자로 본다 — 시트에 줄바꿈으로 두 번호를 적은 칸이 있는데,
 * 쉼표만 기준으로 자르면 두 번호가 한 덩어리가 되어 tel: 링크에 번호가 붙어버린다.
 */
export function splitPhones(value: string): string[] {
  return value
    .split(/[,\n]/)
    .map((p) => p.trim())
    .filter(Boolean);
}
