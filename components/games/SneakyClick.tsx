'use client';

// 몰래 딴짓 — 감시등이 🟢안전일 때 누르면 생산성 하락, 🔴주시중에 누르면 딱 걸림(효과 없음).
import { useEffect, useRef, useState } from 'react';
import { SLACK_AMOUNT, useProductivity } from '@/lib/productivity';

export default function SneakyClick() {
  const { slack } = useProductivity();
  const [safe, setSafe] = useState(false);
  const [msg, setMsg] = useState('감시등이 초록일 때 눌러 딴짓하세요');
  const [cooldown, setCooldown] = useState(false);
  const toggleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 랜덤 간격으로 감시등을 토글한다.
  useEffect(() => {
    let alive = true;
    function schedule() {
      const delay = 700 + Math.random() * 1800;
      toggleTimer.current = setTimeout(() => {
        if (!alive) return;
        setSafe((s) => !s);
        schedule();
      }, delay);
    }
    schedule();
    return () => {
      alive = false;
      if (toggleTimer.current) clearTimeout(toggleTimer.current);
      if (cdTimer.current) clearTimeout(cdTimer.current);
    };
  }, []);

  function handleClick() {
    if (cooldown) return;
    if (safe) {
      slack(SLACK_AMOUNT.sneaky, `몰래 딴짓 성공 (생산성 -${SLACK_AMOUNT.sneaky})`);
      setMsg('🙈 몰래 딴짓 성공! 루팡 적립');
    } else {
      setMsg('🚨 부장님한테 딱 걸림! (효과 없음)');
    }
    setCooldown(true);
    cdTimer.current = setTimeout(() => setCooldown(false), 1200);
  }

  return (
    <div className="card col4">
      <div className="card-h">
        <span className="t">몰래 딴짓</span>
        <span className="badge">{safe ? '🟢 안전' : '🔴 주시중'}</span>
      </div>
      <button
        className="btn"
        onClick={handleClick}
        disabled={cooldown}
        style={{ background: safe ? 'var(--teal)' : 'var(--red)' }}
      >
        {cooldown ? '들킬라... 잠깐 쉬기' : safe ? '지금이야! 딴짓하기' : '대기 중...'}
      </button>
      <div className="label" style={{ marginTop: 10 }}>
        {msg}
      </div>
    </div>
  );
}
