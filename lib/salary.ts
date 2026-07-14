// Pure salary/countdown math extracted from the salary-loopang.html prototype.
// No Date.now() / globals inside — every function takes `now` as an explicit input.

// 출퇴근 시각은 "자정 기준 분(minutes of day, 0~1439)" 으로 표현한다 — 분 단위 설정 지원.
export const WORK_START = 9 * 60; // 출근 09:00 → 540
export const WORK_END = 18 * 60; // 퇴근 18:00 → 1080
export const MONTH_HOURS = 209; // 법정 월 근로시간

/** today at `minutesOfDay`(0~1439) since midnight, same Y/M/D as `now`, HH:MM:00.000 */
function todayAt(now: Date, minutesOfDay: number): Date {
  const d = new Date(now);
  d.setHours(Math.floor(minutesOfDay / 60), minutesOfDay % 60, 0, 0);
  return d;
}

/** 1초당 버는 돈 = 월급 / (월 근로시간 * 3600) */
export function perSecond(salaryMonthly: number): number {
  const salary = Math.max(0, salaryMonthly);
  return salary / (MONTH_HOURS * 3600);
}

/** 출근 시각부터 지금까지 적립된 금액 (0 ~ 하루 총 적립액 사이로 클램프) */
export function earnedNow(
  now: Date,
  salaryMonthly: number,
  workStart: number = WORK_START,
  workEnd: number = WORK_END,
): number {
  const start = todayAt(now, workStart);
  const end = todayAt(now, workEnd);

  const totalWork = (end.getTime() - start.getTime()) / 1000;
  let worked = (now.getTime() - start.getTime()) / 1000;
  worked = Math.min(Math.max(worked, 0), totalWork);

  return Math.floor(worked * perSecond(salaryMonthly));
}

/** 퇴근까지 남은 초 (음수가 되지 않도록 0으로 클램프) */
export function secondsUntilOffwork(now: Date, workEnd: number = WORK_END): number {
  const end = todayAt(now, workEnd);
  const diff = Math.floor((end.getTime() - now.getTime()) / 1000);
  return Math.max(0, diff);
}

export type WorkPhase = 'before' | 'working' | 'after';

/** 'before' 출근 전, 'after' 퇴근 후, 그 사이는 'working' */
export function workPhase(
  now: Date,
  workStart: number = WORK_START,
  workEnd: number = WORK_END,
): WorkPhase {
  const start = todayAt(now, workStart);
  const end = todayAt(now, workEnd);

  if (now.getTime() < start.getTime()) return 'before';
  if (now.getTime() >= end.getTime()) return 'after';
  return 'working';
}
