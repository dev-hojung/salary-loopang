'use client';

// 생산성 지수(게임 점수)의 단일 소스.
// - 첫 입장 100 에서 시작.
// - 자동 하락 없음(순수 액션 기반). 기능·미니게임 플레이 시 slack() 으로만 내려간다.
// - 0~100 클램프, 소수 1자리(DB numeric(5,1) 대응).
// - 낮을수록 "잘 논 것" → 리더보드 상위.
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

export const PROD_MAX = 100;
export const PROD_MIN = 0;

// 액션별 생산성 감소폭 (한 곳에서 밸런스 조절). 값이 클수록 빨리 내려감.
// 100 → 0 까지 한참 걸리도록 완만하게. 너무 빨리 바닥나지 않게 조정.
export const SLACK_AMOUNT = {
  work: 0.3, // 열일 버튼
  excuse: 0.3, // AI 핑계 생성
  sneaky: 0.4, // 몰래 딴짓
  coffee: 0.6, // 커피 브레이크
  typing: 0.5, // 가짜 열일 타이핑
  bathroom: 0.6, // 화장실 루팡 (완벽 타이밍 시)
  roulette: 0.5, // 딴짓 룰렛 (결과 배수에 따라 가감)
  surf: 0.2, // 몰래 웹서핑 (한 번 볼 때마다 누적)
} as const;

function clampProd(n: number): number {
  const rounded = Math.round(n * 10) / 10;
  return Math.min(PROD_MAX, Math.max(PROD_MIN, rounded));
}

type SlackFn = (amount: number, reason?: string) => void;

type ProductivityValue = {
  prod: number;
  /** 생산성을 amount 만큼 낮춘다(0 미만으로는 안 내려감). reason 은 게이지 라벨에 표시. */
  slack: SlackFn;
  /** 생산성을 100 으로 되돌린다 (일일 리셋 — 새 날 시작). */
  reset: () => void;
  lastReason: string | null;
};

const ProductivityContext = createContext<ProductivityValue | null>(null);

export function ProductivityProvider({
  initial = PROD_MAX,
  onChange,
  children,
}: {
  initial?: number;
  onChange?: (prod: number) => void;
  children: ReactNode;
}) {
  const [prod, setProd] = useState<number>(() => clampProd(initial));
  const [lastReason, setLastReason] = useState<string | null>(null);

  const slack = useCallback<SlackFn>((amount, reason) => {
    setProd((p) => clampProd(p - Math.abs(amount)));
    if (reason !== undefined) setLastReason(reason);
  }, []);

  const reset = useCallback(() => {
    setProd(PROD_MAX);
    setLastReason('새 날 시작 · 생산성 초기화');
  }, []);

  // 값이 바뀔 때마다 부모(방 하트비트 등)에 알린다.
  useEffect(() => {
    onChange?.(prod);
  }, [prod, onChange]);

  return (
    <ProductivityContext.Provider value={{ prod, slack, reset, lastReason }}>
      {children}
    </ProductivityContext.Provider>
  );
}

export function useProductivity(): ProductivityValue {
  const value = useContext(ProductivityContext);
  if (!value) {
    throw new Error('useProductivity 는 <ProductivityProvider> 안에서만 사용할 수 있습니다');
  }
  return value;
}

/** 생산성 구간별 라벨 (낮을수록 루팡 고수). */
export function prodTierLabel(prod: number): string {
  if (prod <= 20) return '완전체 루팡';
  if (prod <= 50) return '루팡 중';
  if (prod <= 80) return '슬슬 딴짓';
  return '일하는 척';
}
