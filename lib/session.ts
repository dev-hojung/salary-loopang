// 방별 내 플레이어 세션을 localStorage 에 보관 (계정 없음 — PRD §2).
// 새로고침/재방문 시 같은 player 로 이어지도록.

export type PlayerSession = {
  id: string; // players.id (uuid)
  nickname: string;
  room_code: string;
};

const storageKey = (code: string) => `loopang:player:${code.toUpperCase()}`;

export function savePlayerSession(s: PlayerSession): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(storageKey(s.room_code), JSON.stringify(s));
}

export function loadPlayerSession(code: string): PlayerSession | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(storageKey(code));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PlayerSession;
  } catch {
    return null;
  }
}

export function clearPlayerSession(code: string): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(storageKey(code));
}
