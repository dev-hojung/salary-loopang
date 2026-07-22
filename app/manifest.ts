import type { MetadataRoute } from 'next';
import { SITE_NAME, SITE_TAGLINE, SITE_DESCRIPTION } from '@/lib/site';

// PWA 웹앱 매니페스트. Next 가 /manifest.webmanifest 로 서빙하고 <link rel="manifest"> 자동 주입.
export const dynamic = 'force-static';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE_NAME} — ${SITE_TAGLINE}`,
    short_name: SITE_NAME,
    description: SITE_DESCRIPTION,
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#0d7a72',
    lang: 'ko',
    orientation: 'portrait',
    categories: ['games', 'entertainment', 'social'],
    icons: [
      { src: '/icons/192', sizes: '192x192', type: 'image/png' },
      { src: '/icons/512', sizes: '512x512', type: 'image/png' },
      { src: '/icons/maskable', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
