import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// 브라우저(anon) 클라이언트. 실시간 구독·읽기·본인 현황 갱신에 사용.
// 지연 초기화: SSR/빌드 시점이 아니라 브라우저 런타임(useEffect 등)에서만 생성한다.
let client: SupabaseClient | null = null;

export function getSupabaseBrowser(): SupabaseClient {
  if (!client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anon) {
      throw new Error(
        'Supabase 환경변수 누락: NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY (.env.local 확인)',
      );
    }
    client = createClient(url, anon, {
      realtime: { params: { eventsPerSecond: 10 } },
    });
  }
  return client;
}
