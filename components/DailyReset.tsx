'use client';

// S3 · 일일 리셋 + 전날 루팡왕 박제.
// 서버 크론이 없어, 접속 중인 클라이언트가 날짜 변경(로컬 자정)을 감지해 서버 라우트를 호출한다.
// 실제 박제·리셋 확정은 서버(/api/room/reset)가 KST 자정 기준으로 경합 안전하게 1회만 수행(서버 권위).
// 각 클라이언트는 롤오버를 감지하면 자기 로컬 생산성도 리셋(안 하면 하트비트가 되돌림).
import { useEffect, useRef, useState } from 'react';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { getSupabaseBrowser } from '@/lib/supabaseClient';
import { useProductivity } from '@/lib/productivity';
import type { RoomState } from '@/lib/types';

type ResetFields = Pick<RoomState, 'last_reset_date' | 'last_king_nick'>;

function todayStr(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function DailyReset({
  code,
  onKing,
}: {
  code: string;
  onKing?: (nick: string | null) => void;
}) {
  const { reset } = useProductivity();
  const [kingNick, setKingNick] = useState<string | null>(null);

  // 이미 반영한 리셋 날짜(로컬). 같은 날 중복 로컬 리셋 방지.
  const honoredRef = useRef<string | null>(null);

  useEffect(() => {
    let active = true;
    const supabase = getSupabaseBrowser();
    const channel = supabase.channel(`daily_reset:${code}`);

    // 서버에 리셋 판정을 위임(idempotent). 롤오버/최초 감지 시에만 호출.
    async function requestReset() {
      try {
        await fetch('/api/room/reset', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code }),
        });
      } catch (e) {
        console.error('일일 리셋 요청 실패', e);
      }
    }

    async function evaluate(rs: ResetFields) {
      if (!active) return;
      setKingNick(rs.last_king_nick ?? null);
      onKing?.(rs.last_king_nick ?? null);
      const today = todayStr();

      // 최초(null): 서버가 오늘을 baseline 으로 기록.
      if (rs.last_reset_date == null) {
        honoredRef.current = today;
        await requestReset();
        return;
      }

      if (rs.last_reset_date !== today) {
        // 날짜 롤오버 — 서버가 박제·리셋 확정. 내 로컬 생산성도 리셋.
        await requestReset();
        if (honoredRef.current !== today) {
          honoredRef.current = today;
          reset();
        }
      } else {
        honoredRef.current = today;
      }
    }

    async function init() {
      const { data } = await supabase
        .from('room_state')
        .select('last_reset_date, last_king_nick')
        .eq('room_code', code)
        .maybeSingle();
      await evaluate(data ?? { last_reset_date: null, last_king_nick: null });

      channel
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'room_state', filter: `room_code=eq.${code}` },
          (payload: RealtimePostgresChangesPayload<RoomState>) => {
            if (payload.eventType === 'DELETE') return;
            void evaluate(payload.new);
          },
        )
        .subscribe();
    }

    void init();

    // 앱을 열어둔 채 자정을 넘기는 경우도 잡도록 1분마다 재평가.
    const tick = setInterval(() => {
      supabase
        .from('room_state')
        .select('last_reset_date, last_king_nick')
        .eq('room_code', code)
        .maybeSingle()
        .then(({ data }) => {
          if (data) void evaluate(data);
        });
    }, 60000);

    return () => {
      active = false;
      clearInterval(tick);
      supabase.removeChannel(channel);
    };
  }, [code, reset, onKing]);

  if (!kingNick) return null;
  return (
    <div className="label" style={{ marginTop: 10 }}>
      <span className="badge">👑 어제의 루팡왕 · {kingNick}</span>
    </div>
  );
}
