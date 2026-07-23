'use client';

// 딴짓 룰렛 — 돌리면 랜덤 딴짓 결과(생산성 하락). 하필 부장님이 지나가는 '꽝'도 있음. (아무 의미 없음)
import { useEffect, useRef, useState } from 'react';
import { SLACK_AMOUNT, useProductivity } from '@/lib/productivity';
import { track } from '@/lib/analytics';

const OUTCOMES = [
  { e: '🎬', t: '유튜브 알고리즘에 빨려듦', mult: 1.6 },
  { e: '📱', t: '인스타 릴스 30분 순삭', mult: 1.5 },
  { e: '🧻', t: '화장실에서 폰 삼매경', mult: 1.3 },
  { e: '💤', t: '모니터 보며 3초 기절', mult: 1.2 },
  { e: '🛒', t: '장바구니만 채우고 결제는 안 함', mult: 1.0 },
  { e: '🍜', t: '점심 메뉴 30분째 고민', mult: 0.8 },
  { e: '😐', t: '하필 부장님이 지나감 (꽝)', mult: 0 },
];

export default function SlackRoulette() {
  const { slack } = useProductivity();
  const [msg, setMsg] = useState('돌려서 오늘의 딴짓을 뽑아보세요');
  const [spinning, setSpinning] = useState(false);
  const t = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (t.current) clearTimeout(t.current);
    },
    [],
  );

  function spin() {
    if (spinning) return;
    setSpinning(true);
    setMsg('🎰 돌리는 중...');
    t.current = setTimeout(() => {
      const o = OUTCOMES[Math.floor(Math.random() * OUTCOMES.length)];
      setSpinning(false);
      if (o.mult <= 0) {
        setMsg(`${o.e} ${o.t}`);
        return;
      }
      const amt = Math.round(SLACK_AMOUNT.roulette * o.mult * 10) / 10;
      slack(amt, `딴짓 룰렛: ${o.t} (생산성 -${amt})`);
      track('game_play', { game: 'roulette' });
      setMsg(`${o.e} ${o.t}`);
    }, 700);
  }

  return (
    <div className="card col4">
      <div className="card-h">
        <span className="t">딴짓 룰렛</span>
        <span className="badge">랜덤</span>
      </div>
      <button className="btn" onClick={spin} disabled={spinning}>
        {spinning ? '돌리는 중...' : '🎰 돌리기'}
      </button>
      <div className="label" style={{ marginTop: 10 }}>
        {msg}
      </div>
    </div>
  );
}
