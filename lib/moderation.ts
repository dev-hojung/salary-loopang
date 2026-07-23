// 어뷰징 가드 — 닉네임/방제 정규화 + 금칙어 + 정원 상수. 서버(route)에서 사용.

// 제거 대상 코드포인트: 제어문자(0x00-0x1F, 0x7F-0x9F), zero-width(0x200B-0x200D), BOM(0xFEFF), word-joiner(0x2060).
// (정규식 리터럴에 특수문자를 넣지 않도록 코드포인트로 필터 → 소스는 순수 ASCII.)
function isRemovable(cp: number): boolean {
  if (cp <= 0x1f) return true;
  if (cp >= 0x7f && cp <= 0x9f) return true;
  if (cp >= 0x200b && cp <= 0x200d) return true;
  if (cp === 0xfeff || cp === 0x2060) return true;
  return false;
}

// 제어문자·zero-width 제거, 유니코드 정규화(NFC), 연속 공백 축약, 트림.
export function sanitizeText(raw: string): string {
  const cleaned = Array.from(raw.normalize('NFC'))
    .filter((ch) => !isRemovable(ch.codePointAt(0) ?? 0))
    .join('');
  return cleaned.replace(/\s+/g, ' ').trim();
}

// 스타터 금칙어 목록(부분 문자열, 정규화 후). 운영하며 확장.
const BLOCKLIST = [
  '시발', '씨발', 'ㅅㅂ', '병신', 'ㅂㅅ', '존나', '새끼', '좆', '지랄', '개새',
  'fuck', 'shit', 'bitch', 'asshole', 'nigger',
];

export function isBlockedNickname(name: string): boolean {
  const c = name.toLowerCase().replace(/\s+/g, '');
  return BLOCKLIST.some((w) => c.includes(w));
}

export const NICK_MIN = 1;
export const NICK_MAX = 20;
export const TITLE_MAX = 40;
export const MAX_ROOM_PLAYERS = 30; // 방 정원 상한(스팸·Realtime 팬아웃 방어)
