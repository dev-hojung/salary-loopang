// 공유 도메인 타입 (Supabase 테이블과 1:1 대응)

export type Player = {
  id: string;
  room_code: string;
  nickname: string;
  loopang_sec: number; // 누적 루팡 시간(초)
  productivity: number; // 생산성 지수(%)
  wins: number; // 대결 승수 (versus 미니게임)
  losses: number; // 대결 패수
  last_seen: string; // ISO timestamptz
};

export type Room = {
  code: string;
  title: string | null; // 방 제목 (생성 시 입력)
  created_at: string;
};

export type RoomState = {
  room_code: string;
  panic: boolean; // 부장님 경보 상태 (S2)
  panic_by: string | null;
  updated_at: string;
};

// /api/room 요청/응답 계약
export type CreateRoomResponse = { code: string; title: string | null };
export type JoinRoomResponse = { player: Player };
export type RoomApiError = { error: string };
