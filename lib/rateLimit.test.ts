import { describe, it, expect } from 'vitest';
import { rateLimit, clientIp, RATE } from '@/lib/rateLimit';

describe('rateLimit (토큰버킷)', () => {
  it('capacity 만큼 허용 후 초과분 차단', () => {
    const rule = { capacity: 3, refillPerSec: 0 };
    const key = 'test-capacity';
    expect(rateLimit(key, rule)).toBe(true);
    expect(rateLimit(key, rule)).toBe(true);
    expect(rateLimit(key, rule)).toBe(true);
    expect(rateLimit(key, rule)).toBe(false); // 4번째는 소진
    expect(rateLimit(key, rule)).toBe(false);
  });

  it('키가 다르면 버킷이 독립적', () => {
    const rule = { capacity: 1, refillPerSec: 0 };
    expect(rateLimit('test-indep-a', rule)).toBe(true);
    expect(rateLimit('test-indep-a', rule)).toBe(false);
    // 다른 키는 영향 없음
    expect(rateLimit('test-indep-b', rule)).toBe(true);
  });

  it('RATE 정책 값이 유효(capacity>0, refill>=0)', () => {
    for (const [name, r] of Object.entries(RATE)) {
      expect(r.capacity, name).toBeGreaterThan(0);
      expect(r.refillPerSec, name).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('clientIp', () => {
  it('x-forwarded-for 의 첫 IP 를 사용', () => {
    const req = new Request('http://x', {
      headers: { 'x-forwarded-for': '1.2.3.4, 5.6.7.8' },
    });
    expect(clientIp(req)).toBe('1.2.3.4');
  });

  it('x-forwarded-for 없으면 x-real-ip 폴백', () => {
    const req = new Request('http://x', { headers: { 'x-real-ip': '9.9.9.9' } });
    expect(clientIp(req)).toBe('9.9.9.9');
  });

  it('둘 다 없으면 unknown', () => {
    expect(clientIp(new Request('http://x'))).toBe('unknown');
  });
});
