import { describe, it, expect, vi, beforeEach } from 'vitest';

// next/headers·supabaseServer 는 Next 런타임 의존이라 mock 으로 대체.
vi.mock('next/headers', () => ({ cookies: vi.fn() }));
vi.mock('@/lib/supabaseServer', () => ({ getSupabaseServer: vi.fn() }));

import { cookies } from 'next/headers';
import { getSupabaseServer } from '@/lib/supabaseServer';
import {
  authCookieName,
  buildCookieValue,
  hashSecret,
  generateSecret,
  authenticatePlayer,
} from '@/lib/auth';

// from(table).select().eq()...maybeSingle() 체인을 테이블별 결과로 흉내낸다.
function mockSupabase(results: Record<string, { data: unknown }>) {
  return {
    from(table: string) {
      const builder: Record<string, unknown> = {
        select: () => builder,
        eq: () => builder,
        maybeSingle: async () => results[table] ?? { data: null },
      };
      return builder;
    },
  };
}

function setCookie(value: string | null) {
  vi.mocked(cookies).mockResolvedValue({
    get: (name: string) =>
      value && name === authCookieName('ABCD') ? { value } : undefined,
  } as unknown as Awaited<ReturnType<typeof cookies>>);
}

describe('auth 순수 헬퍼', () => {
  it('hashSecret 은 결정적이고 입력에 따라 다르며 64-hex', () => {
    expect(hashSecret('x')).toBe(hashSecret('x'));
    expect(hashSecret('x')).not.toBe(hashSecret('y'));
    expect(hashSecret('x')).toMatch(/^[0-9a-f]{64}$/);
  });

  it('authCookieName 은 코드 대문자화', () => {
    expect(authCookieName('abcd')).toBe('loopang_auth_ABCD');
  });

  it('buildCookieValue 는 "id.secret" 형식', () => {
    expect(buildCookieValue('pid', 'sec')).toBe('pid.sec');
  });

  it('generateSecret 은 매번 다른 비어있지 않은 값', () => {
    const a = generateSecret();
    const b = generateSecret();
    expect(a.length).toBeGreaterThan(20);
    expect(a).not.toBe(b);
  });
});

describe('authenticatePlayer', () => {
  const CODE = 'ABCD';
  const PID = 'player-1';
  const SECRET = 'super-secret';

  beforeEach(() => vi.clearAllMocks());

  it('쿠키 없으면 null', async () => {
    setCookie(null);
    expect(await authenticatePlayer(CODE)).toBeNull();
  });

  it('점(.) 없는 잘못된 형식이면 null', async () => {
    setCookie('nodothere');
    expect(await authenticatePlayer(CODE)).toBeNull();
  });

  it('player_auth 행이 없으면 null', async () => {
    setCookie(buildCookieValue(PID, SECRET));
    vi.mocked(getSupabaseServer).mockReturnValue(
      mockSupabase({ player_auth: { data: null } }) as unknown as ReturnType<typeof getSupabaseServer>,
    );
    expect(await authenticatePlayer(CODE)).toBeNull();
  });

  it('secret 해시가 불일치하면 null', async () => {
    setCookie(buildCookieValue(PID, SECRET));
    vi.mocked(getSupabaseServer).mockReturnValue(
      mockSupabase({
        player_auth: { data: { secret_hash: hashSecret('WRONG') } },
        players: { data: { id: PID } },
      }) as unknown as ReturnType<typeof getSupabaseServer>,
    );
    expect(await authenticatePlayer(CODE)).toBeNull();
  });

  it('해시는 맞지만 그 방 소속이 아니면 null', async () => {
    setCookie(buildCookieValue(PID, SECRET));
    vi.mocked(getSupabaseServer).mockReturnValue(
      mockSupabase({
        player_auth: { data: { secret_hash: hashSecret(SECRET) } },
        players: { data: null }, // 방에 없음
      }) as unknown as ReturnType<typeof getSupabaseServer>,
    );
    expect(await authenticatePlayer(CODE)).toBeNull();
  });

  it('해시 일치 + 방 소속이면 playerId 반환', async () => {
    setCookie(buildCookieValue(PID, SECRET));
    vi.mocked(getSupabaseServer).mockReturnValue(
      mockSupabase({
        player_auth: { data: { secret_hash: hashSecret(SECRET) } },
        players: { data: { id: PID } },
      }) as unknown as ReturnType<typeof getSupabaseServer>,
    );
    expect(await authenticatePlayer(CODE)).toBe(PID);
  });
});
