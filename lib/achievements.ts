// B-4 · 칭호·업적 판정 (순수 로직 — 부수효과 없음, 테스트 대상).
// 기존 Player 데이터만으로 판정(Phase 1). 생산성이 낮을수록 상위 업적.
import type { Player } from '@/lib/types';

export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';

export type Achievement = {
  id: string;
  emoji: string;
  label: string;
  rarity: Rarity;
  desc: string; // 조건 설명 (툴팁)
};

// 대표 칭호 선정 · 정렬용 등급 우선순위.
export const RARITY_ORDER: Record<Rarity, number> = {
  common: 0,
  rare: 1,
  epic: 2,
  legendary: 3,
};

// 등급별 색상 (알파 합성 위해 hex).
export const RARITY_COLOR: Record<Rarity, string> = {
  common: '#868e96',
  rare: '#0d7a72',
  epic: '#7048e8',
  legendary: '#c99700',
};

// 판정에 필요한 추가 맥락.
export type AchievementCtx = {
  isYesterdayKing?: boolean; // room_state.last_king_nick == 이 플레이어
};

// 같은 group 은 최고 등급 하나만 노출(누적 티어 중복 방지). group 없으면 항상 노출.
type Group = 'productivity' | 'loopang' | 'duel';
type Rule = Achievement & { group?: Group; earned: (p: Player, ctx: AchievementCtx) => boolean };

const wins = (p: Player) => p.wins ?? 0;
const losses = (p: Player) => p.losses ?? 0;

const RULES: Rule[] = [
  // 생산성 티어
  { id: 'perfect-loopang', emoji: '💀', label: '완전체 루팡', rarity: 'legendary', group: 'productivity', desc: '생산성 10 이하', earned: (p) => p.productivity <= 10 },
  { id: 'pro-loopang', emoji: '🕵️', label: '프로 루팡러', rarity: 'epic', group: 'productivity', desc: '생산성 30 이하', earned: (p) => p.productivity <= 30 },
  { id: 'slacker', emoji: '🛋️', label: '슬슬 딴짓러', rarity: 'common', group: 'productivity', desc: '생산성 60 이하', earned: (p) => p.productivity <= 60 },
  // 누적 루팡 시간 티어
  { id: 'loopang-rookie', emoji: '☕', label: '루팡 입문', rarity: 'common', group: 'loopang', desc: '누적 루팡 10분 이상', earned: (p) => p.loopang_sec >= 600 },
  { id: 'loopang-expert', emoji: '🏖️', label: '루팡 고수', rarity: 'rare', group: 'loopang', desc: '누적 루팡 1시간 이상', earned: (p) => p.loopang_sec >= 3600 },
  { id: 'loopang-master', emoji: '🏝️', label: '루팡 마스터', rarity: 'epic', group: 'loopang', desc: '누적 루팡 3시간 이상', earned: (p) => p.loopang_sec >= 10800 },
  // 대결
  { id: 'challenger', emoji: '⚔️', label: '도전자', rarity: 'common', group: 'duel', desc: '대결 1승 이상', earned: (p) => wins(p) >= 1 },
  { id: 'duel-king', emoji: '🏆', label: '대결왕', rarity: 'rare', group: 'duel', desc: '대결 5승 이상', earned: (p) => wins(p) >= 5 },
  { id: 'flawless', emoji: '😎', label: '무결점 승부사', rarity: 'epic', group: 'duel', desc: '3승 이상 & 무패', earned: (p) => wins(p) >= 3 && losses(p) === 0 },
  // 특별 (group 없음 — 항상 노출)
  { id: 'yesterday-king', emoji: '🥈', label: '어제의 루팡왕', rarity: 'epic', desc: '어제 루팡왕 등극', earned: (_p, ctx) => !!ctx.isYesterdayKing },
];

function strip({ earned, group, ...a }: Rule): Achievement {
  void earned;
  void group;
  return a;
}

// 전체 업적 정의 (미획득 목록 표시용).
export const ALL_ACHIEVEMENTS: Achievement[] = RULES.map(strip);

// 획득 업적 (그룹별 최고 등급 + 특별 전부), 등급 높은 순 정렬.
export function evaluateAchievements(p: Player, ctx: AchievementCtx = {}): Achievement[] {
  const bestByGroup = new Map<Group, Rule>();
  const ungrouped: Rule[] = [];

  for (const rule of RULES) {
    if (!rule.earned(p, ctx)) continue;
    if (!rule.group) {
      ungrouped.push(rule);
      continue;
    }
    const prev = bestByGroup.get(rule.group);
    if (!prev || RARITY_ORDER[rule.rarity] > RARITY_ORDER[prev.rarity]) {
      bestByGroup.set(rule.group, rule);
    }
  }

  return [...bestByGroup.values(), ...ungrouped]
    .map(strip)
    .sort((a, b) => RARITY_ORDER[b.rarity] - RARITY_ORDER[a.rarity]);
}

// 대표 칭호 = 획득 중 최고 등급 (없으면 null).
export function representativeTitle(p: Player, ctx: AchievementCtx = {}): Achievement | null {
  return evaluateAchievements(p, ctx)[0] ?? null;
}
