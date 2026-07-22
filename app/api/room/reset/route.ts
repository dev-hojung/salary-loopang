// 일일 리셋 + 전날 루팡왕 박제 (서버 게이트) — POST /api/room/reset { code }
// 클라가 날짜 롤오버를 감지해 호출하면, 서버가 KST 자정 기준으로 경합 안전하게 1회만 확정한다.
// (P1에서 pg_cron/Edge Function 서버 크론으로 승격 예정.)
import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabaseServer';
import { normalizeRoomCode } from '@/lib/roomCode';
import { authenticatePlayer } from '@/lib/auth';
import { apiError, readJsonBody } from '@/lib/apiHelpers';
import { rateLimit, RATE } from '@/lib/rateLimit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type KingRow = { nickname: string; productivity: number; loopang_sec: number };

// 서버 TZ 와 무관하게 KST(Asia/Seoul) 자정 기준 날짜. en-CA → YYYY-MM-DD.
function kstToday(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' });
}

// 최저 생산성(동률이면 누적 루팡 시간 많은 쪽) = 루팡왕.
function kingOf(players: KingRow[]): KingRow | null {
  if (players.length === 0) return null;
  return [...players].sort(
    (a, b) => a.productivity - b.productivity || b.loopang_sec - a.loopang_sec,
  )[0];
}

export async function POST(req: Request) {
  const body = await readJsonBody(req);
  if (!body) return apiError('잘못된 요청 본문', 400);

  const code = normalizeRoomCode(String(body.code ?? ''));
  if (!code) return apiError('잘못된 방 코드', 400);

  const playerId = await authenticatePlayer(code);
  if (!playerId) return apiError('인증되지 않은 요청', 401);
  if (!rateLimit(`reset:${playerId}`, RATE.reset)) return apiError('요청이 너무 잦습니다', 429);

  const supabase = getSupabaseServer();
  const { data: rs, error: rsErr } = await supabase
    .from('room_state')
    .select('last_reset_date, last_king_nick')
    .eq('room_code', code)
    .maybeSingle();
  if (rsErr) return apiError(rsErr.message, 500);
  if (!rs) return apiError('방 상태를 찾을 수 없습니다', 404);

  const today = kstToday();

  // 최초(null): 점수 리셋 없이 오늘을 baseline 으로만 기록.
  if (rs.last_reset_date == null) {
    await supabase
      .from('room_state')
      .update({ last_reset_date: today })
      .eq('room_code', code)
      .is('last_reset_date', null);
    return NextResponse.json({ ok: true, status: 'baseline', king: rs.last_king_nick ?? null });
  }

  // 날짜 롤오버 — 경합 안전 선점(neq)으로 한 요청만 확정.
  if (rs.last_reset_date !== today) {
    const { data: players } = await supabase
      .from('players')
      .select('nickname, productivity, loopang_sec')
      .eq('room_code', code);
    const king = kingOf((players ?? []) as KingRow[]);

    const { data: won } = await supabase
      .from('room_state')
      .update({ last_reset_date: today, last_king_nick: king?.nickname ?? null })
      .eq('room_code', code)
      .neq('last_reset_date', today)
      .select('room_code');

    if (won && won.length > 0) {
      // 방금 끝난 날(rs.last_reset_date)의 루팡왕을 일별 기록에 박제.
      await supabase.from('daily_records').upsert(
        {
          room_code: code,
          date: rs.last_reset_date,
          king_nick: king?.nickname ?? null,
          king_productivity: king ? Math.round(king.productivity * 10) / 10 : null,
        },
        { onConflict: 'room_code,date' },
      );
      // 방 전원 생산성 100 리셋.
      await supabase.from('players').update({ productivity: 100 }).eq('room_code', code);
      return NextResponse.json({ ok: true, status: 'rolled', king: king?.nickname ?? null });
    }
    // 다른 요청이 이미 선점.
    return NextResponse.json({ ok: true, status: 'already', king: rs.last_king_nick ?? null });
  }

  return NextResponse.json({ ok: true, status: 'current', king: rs.last_king_nick ?? null });
}
