import SalaryEngine from '@/components/SalaryEngine';
import GameHub from '@/components/GameHub';
import { ProductivityProvider } from '@/lib/productivity';

export default function SoloPage() {
  return (
    <>
      <header>
        <div className="brand">
          <div className="logo">S</div>
          <div>
            <h1>SMART WORK INSIGHT™</h1>
            <p>전사 실시간 업무 생산성 통합 관제 시스템</p>
          </div>
        </div>
        <div className="live">
          <span className="dot" /> 실시간 연동 중 · 자동 갱신
        </div>
      </header>

      <div className="wrap">
        <ProductivityProvider>
          <SalaryEngine />
          <GameHub />
        </ProductivityProvider>

        <footer>
          SMART WORK INSIGHT™ v2.4.1 Enterprise Edition · 모든 지표는 실시간이며 아무 의미가 없습니다
          <br />
          <b>본 시스템은 어떠한 업무 생산성도 향상시키지 않음을 보증합니다.</b>
        </footer>
      </div>
    </>
  );
}
