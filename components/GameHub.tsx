'use client';

// 루팡 미니게임 허브 — 각 게임을 플레이하면 생산성이 내려가고(=더 논 것) 리더보드 상위로 간다.
import SneakyClick from '@/components/games/SneakyClick';
import CoffeeBreak from '@/components/games/CoffeeBreak';
import FakeTyping from '@/components/games/FakeTyping';

export default function GameHub() {
  return (
    <section style={{ marginTop: 20 }}>
      <div className="card-h" style={{ marginBottom: 12 }}>
        <span className="t">🎮 루팡 미니게임</span>
        <span className="badge red">플레이할수록 생산성 ↓ · 랭킹 ↑</span>
      </div>
      <div className="grid">
        <SneakyClick />
        <CoffeeBreak />
        <FakeTyping />
      </div>
    </section>
  );
}
