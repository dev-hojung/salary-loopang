import type { Metadata, Viewport } from "next";
import Script from "next/script";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import "./globals.css";
import {
  SITE_URL,
  SITE_NAME,
  SITE_TAGLINE,
  SITE_DESCRIPTION,
  SITE_KEYWORDS,
} from "@/lib/site";

// Google AdSense 게시자 ID (ca-pub-...). 스크립트 로더 + 사이트 확인 메타태그에 공용.
const ADSENSE_CLIENT = "ca-pub-2629679506425191";

const TITLE = `${SITE_NAME} — ${SITE_TAGLINE}`;

export const metadata: Metadata = {
  // canonical/OG/twitter 의 상대경로를 절대 URL 로 승격시키는 기준 URL.
  metadataBase: new URL(SITE_URL),
  title: {
    default: TITLE,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  keywords: SITE_KEYWORDS,
  applicationName: SITE_NAME,
  category: "games",
  icons: {
    icon: [
      { url: "/icons/192", sizes: "192x192", type: "image/png" },
      { url: "/icons/512", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple", sizes: "180x180", type: "image/png" }],
  },
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    siteName: SITE_NAME,
    title: TITLE,
    description: SITE_DESCRIPTION,
    url: "/",
    // og:image 는 app/opengraph-image.tsx 파일 컨벤션이 자동 주입한다.
  },
  twitter: {
    card: "summary_large_image", // twitter:image 는 og:image 로 폴백됨
    title: TITLE,
    description: SITE_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  // Google Search Console 사이트 소유 확인 → <meta name="google-site-verification" content="...">
  verification: {
    google: "XqlzFmRdBRl35vEl3dQpRaiN6SQZY-svbh5tgDo4tQ4",
  },
  appleWebApp: {
    capable: true,
    title: SITE_NAME,
    statusBarStyle: "default",
  },
  // AdSense 사이트 확인용 메타태그 → <meta name="google-adsense-account" content="ca-pub-..."> (서버 렌더 HTML에 포함)
  other: {
    "google-adsense-account": ADSENSE_CLIENT,
  },
};

// 브라우저 툴바/상태바 색 (Next 16: themeColor 는 viewport 로 이동).
export const viewport: Viewport = {
  themeColor: "#0d7a72",
};

// 구조화 데이터(JSON-LD) — 검색 리치 결과용 WebApplication 스키마.
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: SITE_NAME,
  alternateName: "월급루팡 놀이",
  url: SITE_URL,
  description: SITE_DESCRIPTION,
  applicationCategory: "GameApplication",
  operatingSystem: "Web",
  inLanguage: "ko-KR",
  offers: { "@type": "Offer", price: "0", priceCurrency: "KRW" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+KR:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      {/* 브라우저 확장(문법검사기·비밀번호관리자 등)이 <body> 에 속성을 주입해
          발생하는 하이드레이션 경고를 방지. 앱 자체 렌더는 결정적이라 안전. */}
      <body suppressHydrationWarning>
        {children}
        <ServiceWorkerRegister />
        {/* 구조화 데이터: 검색엔진 리치 결과용 (서버 렌더 HTML에 포함) */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {/* Google AdSense 로더. afterInteractive: 하이드레이션 후 비동기 로드(광고/분석 스크립트 권장 전략). */}
        <Script
          async
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`}
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
