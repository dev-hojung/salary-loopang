'use client';

// B-2 · 이모지 반응 — 방 전원에게 실시간 브로드캐스트되는 떠오르는 이모지.
// DB 없이 broadcast 채널만 사용(일시적). self:true 라 보낸 사람도 함께 본다.
import { useCallback, useEffect, useRef, useState } from 'react';
import { getSupabaseBrowser } from '@/lib/supabaseClient';

const EMOJIS = ['😂', '👍', '🔥', '☕', '💀', '🎉'];

type Floater = { id: number; emoji: string; left: number };

export default function Reactions({ code }: { code: string }) {
  const [floaters, setFloaters] = useState<Floater[]>([]);
  const channelRef = useRef<ReturnType<ReturnType<typeof getSupabaseBrowser>['channel']> | null>(null);
  const idRef = useRef(0);
  const rndRef = useRef(0);

  const spawn = useCallback((emoji: string) => {
    idRef.current += 1;
    const id = idRef.current;
    // 화면 가로 20~80% 사이에 랜덤 배치 (index 기반 의사난수 — 렌더 중 아님).
    rndRef.current = (rndRef.current * 9301 + 49297) % 233280;
    const left = 20 + (rndRef.current / 233280) * 60;
    setFloaters((f) => [...f, { id, emoji, left }]);
    setTimeout(() => setFloaters((f) => f.filter((x) => x.id !== id)), 2300);
  }, []);

  useEffect(() => {
    const supabase = getSupabaseBrowser();
    const channel = supabase.channel(`reactions:${code}`, {
      config: { broadcast: { self: true } },
    });
    channel
      .on('broadcast', { event: 'emoji' }, ({ payload }) => {
        const e = (payload as { emoji?: string })?.emoji;
        if (e && EMOJIS.includes(e)) spawn(e);
      })
      .subscribe();
    channelRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [code, spawn]);

  const send = useCallback((emoji: string) => {
    channelRef.current?.send({ type: 'broadcast', event: 'emoji', payload: { emoji } });
    // self:true 이므로 구독 콜백에서 spawn 됨 (여기서 중복 spawn 하지 않음).
  }, []);

  return (
    <>
      {floaters.map((f) => (
        <span key={f.id} className="reaction-float" style={{ left: `${f.left}vw` }}>
          {f.emoji}
        </span>
      ))}
      <div className="reaction-bar">
        {EMOJIS.map((e) => (
          <button key={e} type="button" onClick={() => send(e)} aria-label={`반응 ${e}`}>
            {e}
          </button>
        ))}
      </div>
    </>
  );
}
