import { describe, expect, it } from 'vitest';
import {
  WORK_START,
  WORK_END,
  MONTH_HOURS,
  perSecond,
  earnedNow,
  secondsUntilOffwork,
  workPhase,
} from './salary';

const SALARY = 3_000_000;
// WORK_START/END 는 자정 기준 '분' → 근무 총 초 = (분 차이) * 60
const TOTAL_WORK_SECONDS = (WORK_END - WORK_START) * 60;

describe('perSecond', () => {
  it('is 0 for 0 salary', () => {
    expect(perSecond(0)).toBe(0);
  });

  it('matches salary / (MONTH_HOURS * 3600)', () => {
    expect(perSecond(SALARY)).toBeCloseTo(SALARY / (MONTH_HOURS * 3600));
  });
});

describe('before work (08:00)', () => {
  const now = new Date(2026, 6, 14, 8, 0, 0);

  it('earnedNow is 0', () => {
    expect(earnedNow(now, SALARY)).toBe(0);
  });

  it('workPhase is before', () => {
    expect(workPhase(now)).toBe('before');
  });

  it('secondsUntilOffwork is positive', () => {
    expect(secondsUntilOffwork(now)).toBeGreaterThan(0);
  });
});

describe('during work (13:30)', () => {
  const now = new Date(2026, 6, 14, 13, 30, 0);
  const fullDayEarnings = Math.floor(TOTAL_WORK_SECONDS * perSecond(SALARY));

  it('earnedNow is between 0 and full-day earnings', () => {
    const earned = earnedNow(now, SALARY);
    expect(earned).toBeGreaterThan(0);
    expect(earned).toBeLessThan(fullDayEarnings);
  });

  it('workPhase is working', () => {
    expect(workPhase(now)).toBe('working');
  });
});

describe('after work (19:00)', () => {
  const now = new Date(2026, 6, 14, 19, 0, 0);

  it('earnedNow equals the full-day earnings', () => {
    const expected = Math.floor(TOTAL_WORK_SECONDS * perSecond(SALARY));
    expect(earnedNow(now, SALARY)).toBe(expected);
  });

  it('workPhase is after', () => {
    expect(workPhase(now)).toBe('after');
  });

  it('secondsUntilOffwork is 0', () => {
    expect(secondsUntilOffwork(now)).toBe(0);
  });
});

describe('minute-level work times (09:30 ~ 18:15)', () => {
  const START = 9 * 60 + 30; // 09:30 → 570
  const END = 18 * 60 + 15; // 18:15 → 1095

  it('09:15 is before a 09:30 start', () => {
    const now = new Date(2026, 6, 14, 9, 15, 0);
    expect(workPhase(now, START, END)).toBe('before');
    expect(earnedNow(now, SALARY, START, END)).toBe(0);
  });

  it('09:45 is working after a 09:30 start', () => {
    const now = new Date(2026, 6, 14, 9, 45, 0);
    expect(workPhase(now, START, END)).toBe('working');
    expect(earnedNow(now, SALARY, START, END)).toBeGreaterThan(0);
  });

  it('secondsUntilOffwork honors the 18:15 end (15 min at 18:00)', () => {
    const now = new Date(2026, 6, 14, 18, 0, 0);
    expect(secondsUntilOffwork(now, END)).toBe(15 * 60);
  });
});
