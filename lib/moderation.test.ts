import { describe, it, expect } from 'vitest';
import { sanitizeText, isBlockedNickname } from '@/lib/moderation';

const ZW = String.fromCharCode(0x200b); // zero-width space
const CTRL = String.fromCharCode(0x00); // null 제어문자

describe('sanitizeText', () => {
  it('zero-width 제거', () => {
    expect(sanitizeText(`부장님${ZW}몰래`)).toBe('부장님몰래');
  });
  it('제어문자 제거', () => {
    expect(sanitizeText(`루${CTRL}팡`)).toBe('루팡');
  });
  it('연속 공백 축약 + 트림', () => {
    expect(sanitizeText('  루팡   왕  ')).toBe('루팡 왕');
  });
  it('일반 텍스트는 그대로', () => {
    expect(sanitizeText('3층 탕비실 루팡단')).toBe('3층 탕비실 루팡단');
  });
});

describe('isBlockedNickname', () => {
  it('금칙어 포함 시 차단', () => {
    expect(isBlockedNickname('시발러')).toBe(true);
    expect(isBlockedNickname('xXfuckXx')).toBe(true);
  });
  it('정상 닉네임은 허용', () => {
    expect(isBlockedNickname('부장님몰래')).toBe(false);
    expect(isBlockedNickname('루팡왕')).toBe(false);
  });
});
