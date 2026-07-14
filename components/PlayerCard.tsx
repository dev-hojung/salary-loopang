import type { Player } from '@/lib/types';
import { prodTierLabel } from '@/lib/productivity';
import { useDuel } from '@/components/duel/DuelProvider';

type PlayerCardProps = {
  player: Player;
  rank?: number;
  isMe?: boolean;
  online?: boolean; // last_seen 기준 접속 여부. false 면 흐리게 + "자리비움".
  isKing?: boolean; // 접속자 중 1위(최저 생산성) — 루팡왕 👑.
};

// 1~3위는 메달, 그 외는 "N위".
function rankBadge(rank?: number): string {
  if (rank === 1) return '🥇 1위';
  if (rank === 2) return '🥈 2위';
  if (rank === 3) return '🥉 3위';
  return rank ? `${rank}위` : '';
}

// 초 단위 누적 루팡 시간을 "H시간 M분 S초" 로 표시 (선행 0 단위는 생략).
function formatLoopang(sec: number): string {
  const total = Math.max(0, Math.floor(sec));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;

  const parts: string[] = [];
  if (h > 0) parts.push(`${h}시간`);
  if (h > 0 || m > 0) parts.push(`${m}분`);
  parts.push(`${s}초`);
  return parts.join(' ');
}

export default function PlayerCard({
  player,
  rank,
  isMe = false,
  online = true,
  isKing = false,
}: PlayerCardProps) {
  const { challenge, busy } = useDuel();
  const initial = player.nickname.trim().charAt(0) || '?';

  return (
    <div
      className="card col4"
      style={{
        ...(isMe
          ? { borderColor: 'var(--teal)', boxShadow: '0 0 0 2px rgba(13,122,114,.15), var(--shadow)' }
          : {}),
        ...(isKing && online
          ? { borderColor: '#d4a017', boxShadow: '0 0 0 2px rgba(212,160,23,.3), var(--shadow)' }
          : {}),
        ...(online ? {} : { opacity: 0.5 }),
      }}
    >
      <div className="card-h">
        <span className="t">
          {player.nickname}
          {isMe ? ' (나)' : ''}
        </span>
        <span className="badge">
          {!online ? '💤 자리비움' : isKing ? '👑 루팡왕' : rankBadge(rank)}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: 'var(--teal)',
            color: '#fff',
            display: 'grid',
            placeItems: 'center',
            fontWeight: 700,
            fontSize: 16,
            flexShrink: 0,
          }}
        >
          {initial}
        </div>
        <div>
          <div className="mono" style={{ fontSize: 15, fontWeight: 600 }}>
            {formatLoopang(player.loopang_sec)}
          </div>
          <div className="label" style={{ marginTop: 2 }}>
            누적 루팡 시간
          </div>
        </div>
      </div>

      <div style={{ marginTop: 14 }}>
        <span
          className="mono"
          style={{
            fontSize: 20,
            fontWeight: 700,
            color: player.productivity <= 50 ? 'var(--teal)' : 'var(--red)',
          }}
        >
          {player.productivity.toFixed(1)}
        </span>
        <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}> % 생산성</span>
        <span className="badge" style={{ marginLeft: 8 }}>
          {prodTierLabel(player.productivity)}
        </span>
      </div>

      <div
        className="label"
        style={{ marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
      >
        <span>
          대결 전적{' '}
          <b style={{ color: 'var(--ink)' }}>
            {player.wins ?? 0}승 {player.losses ?? 0}패
          </b>
        </span>
        {!isMe && (
          <button
            className="btn ghost"
            style={{ width: 'auto', padding: '6px 12px', fontSize: 12 }}
            onClick={() => challenge({ id: player.id, nickname: player.nickname })}
            disabled={busy || !online}
            title={online ? undefined : '자리비움 상태에는 도전할 수 없어요'}
          >
            ⚔ 도전
          </button>
        )}
      </div>
    </div>
  );
}
