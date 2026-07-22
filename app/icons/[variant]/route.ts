// PWA/파비콘 아이콘 생성 — 🕵️ on 틸 배경. next/og 로 PNG 생성(빌드 시 정적 생성).
// URL: /icons/192, /icons/512, /icons/maskable, /icons/apple  (manifest·메타데이터에서 참조)
import { ImageResponse } from 'next/og';
import { createElement as h } from 'react';

export const dynamic = 'force-static';

type Cfg = { size: number; scale: number; gradient: boolean };
const VARIANTS: Record<string, Cfg> = {
  '192': { size: 192, scale: 0.62, gradient: true },
  '512': { size: 512, scale: 0.62, gradient: true },
  maskable: { size: 512, scale: 0.5, gradient: true }, // safe-zone 위해 작게
  apple: { size: 180, scale: 0.6, gradient: false }, // iOS: 불투명
};

export function generateStaticParams() {
  return Object.keys(VARIANTS).map((variant) => ({ variant }));
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ variant: string }> },
) {
  const { variant } = await params;
  const cfg = VARIANTS[variant] ?? VARIANTS['192'];

  return new ImageResponse(
    h(
      'div',
      {
        style: {
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: cfg.gradient
            ? 'linear-gradient(135deg,#0d7a72 0%,#0a5c56 100%)'
            : '#0d7a72',
        },
      },
      h(
        'div',
        { style: { fontSize: Math.round(cfg.size * cfg.scale), display: 'flex', lineHeight: 1 } },
        '🕵️',
      ),
    ),
    { width: cfg.size, height: cfg.size },
  );
}
