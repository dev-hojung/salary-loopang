// 방 생성/입장 API — POST /api/room { action: 'create' | 'join', ... }
import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabaseServer';
import { generateRoomCode, normalizeRoomCode } from '@/lib/roomCode';
import type { CreateRoomResponse, JoinRoomResponse, RoomApiError } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_CODE_ATTEMPTS = 8;
const UNIQUE_VIOLATION = '23505';

async function handleCreate(): Promise<NextResponse<CreateRoomResponse | RoomApiError>> {
  const supabase = getSupabaseServer();

  for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt++) {
    const code = generateRoomCode();
    const { error } = await supabase.from('rooms').insert({ code });

    if (!error) {
      const { error: stateError } = await supabase
        .from('room_state')
        .insert({ room_code: code, panic: false });

      if (stateError) {
        return NextResponse.json<RoomApiError>({ error: stateError.message }, { status: 500 });
      }

      return NextResponse.json<CreateRoomResponse>({ code }, { status: 201 });
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

  return NextResponse.json<JoinRoomResponse>({ player }, { status: 200 });
}

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json<RoomApiError>({ error: '잘못된 요청 본문' }, { status: 400 });
  }

  const action = body?.action;

  if (action === 'create') {
    return handleCreate();
  }
  if (action === 'join') {
    return handleJoin(body);
  }
  return NextResponse.json<RoomApiError>({ error: '알 수 없는 action' }, { status: 400 });
}
