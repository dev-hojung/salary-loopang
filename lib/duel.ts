// 대결(versus) 미니게임 공용 타입 + 가위바위보 순수 로직.
// 순수 함수는 부수효과 없이 — 테스트 대상.

export type DuelGame = 'rps';

// 승/패 보상 (생산성은 내려가기만 — '순수 하락' 규칙 유지, 승점은 별도 트랙)
export const WIN_SLACK = 8; // 승자 생산성 하락폭
export const LOSE_SLACK = 1; // 패자 생산성 하락폭(참가상)

export const CHALLENGE_TIMEOUT_MS = 15000; // 도전 무응답 자동 취소

// ── 가위바위보 ──────────────────────────────────────────────
export type RpsMove = 'rock' | 'paper' | 'scissors';
export const RPS_MOVES: RpsMove[] = ['rock', 'paper', 'scissors'];
export const RPS_LABEL: Record<RpsMove, string> = {
  rock: '✊ 바위',
  paper: '✋ 보',
  scissors: '✌️ 가위',
};
export const RPS_WIN_SCORE = 2; // 3판 2선

const RPS_BEATS: Record<RpsMove, RpsMove> = {
  rock: 'scissors',
  paper: 'rock',
  scissors: 'paper',
};

/** a 기준 결과: 1=a승, -1=b승, 0=비김 */
export function rpsCompare(a: RpsMove, b: RpsMove): number {
  if (a === b) return 0;
  return RPS_BEATS[a] === b ? 1 : -1;
}

// ── 브로드캐스트 이벤트 이름 (채널 duel:{code}) ──────────────
export const DUEL_EVENTS = {
  challenge: 'duel:challenge',
  accept: 'duel:accept',
  decline: 'duel:decline',
  input: 'duel:input',
  cancel: 'duel:cancel',
} as const;

export type DuelPeer = { id: string; nickname: string };
