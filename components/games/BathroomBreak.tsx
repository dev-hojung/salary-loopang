'use client';

// 화장실 루팡 — 게이지가 오르내릴 때 '황금 구간'에서 복귀하면 완벽한 타이밍(생산성 하락).
import { useEffect, useRef, useState } from 'react';
import { SLACK_AMOUNT, useProductivity } from '@/lib/productivity';
import { track } from '@/lib/analytics';

const GOLD_LO = 62;
const GOLD_HI = 88;

export default function BathroomBreak() {
  const { slack } = useProductivity();
  const [pos, setPos] = useState(0);
  const [running, setRunning] = useState(true);
  const [msg, setMsg] = useState(`게이지가 황금 구간(${GOLD_LO}~${GOLD_HI})일 때 복귀!`);
  const dir = useRef(1);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!running) return;
    timer.current = setInterval(() => {
      setPos((p) => {
        let next = p + dir.current * 3;
        if (next >= 100) {
          next = 100;
          dir.current = -1;
        } else if (next <= 0) {
          next = 0;
          dir.current = 1;
        }
        return next;
      });
    }, 40);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [running]);

  function action() {
    if (!running) {
      setRunning(true);
      setMsg(`게이지가 황금 구간(${GOLD_LO}~${GOLD_HI})일 때 복귀!`);
      return;
    }
    setRunning(false);
    if (pos >= GOLD_LO && pos <= GOLD_HI) {
      slack(SLACK_AMOUNT.bathroom, `화장실 루팡 성공 (생산성 -${SLACK_AMOUNT.bathroom})`);
      track('game_play', { game: 'bathroom' });
      setMsg('🚽 완벽한 복귀 타이밍! 아무도 몰랐다');
    } else {
      setMsg('🚨 복도에서 부장님과 마주침... (효과 없음)');
    }
  }

  return (
    <div className="card col4">
      <div className="card-h">
        <span className="t">화장실 루팡</span>
        <span className="badge">타이밍</span>
      </div>
      <button
        className="btn"
        onClick={action}
        style={{ background: running ? 'var(--teal)' : undefined }}
      >
        {running ? '🚽 복귀!' : '다시 가기'}
      </button>
      <div className="gbar" style={{ marginTop: 10 }}>
        <i style={{ width: `${Math.max(pos, 2)}%` }} />
      </div>
      <div className="label" style={{ marginTop: 8 }}>
        {msg}
      </div>
    </div>
  );
}
