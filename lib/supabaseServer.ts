import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// 서버 전용(service role) 클라이언트. API 라우트에서만 사용한다.
// service role 키는 절대 브라우저로 나가면 안 됨 → NEXT_PUBLIC_ 접두사 금지.
export function getSupabaseServer(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      'Supabase 서버 환경변수 누락: NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY',
    );
  }
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
