import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

// Google AdSense 게시자 ID (ca-pub-...). 스크립트 로더 + 사이트 확인 메타태그에 공용.
const ADSENSE_CLIENT = "ca-pub-2629679506425191";

export const metadata: Metadata = {
  title: "딴짓메이트",
  description: "월급루팡 대시보드",
  // AdSense 사이트 확인용 메타태그 → <meta name="google-adsense-account" content="ca-pub-..."> (서버 렌더 HTML에 포함)
  other: {
    "google-adsense-account": ADSENSE_CLIENT,
  },
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
