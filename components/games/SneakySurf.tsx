'use client';

// 몰래 웹서핑 (배짱 게임) — '더 보기'로 적립하되 누를수록 들킬 확률↑.
// 걸리기 전에 '그만'으로 챙겨야 생산성 하락 반영. 걸리면 그동안 논 게 다 날아감.
import { useState } from 'react';
import { SLACK_AMOUNT, useProductivity } from '@/lib/productivity';
import { track } from '@/lib/analytics';

const RISK_STEP = 0.12;
const RISK_MAX = 0.55;

export default function SneakySurf() {
  const { slack } = useProductivity();
  const [pot, setPot] = useState(0);
  const [risk, setRisk] = useState(0);
  const [msg, setMsg] = useState('걸리기 전에 챙기고 나오세요 (배짱 게임)');

  function more() {
    if (risk > 0 && Math.random() < risk) {
      setMsg('🚨 딱 걸림! 그동안 논 거 다 날아감 😇');
      setPot(0);
      setRisk(0);
      return;
    }
    setPot((p) => Math.round((p + SLACK_AMOUNT.surf) * 10) / 10);
    setRisk((r) => Math.min(RISK_MAX, r + RISK_STEP));
    setMsg('👀 몰래 보는 중... 더 볼까, 그만할까?');
  }

  function cashOut() {
    if (pot > 0) {
      slack(pot, `몰래 웹서핑 (생산성 -${pot.toFixed(1)})`);
      track('game_play', { game: 'surf' });
      setMsg(`😎 ${pot.toFixed(1)}만큼 안전하게 챙기고 복귀!`);
    } else {
      setMsg('아직 챙길 게 없어요');
    }
    setPot(0);
    setRisk(0);
  }

  return (
    <div className="card col4">
      <div className="card-h">
        <span className="t">몰래 웹서핑</span>
        <span className="badge">{risk > 0 ? `들킬 ${Math.round(risk * 100)}%` : '배짱'}</span>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn" onClick={more} style={{ flex: 1 }}>
          👀 더 보기
        </button>
        <button className="btn ghost" onClick={cashOut} style={{ flex: 1 }}>
          ✅ 그만
        </button>
      </div>
      <div className="label" style={{ marginTop: 8 }}>
        적립 <b>{pot.toFixed(1)}</b> · {msg}
      </div>
    </div>
  );
}
