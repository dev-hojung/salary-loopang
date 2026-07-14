'use client';

// 대결 UX 오버레이 — 매치 phase 에 따라 도전 수신/대기/게임/결과를 보여준다.
import { useEffect } from 'react';
import { useDuel } from '@/components/duel/DuelProvider';
import RockPaperScissors from '@/components/duel/RockPaperScissors';
import ClickBattle from '@/components/duel/ClickBattle';
import { duelRule, WIN_SLACK, LOSE_SLACK } from '@/lib/duel';

const backdrop: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(15, 23, 32, 0.55)',
  display: 'grid',
  placeItems: 'center',
  zIndex: 100,
  padding: 20,
};

export default function DuelOverlay() {
  const { match, notice, clearNotice, accept, decline, cancel, close } = useDuel();

  // 알림(거절/취소/타임아웃)은 잠깐 떴다 사라진다.
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(clearNotice, 2800);
    return () => clearTimeout(t);
  }, [notice, clearNotice]);

  if (!match) {
    if (!notice) return null;
    return (
      <div
        style={{
          position: 'fixed',
          top: 16,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 120,
          background: 'var(--ink)',
          color: '#fff',
          padding: '10px 16px',
          borderRadius: 10,
          fontSize: 13,
          fontWeight: 600,
          boxShadow: 'var(--shadow)',
        }}
      >
        {notice}
      </div>
    );
  }

  return (
    <div style={backdrop}>
      <div className="card" style={{ maxWidth: 360, width: '100%', textAlign: 'center' }}>
        {match.phase === 'challenging' && (
          <>
            <div style={{ fontSize: 30, marginBottom: 8 }}>⚔️</div>
            <div className="t" style={{ fontSize: 16 }}>
              {match.opponent.nickname}님에게 도전장 발송
            </div>
            <div className="label" style={{ marginTop: 8 }}>
              수락을 기다리는 중...
            </div>
            <button className="btn ghost" style={{ marginTop: 16 }} onClick={cancel}>
              취소
            </button>
          </>
        )}

        {match.phase === 'challenged' && (
          <>
            <div style={{ fontSize: 30, marginBottom: 8 }}>🥊</div>
            <div className="t" style={{ fontSize: 16 }}>
              {match.opponent.nickname}님의 대결 신청!
            </div>
            <div className="label" style={{ marginTop: 8 }}>
              {duelRule(match.game)} · 이기면 생산성 대폭 하락(랭킹 ↑)
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button className="btn" style={{ flex: 1 }} onClick={accept}>
                수락
              </button>
              <button className="btn ghost" style={{ flex: 1 }} onClick={decline}>
                거절
              </button>
            </div>
          </>
        )}

        {match.phase === 'playing' && (
          <>
            {match.game === 'click' ? (
              <ClickBattle key={match.matchId} />
            ) : (
              <RockPaperScissors key={match.matchId} />
            )}
            <button
              className="btn ghost"
              style={{ marginTop: 16, fontSize: 12, padding: '8px 12px', width: 'auto' }}
              onClick={cancel}
            >
              기권하고 나가기
            </button>
          </>
        )}

        {match.phase === 'result' && (
          <>
            <div style={{ fontSize: 34, marginBottom: 6 }}>
              {match.result?.iWon ? '🏆' : '😢'}
            </div>
            <div className="t" style={{ fontSize: 18 }}>
              {match.result?.iWon ? '승리!' : '패배'}
            </div>
            <div className="mono" style={{ marginTop: 6, color: 'var(--ink-soft)' }}>
              {match.result?.detail}
            </div>
            <div className="label" style={{ marginTop: 10 }}>
              {match.result?.iWon
                ? `완벽하게 놀아제꼈습니다 · 생산성 -${WIN_SLACK}, 1승`
                : `아쉽... 생산성 -${LOSE_SLACK}, 1패`}
            </div>
            <button className="btn" style={{ marginTop: 16 }} onClick={close}>
              닫기
            </button>
          </>
        )}
      </div>
    </div>
  );
}
