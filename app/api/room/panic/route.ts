// 부장님 경보 토글 — POST /api/room/panic { code, panic: boolean }
// 방 소속 인증된 참여자만 토글 가능. panic_by 닉네임은 서버가 본인 행에서 조회(클라 값 불신).
import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabaseServer';
import { normalizeRoomCode } from '@/lib/roomCode';
import { authenticatePlayer } from '@/lib/auth';
import { apiError, readJsonBody } from '@/lib/apiHelpers';
import { rateLimit, RATE } from '@/lib/rateLimit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const body = await readJsonBody(req);
  if (!body) return apiError('잘못된 요청 본문', 400);

  const code = normalizeRoomCode(String(body.code ?? ''));
  if (!code) return apiError('잘못된 방 코드', 400);

  const playerId = await authenticatePlayer(code);
  if (!playerId) return apiError('인증되지 않은 요청', 401);
  if (!rateLimit(`panic:${playerId}`, RATE.panic)) return apiError('요청이 너무 잦습니다', 429);

  const next = body.panic === true;
  const supabase = getSupabaseServer();

  let panicBy: string | null = null;
  if (next) {
    const { data } = await supabase
      .from('players')
      .select('nickname')
      .eq('id', playerId)
      .maybeSingle();
    panicBy = (data?.nickname as string | undefined) ?? null;
  }

  const { error } = await supabase
    .from('room_state')
    .update({ panic: next, panic_by: panicBy, updated_at: new Date().toISOString() })
    .eq('room_code', code);
  if (error) return apiError(error.message, 500);

  return NextResponse.json({ ok: true, panic: next }, { status: 200 });
}
