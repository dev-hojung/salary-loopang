'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { savePlayerSession } from '@/lib/session';
import { normalizeRoomCode } from '@/lib/roomCode';
import { track } from '@/lib/analytics';
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
      track('room_create');
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
      track('room_join');
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
          <h1 style={{ fontSize: 28, fontWeight: 700 }}>딴짓메이트 🕵️</h1>
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

        {/* 사용법 안내 */}
        <div className="card" style={{ opacity: 1, animation: 'none' }}>
          <div className="card-h" style={{ marginBottom: 10 }}>
            <span className="t">🕵️ 이렇게 놀아요</span>
            <span className="badge red">생산성 낮을수록 랭킹 ↑</span>
          </div>
          <ol
            style={{
              margin: 0,
              padding: 0,
              listStyle: 'none',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            {(
              [
                ['🚪', '방 만들기 or 코드 입장', '닉네임만 있으면 로그인 없이 바로 시작.'],
                ['📉', '딴짓할수록 랭킹 ↑', '생산성이 낮을수록 상위! 미니게임(몰래딴짓·커피·가짜 타이핑)으로 열심히 놀기.'],
                ['🚨', '부장님 뜨면 경보', '“부장님 떴다” 한 번이면 방 전원 화면이 위장 업무 화면으로. 20초 뒤 자동 해제.'],
                ['⚔️', '1:1 대결', '상대에게 도전(가위바위보·연타). 이기면 생산성 확 하락 → 랭킹 급상승.'],
                ['👑', '매일 자정 리셋', '생산성 초기화 + 전날 1위는 “루팡왕” 박제. 칭호·업적, 이모지 반응, 칼퇴 축하는 덤.'],
              ] as const
            ).map(([emoji, stepTitle, desc], i) => (
              <li key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span style={{ fontSize: 18, lineHeight: 1.3, flexShrink: 0 }}>{emoji}</span>
                <span style={{ fontSize: 13 }}>
                  <b style={{ fontWeight: 700 }}>{stepTitle}</b>
                  <span style={{ display: 'block', color: 'var(--ink-soft)', marginTop: 1 }}>{desc}</span>
                </span>
              </li>
            ))}
          </ol>
          <p className="label" style={{ marginTop: 12 }}>
            ※ 모든 지표는 실시간이며 아무 의미가 없습니다. 업무 생산성 향상 효과 없음을 보증합니다.
          </p>
        </div>
      </div>
    </div>
  );
}
