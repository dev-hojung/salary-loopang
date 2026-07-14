'use client';

// B-5b · 일별 루팡왕 기록 — daily_records 최근 7일 조회.
// 테이블이 없으면(마이그레이션 전) 조용히 아무것도 렌더하지 않음.
import { useEffect, useState } from 'react';
import { getSupabaseBrowser } from '@/lib/supabaseClient';

type Rec = { date: string; king_nick: string | null; king_productivity: number | null };

export default function DailyKings({ code }: { code: string }) {
  const [records, setRecords] = useState<Rec[]>([]);

  useEffect(() => {
    let active = true;
    getSupabaseBrowser()
      .from('daily_records')
      .select('date, king_nick, king_productivity')
      .eq('room_code', code)
      .order('date', { ascending: false })
      .limit(7)
      .then(({ data }) => {
        if (active && data) setRecords(data as Rec[]);
      });
    return () => {
      active = false;
    };
  }, [code]);

  if (records.length === 0) return null;

  return (
    <section style={{ marginTop: 20 }}>
      <div className="card-h" style={{ marginBottom: 12 }}>
        <span className="t">👑 일별 루팡왕 기록</span>
        <span className="badge">최근 {records.length}일</span>
      </div>
      <div className="card">
        {records.map((r, i) => (
          <div
            key={r.date}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 0',
              borderBottom: i === records.length - 1 ? 'none' : '1px solid var(--line)',
            }}
          >
            <span className="mono" style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
              {r.date}
            </span>
            <span style={{ fontSize: 13, fontWeight: 600 }}>
              🥇 {r.king_nick ?? '기록 없음'}
              {r.king_productivity != null && (
                <span style={{ color: 'var(--ink-soft)', fontWeight: 400 }}>
                  {' '}
                  · 생산성 {r.king_productivity}
                </span>
              )}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
