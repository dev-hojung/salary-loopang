'use client';

// B-5a · 명예의 전당 (통산 누적) — 기존 players 데이터만으로 그리는 리더보드.
// loopang_sec·wins 는 일일 리셋에도 누적 유지되므로 곧 통산 기록. DB/마이그레이션 불필요.
import type { Player } from '@/lib/types';

const MEDALS = ['🥇', '🥈', '🥉'];

function fmtDuration(sec: number): string {
  const total = Math.max(0, Math.floor(sec));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  if (h > 0) return `${h}시간 ${m}분`;
  if (m > 0) return `${m}분`;
  return `${total}초`;
}

function Board({
  title,
  rows,
}: {
  title: string;
  rows: { key: string; name: string; value: string }[];
}) {
  return (
    <div className="card col6">
      <div className="card-h" style={{ marginBottom: 8 }}>
        <span className="t">{title}</span>
      </div>
      {rows.length === 0 ? (
        <div className="label">아직 기록이 없어요</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {rows.map((r, i) => (
            <div
              key={r.key}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
            >
              <span style={{ fontSize: 13, fontWeight: 600 }}>
                {MEDALS[i] ?? `${i + 1}.`} {r.name}
              </span>
              <span className="mono" style={{ fontSize: 13, color: 'var(--ink-soft)' }}>
                {r.value}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function HallOfFame({ players }: { players: Player[] }) {
  const byLoopang = [...players]
    .filter((p) => p.loopang_sec > 0)
    .sort((a, b) => b.loopang_sec - a.loopang_sec)
    .slice(0, 3);

  const byWins = [...players]
    .filter((p) => (p.wins ?? 0) > 0)
    .sort((a, b) => (b.wins ?? 0) - (a.wins ?? 0))
    .slice(0, 3);

  // 아무 기록도 없으면 섹션 자체를 숨김.
  if (byLoopang.length === 0 && byWins.length === 0) return null;

  return (
    <section style={{ marginTop: 20 }}>
      <div className="card-h" style={{ marginBottom: 12 }}>
        <span className="t">🏛️ 명예의 전당</span>
        <span className="badge">통산 누적 기록</span>
      </div>
      <div className="grid">
        <Board
          title="🕵️ 누적 루팡 시간"
          rows={byLoopang.map((p) => ({
            key: p.id,
            name: p.nickname,
            value: fmtDuration(p.loopang_sec),
          }))}
        />
        <Board
          title="🏆 통산 대결 승"
          rows={byWins.map((p) => ({
            key: p.id,
            name: p.nickname,
            value: `${p.wins ?? 0}승 ${p.losses ?? 0}패`,
          }))}
        />
      </div>
    </section>
  );
}
