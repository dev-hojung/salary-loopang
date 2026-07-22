// 방 생성/입장 API — POST /api/room { action: 'create' | 'join', ... }
import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabaseServer';
import { generateRoomCode, normalizeRoomCode } from '@/lib/roomCode';
import {
  authCookieName,
  authCookieOptions,
  buildCookieValue,
  generateSecret,
  hashSecret,
} from '@/lib/auth';
import { clientIp, rateLimit, RATE } from '@/lib/rateLimit';
import type { CreateRoomResponse, JoinRoomResponse, RoomApiError } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_CODE_ATTEMPTS = 8;
const UNIQUE_VIOLATION = '23505';

const MAX_TITLE_LENGTH = 40;

async function handleCreate(
  body: Record<string, unknown>,
): Promise<NextResponse<CreateRoomResponse | RoomApiError>> {
  const supabase = getSupabaseServer();

  // 방 제목: 선택 입력. 공백 제거 후 비면 null, 길면 잘라서 저장.
  const rawTitle = String(body.title ?? '').trim();
  const title = rawTitle ? rawTitle.slice(0, MAX_TITLE_LENGTH) : null;

  for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt++) {
    const code = generateRoomCode();
    const { error } = await supabase.from('rooms').insert({ code, title });

    if (!error) {
      const { error: stateError } = await supabase
        .from('room_state')
        .insert({ room_code: code, panic: false });

      if (stateError) {
        return NextResponse.json<RoomApiError>({ error: stateError.message }, { status: 500 });
      }

      return NextResponse.json<CreateRoomResponse>({ code, title }, { status: 201 });
    }

    if (error.code !== UNIQUE_VIOLATION) {
      return NextResponse.json<RoomApiError>({ error: error.message }, { status: 500 });
    }
    // 코드 중복 → 재시도
  }

  return NextResponse.json<RoomApiError>(
    { error: '방 코드 생성에 실패했습니다' },
    { status: 500 },
  );
}

async function handleJoin(body: Record<string, unknown>): Promise<
  NextResponse<JoinRoomResponse | RoomApiError>
> {
  const code = normalizeRoomCode(String(body.code ?? ''));
  if (!code) {
    return NextResponse.json<RoomApiError>({ error: '잘못된 방 코드' }, { status: 400 });
  }

  const nickname = String(body.nickname ?? '').trim();
  if (nickname.length < 1 || nickname.length > 20) {
    return NextResponse.json<RoomApiError>({ error: '닉네임을 확인해주세요' }, { status: 400 });
  }

  const supabase = getSupabaseServer();

  const { data: room, error: roomError } = await supabase
    .from('rooms')
    .select('code')
    .eq('code', code)
    .maybeSingle();

  if (roomError) {
    return NextResponse.json<RoomApiError>({ error: roomError.message }, { status: 500 });
  }
  if (!room) {
    return NextResponse.json<RoomApiError>(
      { error: '존재하지 않는 방입니다' },
      { status: 404 },
    );
  }

  const { data: player, error: insertError } = await supabase
    .from('players')
    .insert({ room_code: code, nickname })
    .select()
    .single();

  if (insertError) {
    return NextResponse.json<RoomApiError>({ error: insertError.message }, { status: 500 });
  }

  // 최소 신원: secret 발급 → 해시만 저장(player_auth) → 원문은 httpOnly 쿠키로만 클라에 전달.
  const secret = generateSecret();
  const { error: authError } = await supabase
    .from('player_auth')
    .insert({ player_id: player.id, secret_hash: hashSecret(secret) });
  if (authError) {
    return NextResponse.json<RoomApiError>({ error: authError.message }, { status: 500 });
  }

  const res = NextResponse.json<JoinRoomResponse>({ player }, { status: 200 });
  res.cookies.set(authCookieName(code), buildCookieValue(player.id, secret), authCookieOptions());
  return res;
}

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json<RoomApiError>({ error: '잘못된 요청 본문' }, { status: 400 });
  }

  const action = body?.action;
  const ip = clientIp(req);

  if (action === 'create') {
    if (!rateLimit(`create:${ip}`, RATE.createRoom)) {
      return NextResponse.json<RoomApiError>({ error: '요청이 너무 잦습니다' }, { status: 429 });
    }
    return handleCreate(body);
  }
  if (action === 'join') {
    if (!rateLimit(`join:${ip}`, RATE.joinRoom)) {
      return NextResponse.json<RoomApiError>({ error: '요청이 너무 잦습니다' }, { status: 429 });
    }
    return handleJoin(body);
  }
  return NextResponse.json<RoomApiError>({ error: '알 수 없는 action' }, { status: 400 });
}
