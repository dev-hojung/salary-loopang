'use client';

// 연타 대결 — 3·2·1 카운트다운 후 5초간 더 많이 클릭한 쪽 승.
// 양쪽이 최종 카운트를 교환하고 각자 결정적으로 같은 승자를 계산(심판 불필요).
import { useCallback, useEffect, useRef, useState } from 'react';
import { useDuel } from '@/components/duel/DuelProvider';
import { CLICK_COUNTDOWN, CLICK_DURATION_MS } from '@/lib/duel';

export default function ClickBattle() {
  const { match, meId, sendInput, onInput, finish } = useDuel();
  const opponent = match?.opponent;
  const opponentId = opponent?.id ?? '';

  const [phase, setPhase] = useState<'ready' | 'battle' | 'waiting'>('ready');
  const [countdown, setCountdown] = useState(CLICK_COUNTDOWN);
  const [myCount, setMyCount] = useState(0);
  const [secLeft, setSecLeft] = useState(Math.ceil(CLICK_DURATION_MS / 1000));

  const myCountRef = useRef(0);
  const myFinalRef = useRef<number | null>(null);
  const oppCountRef = useRef<number | null>(null);
  const resolvedRef = useRef(false);

  const tryResolve = useCallback(() => {
    if (resolvedRef.current) return;
    const mine = myFinalRef.current;
    const opp = oppCountRef.current;
    if (mine === null || opp === null) return;
    resolvedRef.current = true;
    let winnerId: string;
    if (mine > opp) winnerId = meId;
    else if (mine < opp) winnerId = opponentId;
    else winnerId = [meId, opponentId].sort()[0]; // 동점 → 결정적 tiebreak
    finish(winnerId, `${mine}회 : ${opp}회`);
  }, [finish, meId, opponentId]);

  // 상대 최종 카운트 수신
  useEffect(() => {
    const off = onInput((payload) => {
      const p = payload as { count?: number };
      if (typeof p?.count !== 'number') return;
      oppCountRef.current = p.count;
      tryResolve();
    });
    return off;
  }, [onInput, tryResolve]);

  // 카운트다운(3·2·1) → 배틀(5초) → 최종 카운트 전송
  useEffect(() => {
    const t0 = Date.now();
    const battleStart = t0 + CLICK_COUNTDOWN * 1000;
    const battleEnd = battleStart + CLICK_DURATION_MS;
    const ids: ReturnType<typeof setTimeout>[] = [];

    ids.push(setTimeout(() => setPhase('battle'), CLICK_COUNTDOWN * 1000));
    ids.push(
      setTimeout(() => {
        myFinalRef.current = myCountRef.current;
        setPhase('waiting');
        sendInput({ count: myCountRef.current });
        tryResolve();
      }, CLICK_COUNTDOWN * 1000 + CLICK_DURATION_MS),
    );

    const tick = setInterval(() => {
      const nowT = Date.now();
      if (nowT < battleStart) setCountdown(Math.max(1, Math.ceil((battleStart - nowT) / 1000)));
      else if (nowT < battleEnd) setSecLeft(Math.max(0, Math.ceil((battleEnd - nowT) / 1000)));
    }, 200);

    return () => {
      ids.forEach(clearTimeout);
      clearInterval(tick);
    };
  }, [sendInput, tryResolve]);

  const tap = useCallback(() => {
    if (phase !== 'battle') return;
    myCountRef.current += 1;
    setMyCount(myCountRef.current);
  }, [phase]);

  return (
    <div>
      <div className="card-h" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
        <span className="t">👆 연타 대결 · 5초</span>
        <span className="badge">나 vs {opponent?.nickname ?? '상대'}</span>
      </div>

      {phase === 'ready' && (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <div className="mono" style={{ fontSize: 48, fontWeight: 700, color: 'var(--teal)' }}>
            {countdown}
          </div>
          <div className="label" style={{ marginTop: 8 }}>
            준비하세요! 손가락 푸시고...
          </div>
        </div>
      )}

      {phase === 'battle' && (
        <div style={{ textAlign: 'center' }}>
          <div className="mono" style={{ fontSize: 40, fontWeight: 700 }}>
            {myCount}
            <span style={{ fontSize: 14, color: 'var(--ink-soft)' }}> 회</span>
          </div>
          <div className="label" style={{ marginBottom: 12 }}>남은 시간 {secLeft}초</div>
          <button
            className="btn"
            onClick={tap}
            style={{ padding: '22px 16px', fontSize: 22, background: 'var(--red)' }}
          >
            🔥 마구 두드려!
          </button>
        </div>
      )}

      {phase === 'waiting' && (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <div className="mono" style={{ fontSize: 28, fontWeight: 700 }}>
            내 기록 {myCountRef.current}회
          </div>
          <div className="label" style={{ marginTop: 10 }}>상대 기록을 기다리는 중...</div>
        </div>
      )}
    </div>
  );
}
