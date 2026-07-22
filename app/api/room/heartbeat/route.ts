// 하트비트 — 본인 현황 갱신(서버 권위). POST /api/room/heartbeat { code, productivity }
// loopang_sec 는 클라 값을 믿지 않고 서버가 last_seen~now 델타로 산출(상한 클램프).
// productivity 는 클라 게임 상태라 값은 받되 [0,100] 로 클램프하고, 반드시 본인 행에만 반영.
import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabaseServer';
import { normalizeRoomCode } from '@/lib/roomCode';
import { authenticatePlayer } from '@/lib/auth';
import { apiError, readJsonBody } from '@/lib/apiHelpers';
import { rateLimit, RATE } from '@/lib/rateLimit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_DELTA_SEC = 30; // 하트비트 사이 인정 최대 루팡 증가(초) — 폭주/조작 방어

export async function POST(req: Request) {
  const body = await readJsonBody(req);
  if (!body) return apiError('잘못된 요청 본문', 400);

  const code = normalizeRoomCode(String(body.code ?? ''));
  if (!code) return apiError('잘못된 방 코드', 400);

  const playerId = await authenticatePlayer(code);
  if (!playerId) return apiError('인증되지 않은 요청', 401);
  if (!rateLimit(`hb:${playerId}`, RATE.heartbeat)) return apiError('요청이 너무 잦습니다', 429);

  const supabase = getSupabaseServer();
  const { data: cur, error: readErr } = await supabase
    .from('players')
    .select('loopang_sec, last_seen')
    .eq('id', playerId)
    .maybeSingle();
  if (readErr) return apiError(readErr.message, 500);
  if (!cur) return apiError('플레이어를 찾을 수 없습니다', 404);

  const nowMs = Date.now();
  const lastMs = cur.last_seen ? Date.parse(cur.last_seen) : nowMs;
  const deltaSec = Math.min(MAX_DELTA_SEC, Math.max(0, Math.floor((nowMs - lastMs) / 1000)));
  const loopangSec = Math.max(0, Number(cur.loopang_sec ?? 0)) + deltaSec;

  const patch: Record<string, unknown> = {
    loopang_sec: loopangSec,
    last_seen: new Date(nowMs).toISOString(),
  };
  const rawProd = Number(body.productivity);
  if (Number.isFinite(rawProd)) {
    patch.productivity = Math.round(Math.min(100, Math.max(0, rawProd)) * 10) / 10;
  }

  const { error: updErr } = await supabase
    .from('players')
    .update(patch)
    .eq('id', playerId)
    .eq('room_code', code);
  if (updErr) return apiError(updErr.message, 500);

  return NextResponse.json({ ok: true, loopang_sec: loopangSec }, { status: 200 });
}
