// 대결(versus) 미니게임 공용 타입 + 가위바위보 순수 로직.
// 순수 함수는 부수효과 없이 — 테스트 대상.

export type DuelGame = 'rps' | 'click';

// 도전 시 고를 수 있는 대결 목록 (PlayerCard 게임 선택 UI).
export const DUEL_GAMES: { key: DuelGame; label: string; short: string; rule: string }[] = [
  { key: 'rps', label: '가위바위보', short: '✊ 바위보', rule: '가위바위보 3판 2선' },
  { key: 'click', label: '연타 대결', short: '👆 연타', rule: '5초간 더 많이 클릭한 쪽 승' },
];

export function duelRule(game: DuelGame): string {
  return DUEL_GAMES.find((g) => g.key === game)?.rule ?? '';
}

// ── 연타 대결 (click) ───────────────────────────────────────
export const CLICK_COUNTDOWN = 3; // 시작 전 3·2·1 카운트다운(초)
export const CLICK_DURATION_MS = 5000; // 연타 시간

// 승/패 보상 (생산성은 내려가기만 — '순수 하락' 규칙 유지, 승점은 별도 트랙)
// 미니게임보다는 크지만, 한 판으로 확 떨어지지 않게 완화.
export const WIN_SLACK = 3; // 승자 생산성 하락폭
export const LOSE_SLACK = 0.5; // 패자 생산성 하락폭(참가상)

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
