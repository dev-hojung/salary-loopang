'use client';

// S2 · 부장님 경보 (보스키) — 방 전체가 공유하는 패닉 상태.
// - 누구나 "부장님 떴다" 트리거 → room_state.panic=true 로 DB 갱신.
// - postgres_changes 구독으로 방 전원 화면에 위장 오버레이(가짜 업무 화면)가 즉시 뜬다.
// - 아무나 "상황 종료"로 해제(panic=false).
import { useCallback, useEffect, useState } from 'react';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { getSupabaseBrowser } from '@/lib/supabaseClient';
import type { RoomState } from '@/lib/types';

export default function BossAlert({ code, meNickname }: { code: string; meNickname: string }) {
  const [panic, setPanic] = useState(false);
  const [panicBy, setPanicBy] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // 초기 상태 로드 + 실시간 구독. (트리거한 본인도 postgres_changes 에코로 반영됨)
  useEffect(() => {
    let active = true;
    const supabase = getSupabaseBrowser();
    const channel = supabase.channel(`room_state:${code}`);

    function apply(row: Pick<RoomState, 'panic' | 'panic_by'>) {
      setPanic(!!row.panic);
      setPanicBy(row.panic_by ?? null);
    }

    async function init() {
      const { data } = await supabase
        .from('room_state')
        .select('panic, panic_by')
        .eq('room_code', code)
        .maybeSingle();
      if (!active) return;
      if (data) apply(data as Pick<RoomState, 'panic' | 'panic_by'>);

      channel
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'room_state', filter: `room_code=eq.${code}` },
          (payload: RealtimePostgresChangesPayload<RoomState>) => {
            if (payload.eventType === 'DELETE') return;
            apply(payload.new);
          },
        )
        .subscribe();
    }

    init();
    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [code]);

  const setPanicState = useCallback(
    async (next: boolean) => {
      setBusy(true);
      // 트리거 즉시 체감되도록 낙관적 반영(브로드캐스트 에코가 곧 덮어씀).
      setPanic(next);
      setPanicBy(next ? meNickname : null);
      const { error } = await getSupabaseBrowser()
        .from('room_state')
        .update({
          panic: next,
          panic_by: next ? meNickname : null,
          updated_at: new Date().toISOString(),
        })
        .eq('room_code', code);
      if (error) console.error('경보 갱신 실패', error);
      setBusy(false);
    },
    [code, meNickname],
  );

  return (
    <>
      {/* 평상시 트리거 버튼 */}
      <button
        className="btn"
        onClick={() => setPanicState(true)}
        disabled={busy || panic}
        style={{ background: 'var(--red)', marginTop: 16 }}
      >
        🚨 부장님 떴다! (전체 경보)
      </button>

      {/* 경보 발령 시: 방 전원 화면을 덮는 위장 업무 화면 */}
      {panic && (
        <div
          role="dialog"
          aria-label="부장님 경보 위장 화면"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: '#fff',
            display: 'flex',
            flexDirection: 'column',
            fontFamily: "'IBM Plex Sans KR', system-ui, sans-serif",
          }}
        >
          {/* 위장용 스프레드시트 툴바 */}
          <div
            style={{
              background: '#1f6e43',
              color: '#fff',
              padding: '8px 14px',
              fontSize: 13,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <span>📊</span>
            <span>2026년 3분기 실적 예상 취합_최종_진짜최종_v4.xlsx</span>
            <span style={{ marginLeft: 'auto', fontWeight: 400, opacity: 0.85 }}>
              자동 저장됨 · 편집 중
            </span>
          </div>

          {/* 위장용 표 */}
          <div style={{ flex: 1, overflow: 'auto', padding: 0 }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: 13,
                color: '#222',
                fontFamily: "'IBM Plex Mono', monospace",
              }}
            >
              <thead>
                <tr style={{ background: '#f1f3f5' }}>
                  {['항목', '1월', '2월', '3월', '누계', '달성률', '비고'].map((h) => (
                    <th
                      key={h}
                      style={{ border: '1px solid #dee2e6', padding: '6px 10px', textAlign: 'left' }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 24 }).map((_, r) => (
                  <tr key={r}>
                    {Array.from({ length: 7 }).map((__, c) => (
                      <td
                        key={c}
                        style={{
                          border: '1px solid #e9ecef',
                          padding: '6px 10px',
                          color: c === 0 ? '#333' : '#868e96',
                        }}
                      >
                        {c === 0
                          ? `실적 항목 ${r + 1}`
                          : c === 5
                            ? `${(60 + ((r * 7) % 40))}%`
                            : `${((r + 1) * (c + 3) * 137) % 9000}`}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 하단: 경보 정보 + 해제 버튼 (내부용) */}
          <div
            style={{
              background: '#fff3f2',
              borderTop: '2px solid var(--red)',
              padding: '10px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <span style={{ fontSize: 13, color: 'var(--red)', fontWeight: 700 }}>
              🚨 {panicBy ?? '누군가'}님 발령 · 부장님 지나갈 때까지 일하는 척!
            </span>
            <button
              className="btn"
              onClick={() => setPanicState(false)}
              disabled={busy}
              style={{ marginLeft: 'auto', width: 'auto', padding: '8px 16px' }}
            >
              ✅ 상황 종료 (해제)
            </button>
          </div>
        </div>
      )}
    </>
  );
}
