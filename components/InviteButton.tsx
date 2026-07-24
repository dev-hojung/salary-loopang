'use client';

// B-1 · 초대 — 방 링크를 클립보드에 복사(단순).
import { useState } from 'react';
import { track } from '@/lib/analytics';

export default function InviteButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  async function invite() {
    track('invite_share');
    const url = `${window.location.origin}/room/${code}`;
    // 방 링크를 클립보드에 복사.
    try {
      await navigator.clipboard.writeText(url);
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
