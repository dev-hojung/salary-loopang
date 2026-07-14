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
const TOTAL_WORK_SECONDS = (WORK_END - WORK_START) * 3600;

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
