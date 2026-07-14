'use client';

// 커피 브레이크(방치형) — 커피 내리는 4초 동안 자리 비우면 생산성 하락.
import { useEffect, useRef, useState } from 'react';
import { SLACK_AMOUNT, useProductivity } from '@/lib/productivity';

const BREW_MS = 4000;

export default function CoffeeBreak() {
  const { slack } = useProductivity();
  const [brewing, setBrewing] = useState(false);
  const [pct, setPct] = useState(0);
  const [msg, setMsg] = useState('커피 한 잔의 여유로 딴짓 시간을 벌어봅시다');
  const tick = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(
    () => () => {
      if (tick.current) clearInterval(tick.current);
    },
    [],
  );

  function brew() {
    if (brewing) return;
    setBrewing(true);
    setMsg('☕ 내리는 중... (자리 비움)');
    const start = Date.now();
    tick.current = setInterval(() => {
      const p = Math.min(100, ((Date.now() - start) / BREW_MS) * 100);
      setPct(p);
      if (p >= 100) {
        if (tick.current) clearInterval(tick.current);
        setBrewing(false);
        setPct(0);
        slack(SLACK_AMOUNT.coffee, `커피 브레이크 (생산성 -${SLACK_AMOUNT.coffee})`);
        setMsg('☕ 완벽한 휴식! 리프레시 완료');
      }
    }, 80);
  }

  return (
    <div className="card col4">
      <div className="card-h">
        <span className="t">커피 브레이크</span>
        <span className="badge">방치형</span>
      </div>
      <button className="btn ghost" onClick={brew} disabled={brewing}>
        {brewing ? '내리는 중...' : '☕ 커피 내리기'}
      </button>
      <div className="gbar" style={{ marginTop: 10 }}>
        <i style={{ width: `${Math.max(pct, 2)}%` }} />
      </div>
      <div className="label" style={{ marginTop: 8 }}>
        {msg}
      </div>
    </div>
  );
}
