'use client';

// S3 · 일일 리셋 + 전날 루팡왕 박제.
// 서버 크론이 없어, 접속 중인 클라이언트가 날짜 변경(로컬 자정)을 감지해 처리한다.
// - 날짜 롤오버 시 한 클라이언트가 경합 안전하게 선점(neq 조건부 update):
//     전날 1위(최저 생산성)를 last_king_nick 으로 박제 + 전원 DB 생산성 100 리셋.
// - 각 클라이언트는 롤오버를 감지하면 자기 로컬 생산성도 100 으로 리셋(안 하면 하트비트가 되돌림).
import { useEffect, useRef, useState } from 'react';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { getSupabaseBrowser } from '@/lib/supabaseClient';
import { useProductivity } from '@/lib/productivity';
import type { Player, RoomState } from '@/lib/types';

type ResetFields = Pick<RoomState, 'last_reset_date' | 'last_king_nick'>;

function todayStr(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// 최저 생산성(동률이면 누적 루팡 시간 많은 쪽) = 루팡왕.
function kingOf(players: Player[]): string | null {
  if (players.length === 0) return null;
  const sorted = [...players].sort(
    (a, b) => a.productivity - b.productivity || b.loopang_sec - a.loopang_sec,
  );
  return sorted[0]?.nickname ?? null;
}

export default function DailyReset({ code, players }: { code: string; players: Player[] }) {
  const { reset } = useProductivity();
  const [kingNick, setKingNick] = useState<string | null>(null);

  // 이미 반영한 리셋 날짜(로컬). 같은 날 중복 리셋 방지.
  const honoredRef = useRef<string | null>(null);
  // 최신 players 를 effect(1회 실행) 안에서 읽기 위한 ref.
  const playersRef = useRef<Player[]>(players);
  playersRef.current = players;

  useEffect(() => {
    let active = true;
    const supabase = getSupabaseBrowser();
    const channel = supabase.channel(`daily_reset:${code}`);

    async function evaluate(rs: ResetFields) {
      if (!active) return;
      setKingNick(rs.last_king_nick ?? null);
      const today = todayStr();

      // 최초(null): 점수 리셋 없이 오늘을 baseline 으로만 기록.
      if (rs.last_reset_date == null) {
        honoredRef.current = today;
        await supabase
          .from('room_state')
          .update({ last_reset_date: today })
          .eq('room_code', code)
          .is('last_reset_date', null);
        return;
      }

      if (rs.last_reset_date !== today) {
        // 날짜 롤오버 — 전날 루팡왕 박제 + 리셋 선점 (neq 로 한 명만 성공).
        const king = kingOf(playersRef.current);
        const { data: won } = await supabase
          .from('room_state')
          .update({ last_reset_date: today, last_king_nick: king })
          .eq('room_code', code)
          .neq('last_reset_date', today)
          .select('room_code');

        if (won && won.length > 0) {
          // 내가 선점 → 방 전원 DB 생산성 100 리셋.
          await supabase.from('players').update({ productivity: 100 }).eq('room_code', code);
          setKingNick(king);
        }

        // 내 로컬 생산성도 리셋 (하트비트가 100 을 DB 에 반영).
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
  }, [code, reset]);

  if (!kingNick) return null;
  return (
    <div className="label" style={{ marginTop: 10 }}>
      <span className="badge">👑 어제의 루팡왕 · {kingNick}</span>
    </div>
  );
}
