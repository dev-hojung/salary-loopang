'use client';

// B-1 · 초대 개선 — 방 링크를 네이티브 공유(모바일) 또는 클립보드 복사.
import { useState } from 'react';
import { track } from '@/lib/analytics';

export default function InviteButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  async function invite() {
    track('invite_share');
    const url = `${window.location.origin}/room/${code}`;
    const text = `🕵️ 딴짓메이트 — 부장님 몰래 다 같이 월급루팡!\n코드 ${code} 로 지금 입장 👉`;

    // 모바일 등 네이티브 공유가 있으면 우선 사용(카톡·메신저로 바로 공유).
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: '딴짓메이트', text, url });
        return;
      } catch {
        return; // 사용자가 공유 취소 — 아무것도 안 함
      }
    }

    // 폴백: 문구 + 링크를 함께 클립보드 복사(붙여넣으면 바로 초대 메시지).
    try {
      await navigator.clipboard.writeText(`${text} ${url}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* 클립보드 접근 불가 — 무시 */
    }
  }

  return (
    <button
      className="btn ghost"
      onClick={invite}
      style={{ width: 'auto', padding: '5px 12px', fontSize: 12 }}
    >
      {copied ? '✅ 링크 복사됨!' : '🔗 초대'}
    </button>
  );
}
