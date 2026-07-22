// 최소 신원 검증 (무로그인 유지) — "이 요청자가 이 방의 이 player 본인인가"를 서버에서 확인한다.
// join 시 서버가 secret 을 발급해 httpOnly 쿠키(loopang_auth_{CODE})로 심고, secret_hash 만 player_auth 에 저장.
// 이후 mutation 라우트는 쿠키의 secret 을 해시해 저장된 해시와 대조(타이밍 안전)하고 방 소속까지 확인한다.
import { cookies } from 'next/headers';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { getSupabaseServer } from '@/lib/supabaseServer';

export function authCookieName(code: string): string {
  return `loopang_auth_${code.toUpperCase()}`;
}

// join 응답에 심을 httpOnly 쿠키 옵션. 로컬(http)에서는 secure 를 끄고 배포(https)에서만 켠다.
export function authCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30일
  };
}

export function generateSecret(): string {
  return randomBytes(32).toString('base64url');
}

export function hashSecret(secret: string): string {
  return createHash('sha256').update(secret).digest('hex');
}

function safeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
  } catch {
    return false;
  }
}

// 쿠키 값 형식: "<playerId>.<secret>"
export function buildCookieValue(playerId: string, secret: string): string {
  return `${playerId}.${secret}`;
}

// 인증된 playerId 반환. 실패 시 null.
// 검증: 쿠키 존재 → player_auth 해시 대조 → 해당 player 가 이 방 소속인지 확인.
export async function authenticatePlayer(code: string): Promise<string | null> {
  const store = await cookies();
  const raw = store.get(authCookieName(code))?.value;
  if (!raw) return null;

  const dot = raw.indexOf('.');
  if (dot <= 0) return null;
  const playerId = raw.slice(0, dot);
  const secret = raw.slice(dot + 1);
  if (!playerId || !secret) return null;

  const supabase = getSupabaseServer();

  const { data: auth } = await supabase
    .from('player_auth')
    .select('secret_hash')
    .eq('player_id', playerId)
    .maybeSingle();
  if (!auth?.secret_hash) return null;
  if (!safeEqualHex(String(auth.secret_hash), hashSecret(secret))) return null;

  // 다른 방 쿠키로 이 방을 조작하지 못하도록 방 소속 확인.
  const { data: player } = await supabase
    .from('players')
    .select('id')
    .eq('id', playerId)
    .eq('room_code', code.toUpperCase())
    .maybeSingle();

  return player ? playerId : null;
}
