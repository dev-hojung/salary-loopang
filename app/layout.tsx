import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "딴짓메이트",
  description: "월급루팡 대시보드",
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
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
