'use client';

// 가짜 열일 타이핑 — 제한 시간 안에 목표 횟수만큼 두드려 "바쁜 척"을 완성하면 생산성 하락.
import { useEffect, useRef, useState } from 'react';
import { SLACK_AMOUNT, useProductivity } from '@/lib/productivity';

const GOAL = 20;
const WINDOW_MS = 5000;

export default function FakeTyping() {
  const { slack } = useProductivity();
  const [count, setCount] = useState(0);
  const [active, setActive] = useState(false);
  const [msg, setMsg] = useState('5초 안에 20번 눌러 "바쁜 척"을 완성하세요');
  const endTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (endTimer.current) clearTimeout(endTimer.current);
    },
    [],
  );

  function start() {
    setActive(true);
    setCount(0);
    setMsg('⌨️ 지금! 마구 두드리세요');
    endTimer.current = setTimeout(() => {
      setActive(false);
      setCount(0);
      setMsg('⏱ 시간 초과! 다시 도전');
    }, WINDOW_MS);
  }

  function tap() {
    if (!active) return;
    setCount((c) => {
      const n = c + 1;
      if (n >= GOAL) {
        if (endTimer.current) clearTimeout(endTimer.current);
        setActive(false);
        slack(SLACK_AMOUNT.typing, `완벽한 열일 연기 (생산성 -${SLACK_AMOUNT.typing})`);
        setMsg('🎭 완벽한 연기! 아무도 눈치 못 챘습니다');
        return 0;
      }
      return n;
    });
  }

  return (
    <div className="card col4">
      <div className="card-h">
        <span className="t">가짜 열일 타이핑</span>
        <span className="badge">연타</span>
      </div>
      {active ? (
        <button className="btn" onClick={tap}>
          두드려! ({count}/{GOAL})
        </button>
      ) : (
        <button className="btn" onClick={start}>
          🎭 바쁜 척 시작
        </button>
      )}
      <div className="gbar" style={{ marginTop: 10 }}>
        <i style={{ width: `${Math.max((count / GOAL) * 100, 2)}%` }} />
      </div>
      <div className="label" style={{ marginTop: 8 }}>
        {msg}
      </div>
    </div>
  );
}
