// 헬스체크 — GET /api/health. Supabase 왕복 1회로 "떠 있지만 DB 불통" 상태까지 감지.
// Railway 의 healthcheckPath 로 지정(railway.json). 정상 200, 장애 503.
import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabaseServer';
import { log } from '@/lib/log';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const startedAt = Date.now();
  try {
    const supabase = getSupabaseServer();
    // 가벼운 왕복: rooms 헤드 카운트(행 본문 없이 연결·권한만 확인).
    const { error } = await supabase.from('rooms').select('code', { count: 'exact', head: true });
    if (error) throw new Error(error.message);
    return NextResponse.json(
      { status: 'ok', db: 'up', latencyMs: Date.now() - startedAt },
      { status: 200 },
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : 'unknown';
    log.error('health_check_failed', { message, latencyMs: Date.now() - startedAt });
    return NextResponse.json({ status: 'error', db: 'down', message }, { status: 503 });
  }
}
