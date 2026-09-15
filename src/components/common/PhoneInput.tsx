// 연락처 입력칸 — 타이핑하는 대로 하이픈을 넣어준다 (학생 폼 2곳 · 교사 폼 1곳 공용)
//
// 값을 고쳐 쓰는 입력칸의 고질적인 문제는 커서다. 제어 input의 value를 바꾸면 브라우저가
// 커서를 맨 끝으로 보내버려서, 번호 가운데를 고치려 하면 커서가 튄다.
// 그래서 "포맷 전 커서 앞에 숫자가 몇 개였는지"를 세어 두고, 포맷 후 같은 숫자 개수 뒤로
// 커서를 돌려놓는다. 하이픈이 몇 개 늘고 줄었는지와 무관하게 위치가 유지된다.

'use client';

import { useEffect, useRef, useState } from 'react';
import { formatPhoneInput } from '@/lib/phone';

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
}

export function PhoneInput({ value, onChange, className, placeholder }: PhoneInputProps) {
  const ref = useRef<HTMLInputElement>(null);
  // 포맷 후 커서를 놓을 자리. null이면 복원하지 않는다(외부에서 값이 바뀐 경우 등)
  const [caret, setCaret] = useState<number | null>(null);

  // value가 화면에 반영된 뒤에 커서를 옮겨야 한다 — onChange 안에서 옮기면 렌더가 덮어쓴다
  useEffect(() => {
    if (caret === null || !ref.current) return;
    ref.current.setSelectionRange(caret, caret);
    setCaret(null);
  }, [value, caret]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const next = e.target.value;
    const cursor = e.target.selectionStart ?? next.length;
    // 커서 앞의 '숫자 개수' — 하이픈은 세지 않으므로 포맷이 바뀌어도 기준이 흔들리지 않는다
    const digitsBefore = next.slice(0, cursor).replace(/\D/g, '').length;

    const formatted = formatPhoneInput(next);
    onChange(formatted);

    // 같은 숫자 개수를 지난 지점까지 전진
    let pos = 0;
    let seen = 0;
    while (pos < formatted.length && seen < digitsBefore) {
      if (/\d/.test(formatted[pos])) seen += 1;
      pos += 1;
    }
    setCaret(pos);
  }

  return (
    <input
      ref={ref}
      // 모바일에서 숫자 키패드를 띄운다. type="tel"이라 하이픈·괄호도 그대로 입력된다
      type="tel"
      inputMode="tel"
      className={className}
      value={value}
      onChange={handleChange}
      placeholder={placeholder}
    />
  );
}
