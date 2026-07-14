// 방 코드: 4자리 대문자+숫자. 혼동 문자(O/0, I/1) 제외.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // O,0,I,1 제외
export const ROOM_CODE_LENGTH = 4;

export function generateRoomCode(length: number = ROOM_CODE_LENGTH): string {
  let code = '';
  for (let i = 0; i < length; i++) {
    code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return code;
}

const ROOM_CODE_RE = new RegExp(`^[${ALPHABET}]{${ROOM_CODE_LENGTH}}$`);

// 입력을 대문자로 정규화한 뒤 형식 검증. 통과 시 정규화된 코드, 실패 시 null.
export function normalizeRoomCode(raw: string): string | null {
  const code = (raw ?? '').trim().toUpperCase();
  return ROOM_CODE_RE.test(code) ? code : null;
}

export function isValidRoomCode(raw: string): boolean {
  return normalizeRoomCode(raw) !== null;
}
