// 대결 결과 기록 — POST /api/duel/result { code, matchId, winnerId, loserId }
// 클라 권위 위조(콘솔에서 finish 호출로 승수 파밍)를 막기 위해 **양 피어 대조** 후에만 기록한다.
// 승자/패자 양쪽이 같은 결과를 각각 보고해야 커밋 → 원자적 increment_duel RPC(B5·B7).
// 대기 상태는 인메모리(단일 Railway 인스턴스 기준). 다중 인스턴스 전환 시 Redis 등 공유 저장소로 이관.
import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabaseServer';
import { normalizeRoomCode } from '@/lib/roomCode';
import { authenticatePlayer } from '@/lib/auth';
import { apiError, readJsonBody } from '@/lib/apiHelpers';
import { rateLimit, RATE } from '@/lib/rateLimit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Pending = { winnerId: string; loserId: string; reporters: Set<string>; ts: number };
const pending = new Map<string, Pending>(); // key: `${code}:${matchId}`
const PENDING_TTL_MS = 30_000;

function sweep(now: number) {
  for (const [k, v] of pending) if (now - v.ts > PENDING_TTL_MS) pending.delete(k);
}

export async function POST(req: Request) {
  const body = await readJsonBody(req);
  if (!body) return apiError('잘못된 요청 본문', 400);

  const code = normalizeRoomCode(String(body.code ?? ''));
  if (!code) return apiError('잘못된 방 코드', 400);

  const matchId = String(body.matchId ?? '');
  const winnerId = String(body.winnerId ?? '');
  const loserId = String(body.loserId ?? '');
  if (!matchId || !winnerId || !loserId || winnerId === loserId) {
    return apiError('잘못된 대결 정보', 400);
  }

  const reporterId = await authenticatePlayer(code);
  if (!reporterId) return apiError('인증되지 않은 요청', 401);
  if (!rateLimit(`duel:${reporterId}`, RATE.duel)) return apiError('요청이 너무 잦습니다', 429);
  // 보고자는 반드시 대결 당사자여야 한다.
  if (reporterId !== winnerId && reporterId !== loserId) {
    return apiError('대결 당사자가 아닙니다', 403);
  }

  const supabase = getSupabaseServer();
  // 승자·패자 모두 이 방 소속인지 확인.
  const { data: members } = await supabase
    .from('players')
    .select('id')
    .eq('room_code', code)
    .in('id', [winnerId, loserId]);
  if (!members || members.length !== 2) {
    return apiError('대결 참가자를 확인할 수 없습니다', 400);
  }

  const now = Date.now();
  sweep(now);
  const key = `${code}:${matchId}`;
  const existing = pending.get(key);

  if (!existing) {
    pending.set(key, { winnerId, loserId, reporters: new Set([reporterId]), ts: now });
    return NextResponse.json({ ok: true, status: 'pending' }, { status: 202 });
  }

  // 이미 대기 중인데 결과가 어긋나면 위조 의심 → 폐기.
  if (existing.winnerId !== winnerId || existing.loserId !== loserId) {
    pending.delete(key);
    return apiError('대결 결과가 일치하지 않습니다', 409);
  }

  existing.reporters.add(reporterId);
  // 양 당사자가 같은 결과를 보고했을 때만 확정.
  if (existing.reporters.has(winnerId) && existing.reporters.has(loserId)) {
    pending.delete(key);
    const { error } = await supabase.rpc('increment_duel', { winner: winnerId, loser: loserId });
    if (error) return apiError(error.message, 500);
    return NextResponse.json({ ok: true, status: 'recorded' }, { status: 200 });
  }

  return NextResponse.json({ ok: true, status: 'pending' }, { status: 202 });
}
