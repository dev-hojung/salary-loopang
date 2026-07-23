'use client';

// 주간 루팡왕 랭킹 — daily_records 최근 7일을 닉네임별 '왕 횟수'로 집계한 경쟁 리더보드.
// (일별 목록=DailyKings, 통산=HallOfFame 과 구분되는 '이번 주 왕중왕'.)
// 테이블 없거나 기록 없으면 조용히 숨김.
import { useEffect, useState } from 'react';
import { getSupabaseBrowser } from '@/lib/supabaseClient';

const MEDALS = ['🥇', '🥈', '🥉'];

type Row = { nick: string; count: number };

export default function WeeklyKings({ code }: { code: string }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [days, setDays] = useState(0);

  useEffect(() => {
    let active = true;
    getSupabaseBrowser()
      .from('daily_records')
      .select('date, king_nick')
      .eq('room_code', code)
      .order('date', { ascending: false })
      .limit(7)
      .then(({ data }) => {
        if (!active || !data) return;
        const counts = new Map<string, number>();
        for (const r of data as { date: string; king_nick: string | null }[]) {
          if (!r.king_nick) continue;
          counts.set(r.king_nick, (counts.get(r.king_nick) ?? 0) + 1);
        }
        const ranked = [...counts.entries()]
          .map(([nick, count]) => ({ nick, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);
        setDays(data.length);
        setRows(ranked);
      });
    return () => {
      active = false;
    };
  }, [code]);

  if (rows.length === 0) return null;

  return (
    <section style={{ marginTop: 20 }}>
      <div className="card-h" style={{ marginBottom: 12 }}>
        <span className="t">👑 주간 루팡왕 랭킹</span>
        <span className="badge">최근 {days}일 · 왕좌 횟수</span>
      </div>
      <div className="card">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {rows.map((r, i) => (
            <div
              key={r.nick}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
            >
              <span style={{ fontSize: 13, fontWeight: 600 }}>
                {MEDALS[i] ?? `${i + 1}.`} {r.nick}
              </span>
              <span className="mono" style={{ fontSize: 13, color: 'var(--ink-soft)' }}>
                👑 {r.count}회
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
