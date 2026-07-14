'use client';

// 가위바위보 3판 2선. 양쪽이 결정적으로 같은 승자를 계산(심판 불필요).
// 라운드 매칭은 ref 로 처리해 네트워크 타이밍에 견고하게.
import { useCallback, useEffect, useRef, useState } from 'react';
import { useDuel } from '@/components/duel/DuelProvider';
import { RPS_LABEL, RPS_MOVES, RPS_WIN_SCORE, rpsCompare, type RpsMove } from '@/lib/duel';

export default function RockPaperScissors() {
  const { match, meId, sendInput, onInput, finish } = useDuel();
  const opponent = match?.opponent;
  const opponentId = opponent?.id ?? '';

  const [round, setRound] = useState(1);
  const [myScore, setMyScore] = useState(0);
  const [oppScore, setOppScore] = useState(0);
  const [myMove, setMyMove] = useState<RpsMove | null>(null);
  const [oppMove, setOppMove] = useState<RpsMove | null>(null);
  const [phase, setPhase] = useState<'choosing' | 'reveal' | 'done'>('choosing');
  const [outcome, setOutcome] = useState<string | null>(null);

  const myMoveRef = useRef<RpsMove | null>(null);
  const oppMovesRef = useRef<Record<number, RpsMove>>({});
  const roundRef = useRef(1);
  const myScoreRef = useRef(0);
  const oppScoreRef = useRef(0);
  const resolvingRef = useRef(false);
  const revealTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const tryResolve = useCallback(() => {
    if (resolvingRef.current) return;
    const r = roundRef.current;
    const mine = myMoveRef.current;
    const opp = oppMovesRef.current[r];
    if (!mine || !opp) return;

    resolvingRef.current = true;
    const cmp = rpsCompare(mine, opp);
    let ns = myScoreRef.current;
    let nos = oppScoreRef.current;
    let text: string;
    if (cmp > 0) {
      ns += 1;
      text = '이번 판 승! 🎉';
    } else if (cmp < 0) {
      nos += 1;
      text = '이번 판 패 😵';
    } else {
      text = '비김 — 다시!';
    }
    myScoreRef.current = ns;
    oppScoreRef.current = nos;
    setMyScore(ns);
    setOppScore(nos);
    setOppMove(opp);
    setOutcome(text);
    setPhase('reveal');

    const decided = ns >= RPS_WIN_SCORE || nos >= RPS_WIN_SCORE;
    revealTimer.current = setTimeout(() => {
      if (decided) {
        setPhase('done');
        finish(ns > nos ? meId : opponentId, `${ns} : ${nos}`);
        return;
      }
      const nextRound = r + 1;
      roundRef.current = nextRound;
      myMoveRef.current = null;
      resolvingRef.current = false;
      setMyMove(null);
      setOppMove(oppMovesRef.current[nextRound] ?? null);
      setOutcome(null);
      setRound(nextRound);
      setPhase('choosing');
    }, 1500);
  }, [finish, meId, opponentId]);

  useEffect(() => {
    const off = onInput((payload) => {
      const p = payload as { round?: number; move?: RpsMove };
      if (typeof p?.round !== 'number' || !p.move) return;
      oppMovesRef.current[p.round] = p.move;
      if (p.round === roundRef.current) setOppMove(p.move);
      tryResolve();
    });
    return off;
  }, [onInput, tryResolve]);

  useEffect(
    () => () => {
      if (revealTimer.current) clearTimeout(revealTimer.current);
    },
    [],
  );

  const pick = useCallback(
    (move: RpsMove) => {
      if (phase !== 'choosing' || myMoveRef.current) return;
      myMoveRef.current = move;
      setMyMove(move);
      sendInput({ round: roundRef.current, move });
      tryResolve();
    },
    [phase, sendInput, tryResolve],
  );

  const waitingForOpponent = phase === 'choosing' && myMove !== null;

  return (
    <div>
      <div
        className="card-h"
        style={{ justifyContent: 'space-between', marginBottom: 12 }}
      >
        <span className="t">✊✋✌️ 가위바위보 · 3판 2선</span>
        <span className="badge">{round}판째</span>
      </div>

      <div
        className="mono"
        style={{ textAlign: 'center', fontSize: 22, fontWeight: 700, marginBottom: 4 }}
      >
        <span style={{ color: 'var(--teal)' }}>{myScore}</span>
        <span style={{ color: 'var(--ink-soft)' }}> : </span>
        <span style={{ color: 'var(--red)' }}>{oppScore}</span>
      </div>
      <div className="label" style={{ textAlign: 'center', marginBottom: 16 }}>
        나 vs {opponent?.nickname ?? '상대'}
      </div>

      {phase === 'reveal' ? (
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 30 }}>
            {myMove ? RPS_LABEL[myMove] : '—'}{' '}
            <span style={{ color: 'var(--ink-soft)' }}>vs</span>{' '}
            {oppMove ? RPS_LABEL[oppMove] : '—'}
          </div>
          <div style={{ marginTop: 10, fontWeight: 700 }}>{outcome}</div>
        </div>
      ) : waitingForOpponent ? (
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 30 }}>{myMove ? RPS_LABEL[myMove] : ''}</div>
          <div className="label" style={{ marginTop: 10 }}>
            상대가 고르는 중...
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
          {RPS_MOVES.map((m) => (
            <button
              key={m}
              className="btn"
              onClick={() => pick(m)}
              style={{ width: 'auto', padding: '14px 16px', fontSize: 20 }}
            >
              {RPS_LABEL[m]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
