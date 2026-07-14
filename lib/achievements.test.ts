import { describe, it, expect } from 'vitest';
import type { Player } from './types';
import { evaluateAchievements, representativeTitle } from './achievements';

function mkPlayer(over: Partial<Player> = {}): Player {
  return {
    id: 'p1',
    room_code: 'ABCD',
    nickname: '테스터',
    loopang_sec: 0,
    productivity: 100,
    wins: 0,
    losses: 0,
    last_seen: '2026-07-14T09:00:00.000Z',
    ...over,
  };
}

const ids = (p: Player, ctx = {}) => evaluateAchievements(p, ctx).map((a) => a.id);

describe('evaluateAchievements', () => {
  it('갓 입장한 플레이어는 업적이 없다', () => {
    const p = mkPlayer();
    expect(evaluateAchievements(p)).toEqual([]);
    expect(representativeTitle(p)).toBeNull();
  });

  it('생산성 티어는 그룹당 최고 등급 하나만 (중복 티어 제거)', () => {
    // 생산성 25 → slacker(≤60)·pro(≤30) 조건 충족하지만 pro 만 노출
    const p = mkPlayer({ productivity: 25 });
    const got = ids(p);
    expect(got).toContain('pro-loopang');
    expect(got).not.toContain('slacker');
    expect(got).not.toContain('perfect-loopang'); // ≤10 아님
  });

  it('생산성 10 이하는 완전체 루팡(전설)', () => {
    const p = mkPlayer({ productivity: 8 });
    expect(ids(p)).toContain('perfect-loopang');
  });

  it('누적 루팡 시간 티어도 그룹당 하나', () => {
    const p = mkPlayer({ loopang_sec: 4000 }); // 1시간↑, 3시간 미만 → expert
    const got = ids(p);
    expect(got).toContain('loopang-expert');
    expect(got).not.toContain('loopang-rookie');
    expect(got).not.toContain('loopang-master');
  });

  it('무패 3승은 무결점 승부사, 대결 그룹 최고 등급으로 노출', () => {
    const p = mkPlayer({ wins: 6, losses: 0 });
    const got = ids(p);
    expect(got).toContain('flawless'); // epic
    expect(got).not.toContain('duel-king'); // 같은 그룹, 하위 등급
    expect(got).not.toContain('challenger');
  });

  it('패배가 있으면 무결점이 아니라 대결왕', () => {
    const p = mkPlayer({ wins: 5, losses: 2 });
    const got = ids(p);
    expect(got).toContain('duel-king');
    expect(got).not.toContain('flawless');
  });

  it('어제의 루팡왕은 ctx 로 판정', () => {
    const p = mkPlayer();
    expect(ids(p, { isYesterdayKing: true })).toContain('yesterday-king');
    expect(ids(p, { isYesterdayKing: false })).not.toContain('yesterday-king');
  });
});

describe('representativeTitle', () => {
  it('획득 중 가장 높은 등급을 대표 칭호로 반환', () => {
    // 완전체(전설) + 고수(레어) + 무결점(에픽) → 전설이 대표
    const p = mkPlayer({ productivity: 5, loopang_sec: 4000, wins: 4, losses: 0 });
    expect(representativeTitle(p)?.id).toBe('perfect-loopang');
  });

  it('결과는 등급 내림차순 정렬', () => {
    const p = mkPlayer({ productivity: 5, loopang_sec: 700, wins: 1 });
    const list = evaluateAchievements(p);
    for (let i = 1; i < list.length; i++) {
      // 앞이 뒤보다 같거나 높은 등급
      const order = { common: 0, rare: 1, epic: 2, legendary: 3 } as const;
      expect(order[list[i - 1].rarity]).toBeGreaterThanOrEqual(order[list[i].rarity]);
    }
  });
});
