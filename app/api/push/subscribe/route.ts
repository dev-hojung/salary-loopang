// Web Push 구독 등록 — POST /api/push/subscribe { code, subscription }
// 인증된 참여자의 브라우저 푸시 구독(endpoint+keys)을 저장. 실제 발송/스케줄러는 후속.
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
  if (!rateLimit(`push:${playerId}`, RATE.reset)) return apiError('요청이 너무 잦습니다', 429);

  const sub = body.subscription as
    | { endpoint?: string; keys?: { p256dh?: string; auth?: string } }
    | undefined;
  const endpoint = sub?.endpoint;
  const p256dh = sub?.keys?.p256dh;
  const auth = sub?.keys?.auth;
  if (!endpoint || !p256dh || !auth) return apiError('잘못된 구독 정보', 400);

  const supabase = getSupabaseServer();
  const { error } = await supabase.from('push_subscriptions').upsert(
    { player_id: playerId, room_code: code, endpoint, p256dh, auth },
    { onConflict: 'endpoint' },
  );
  if (error) return apiError(error.message, 500);

  return NextResponse.json({ ok: true }, { status: 200 });
}
