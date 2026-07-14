import { useState } from 'react';
import type { Player } from '@/lib/types';
import { prodTierLabel } from '@/lib/productivity';
import { useDuel } from '@/components/duel/DuelProvider';
import { DUEL_GAMES } from '@/lib/duel';
import { evaluateAchievements, representativeTitle, RARITY_COLOR } from '@/lib/achievements';

type PlayerCardProps = {
  player: Player;
  rank?: number;
  isMe?: boolean;
  online?: boolean; // last_seen 기준 접속 여부. false 면 흐리게 + "자리비움".
  isKing?: boolean; // 접속자 중 1위(최저 생산성) — 루팡왕 👑.
  yesterdayKing?: string | null; // 어제 루팡왕 닉네임 (업적 판정용).
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
  yesterdayKing = null,
}: PlayerCardProps) {
  const { challenge, busy } = useDuel();
  const [picking, setPicking] = useState(false);
  const initial = player.nickname.trim().charAt(0) || '?';

  const achieveCtx = { isYesterdayKing: !!yesterdayKing && player.nickname === yesterdayKing };
  const title = representativeTitle(player, achieveCtx);
  const otherBadges = evaluateAchievements(player, achieveCtx).slice(1); // 대표 칭호 제외한 나머지

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

      {title && (
        <div style={{ marginTop: 6 }}>
          <span
            title={title.desc}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 12,
              fontWeight: 700,
              padding: '3px 10px',
              borderRadius: 999,
              color: RARITY_COLOR[title.rarity],
              background: `${RARITY_COLOR[title.rarity]}1a`,
              border: `1px solid ${RARITY_COLOR[title.rarity]}55`,
            }}
          >
            {title.emoji} {title.label}
          </span>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12 }}>
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
        {!isMe &&
          (picking ? (
            <span style={{ display: 'flex', gap: 6 }}>
              {DUEL_GAMES.map((g) => (
                <button
                  key={g.key}
                  className="btn"
                  style={{ width: 'auto', padding: '6px 10px', fontSize: 12 }}
                  onClick={() => {
                    challenge({ id: player.id, nickname: player.nickname }, g.key);
                    setPicking(false);
                  }}
                  disabled={busy || !online}
                >
                  {g.short}
                </button>
              ))}
              <button
                className="btn ghost"
                style={{ width: 'auto', padding: '6px 8px', fontSize: 12 }}
                onClick={() => setPicking(false)}
              >
                ✕
              </button>
            </span>
          ) : (
            <button
              className="btn ghost"
              style={{ width: 'auto', padding: '6px 12px', fontSize: 12 }}
              onClick={() => setPicking(true)}
              disabled={busy || !online}
              title={online ? undefined : '자리비움 상태에는 도전할 수 없어요'}
            >
              ⚔ 도전
            </button>
          ))}
      </div>

      {otherBadges.length > 0 && (
        <div style={{ marginTop: 10, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {otherBadges.map((a) => (
            <span
              key={a.id}
              title={`${a.label} · ${a.desc}`}
              style={{
                fontSize: 13,
                lineHeight: 1,
                padding: '3px 6px',
                borderRadius: 8,
                background: `${RARITY_COLOR[a.rarity]}1a`,
                border: `1px solid ${RARITY_COLOR[a.rarity]}44`,
              }}
            >
              {a.emoji}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
