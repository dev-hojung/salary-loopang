import { describe, it, expect, vi, beforeEach } from 'vitest';

// 인증 계층을 mock: authenticatePlayer 가 null(미인증)을 반환하도록.
// → 모든 mutation 라우트는 DB 를 건드리기 전에 401 로 거부해야 한다(회귀 고정).
vi.mock('@/lib/auth', () => ({ authenticatePlayer: vi.fn(async () => null) }));

import { authenticatePlayer } from '@/lib/auth';
import { POST as heartbeat } from '@/app/api/room/heartbeat/route';
import { POST as panic } from '@/app/api/room/panic/route';
import { POST as reset } from '@/app/api/room/reset/route';
import { POST as duelResult } from '@/app/api/duel/result/route';

function post(url: string, body: Record<string, unknown>) {
  return new Request(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('mutation 라우트 authz (미인증 → 401)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(authenticatePlayer).mockResolvedValue(null);
  });

  it('heartbeat: 미인증 401', async () => {
    const res = await heartbeat(post('http://x/api/room/heartbeat', { code: 'ABCD', productivity: 50 }));
    expect(res.status).toBe(401);
  });

  it('panic: 미인증 401', async () => {
    const res = await panic(post('http://x/api/room/panic', { code: 'ABCD', panic: true }));
    expect(res.status).toBe(401);
  });

  it('reset: 미인증 401', async () => {
    const res = await reset(post('http://x/api/room/reset', { code: 'ABCD' }));
    expect(res.status).toBe(401);
  });

  it('duel/result: 미인증 401', async () => {
    const res = await duelResult(
      post('http://x/api/duel/result', { code: 'ABCD', matchId: 'm1', winnerId: 'w', loserId: 'l' }),
    );
    expect(res.status).toBe(401);
  });

  it('잘못된 방 코드는 401 이전에 400', async () => {
    const res = await heartbeat(post('http://x/api/room/heartbeat', { code: '', productivity: 50 }));
    expect(res.status).toBe(400);
  });
});
