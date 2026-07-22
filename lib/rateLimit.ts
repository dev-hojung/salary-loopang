// 인메모리 토큰버킷 레이트리밋 (단일 Railway 인스턴스 기준).
// ⚠️ 다중 인스턴스로 확장 시 프로세스별 버킷이 갈라지므로 Upstash Redis 등 공유 저장소로 이관해야 한다(P1).
// 키 선택 주의: 사무실은 NAT 로 공유 IP 가 흔하므로 인증 후 라우트는 playerId 로, 인증 전(생성/입장)만 IP 로 건다.

type Bucket = { tokens: number; updated: number };
const buckets = new Map<string, Bucket>();

export type RateRule = { capacity: number; refillPerSec: number };

// 라우트별 정책. capacity=순간 버스트 허용량, refillPerSec=초당 회복량.
export const RATE = {
  createRoom: { capacity: 5, refillPerSec: 0.1 }, // 방 생성 스팸 방지(분당 ~6)
  joinRoom: { capacity: 20, refillPerSec: 0.5 }, // 입장(사무실 공유 IP 고려해 넉넉히)
  heartbeat: { capacity: 6, refillPerSec: 0.5 }, // 정상 5초 주기(0.2/s)보다 여유
  panic: { capacity: 4, refillPerSec: 0.1 }, // 경보 토글 남발 방지
  reset: { capacity: 5, refillPerSec: 0.2 }, // 리셋은 idempotent, 완만히
  duel: { capacity: 12, refillPerSec: 0.5 },
} satisfies Record<string, RateRule>;

let lastSweep = 0;
function maybeSweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [k, b] of buckets) {
    if (now - b.updated > 300_000) buckets.delete(k); // 5분 idle 버킷 정리
  }
}

// 토큰 1개 소비 시도. 성공(허용)이면 true, 소진(차단)이면 false.
export function rateLimit(key: string, rule: RateRule): boolean {
  const now = Date.now();
  maybeSweep(now);

  const b = buckets.get(key);
  if (!b) {
    buckets.set(key, { tokens: rule.capacity - 1, updated: now });
    return true;
  }

  const elapsedSec = (now - b.updated) / 1000;
  b.tokens = Math.min(rule.capacity, b.tokens + elapsedSec * rule.refillPerSec);
  b.updated = now;

  if (b.tokens < 1) return false;
  b.tokens -= 1;
  return true;
}

// 프록시(Railway) 뒤 클라이언트 IP 추정. 인증 전 라우트 전용.
export function clientIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0]!.trim();
  return req.headers.get('x-real-ip') ?? 'unknown';
}
