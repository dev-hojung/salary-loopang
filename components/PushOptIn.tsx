'use client';

// 재참여 푸시 옵트인 — 권한 요청 + 구독 → /api/push/subscribe 저장.
// VAPID 공개키 미설정/미지원/거부 시엔 조용히 숨김(강요 X).
import { useEffect, useState } from 'react';

const VAPID = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

// base64url VAPID 공개키 → 바이트(applicationServerKey). 명시적 ArrayBuffer 백킹으로 BufferSource 타입 충족.
function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(normalized);
  const buffer = new ArrayBuffer(raw.length);
  const arr = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

type State = 'idle' | 'unsupported' | 'granted' | 'denied' | 'working';

export default function PushOptIn({ code }: { code: string }) {
  const [state, setState] = useState<State>('idle');

  useEffect(() => {
    const supported =
      !!VAPID &&
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window;

    let next: State = 'idle';
    if (!supported) next = 'unsupported';
    else if (Notification.permission === 'granted') next = 'granted';
    else if (Notification.permission === 'denied') next = 'denied';

    // eslint-disable-next-line react-hooks/set-state-in-effect -- 마운트 후 클라 환경(지원/권한) 1회 판정
    setState(next);
  }, []);

  async function enable() {
    if (!VAPID) return;
    setState('working');
    try {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') {
        setState(perm === 'denied' ? 'denied' : 'idle');
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID),
      });
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, subscription: sub.toJSON() }),
      });
      setState('granted');
    } catch {
      setState('idle');
    }
  }

  if (state === 'unsupported' || state === 'denied') return null;
  if (state === 'granted') return <span className="badge">🔔 알림 켜짐</span>;

  return (
    <button
      className="btn ghost"
      onClick={enable}
      disabled={state === 'working'}
      style={{ width: 'auto', padding: '4px 10px', fontSize: 12 }}
    >
      {state === 'working' ? '설정 중...' : '🔔 알림 켜기'}
    </button>
  );
}
