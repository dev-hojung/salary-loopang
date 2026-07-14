'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { savePlayerSession } from '@/lib/session';
import { normalizeRoomCode } from '@/lib/roomCode';
import type { CreateRoomResponse, JoinRoomResponse, RoomApiError } from '@/lib/types';

type Busy = 'create' | 'join' | null;

export default function Home() {
  const router = useRouter();
  const [nickname, setNickname] = useState('');
  const [title, setTitle] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<Busy>(null);

  // 방 코드 + 닉네임으로 입장 요청. 실패 시 에러를 세팅하고 null 반환.
  async function joinRoom(roomCode: string, name: string): Promise<JoinRoomResponse | null> {
    const res = await fetch('/api/room', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'join', code: roomCode, nickname: name }),
    });
    if (!res.ok) {
      if (res.status === 404) {
        setError('존재하지 않는 방입니다');
      } else {
        const body = (await res.json().catch(() => null)) as RoomApiError | null;
        setError(body?.error ?? '입장에 실패했습니다');
      }
      return null;
    }
    return (await res.json()) as JoinRoomResponse;
  }

  async function handleCreate() {
    const name = nickname.trim();
    if (!name) {
      setError('닉네임을 입력해주세요');
      return;
    }
    setError(null);
    setBusy('create');
    try {
      const res = await fetch('/api/room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', title: title.trim() }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as RoomApiError | null;
        setError(body?.error ?? '방 생성에 실패했습니다');
        return;
      }
      const { code: roomCode } = (await res.json()) as CreateRoomResponse;
      const joined = await joinRoom(roomCode, name);
      if (!joined) return;
      savePlayerSession({ id: joined.player.id, nickname: name, room_code: roomCode });
      router.push(`/room/${roomCode}`);
    } catch {
      setError('네트워크 오류가 발생했습니다');
    } finally {
      setBusy(null);
    }
  }

  async function handleJoin() {
    const name = nickname.trim();
    if (!name) {
      setError('닉네임을 입력해주세요');
      return;
    }
    const normalized = normalizeRoomCode(code);
    if (!normalized) {
      setError('코드 4자리를 정확히 입력해주세요');
      return;
    }
    setError(null);
    setBusy('join');
    try {
      const joined = await joinRoom(normalized, name);
      if (!joined) return;
      savePlayerSession({ id: joined.player.id, nickname: name, room_code: normalized });
      router.push(`/room/${normalized}`);
    } catch {
      setError('네트워크 오류가 발생했습니다');
    } finally {
      setBusy(null);
    }
  }

  const disabled = busy !== null;

  return (
    <div className="wrap" style={{ display: 'flex', justifyContent: 'center' }}>
      <div style={{ maxWidth: 400, width: '100%', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: 28, fontWeight: 700 }}>루팡 길드 🕵️</h1>
          <p style={{ marginTop: 6, fontSize: 13, fontWeight: 300, color: 'var(--ink-soft)' }}>
            부장님 몰래, 다 같이 루팡하는 시간을 재보자
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 12 }}>
            <span className="badge">로그인 없이 바로 시작</span>
          </div>
        </div>

        <div className="card" style={{ opacity: 1, animation: 'none', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="setrow" style={{ justifyContent: 'space-between' }}>
            <label htmlFor="nickname">닉네임</label>
            <input
              id="nickname"
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              maxLength={20}
              placeholder="부장님몰래"
              style={{ flex: 1, marginLeft: 10, textAlign: 'left' }}
            />
          </div>

          <div className="setrow" style={{ justifyContent: 'space-between' }}>
            <label htmlFor="room-title">방 제목</label>
            <input
              id="room-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={40}
              placeholder="예: 3층 탕비실 루팡단"
              style={{ flex: 1, marginLeft: 10, textAlign: 'left' }}
            />
          </div>

          <button className="btn" onClick={handleCreate} disabled={disabled}>
            {busy === 'create' ? '처리 중...' : '🚪 새 방 만들기'}
          </button>
          <p style={{ fontSize: 11, color: 'var(--ink-soft)', marginTop: -6 }}>
            방 제목은 선택 사항이에요. (코드로 입장할 땐 필요 없음)
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '4px 0' }}>
            <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
            <span style={{ fontSize: 11, color: 'var(--ink-soft)' }}>또는 코드로 입장</span>
            <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              maxLength={4}
              placeholder="ABCD"
              className="mono"
              style={{
                flex: 1,
                width: 'auto',
                border: '1px solid var(--line)',
                borderRadius: 8,
                padding: '8px 10px',
                fontSize: 14,
                fontWeight: 600,
                color: 'var(--ink)',
                textAlign: 'center',
              }}
            />
            <button
              className="btn ghost"
              style={{ width: 'auto', padding: '13px 18px' }}
              onClick={handleJoin}
              disabled={disabled}
            >
              {busy === 'join' ? '처리 중...' : '입장 →'}
            </button>
          </div>

          {error && <p style={{ color: 'var(--red)', fontSize: 12, fontWeight: 500 }}>{error}</p>}
        </div>
      </div>
    </div>
  );
}
