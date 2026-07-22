import type { Metadata } from "next";

// 방은 일시적·비공개(초대 코드 기반)라 검색 색인에서 제외한다.
// 초대 링크 공유 시 브랜드 미리보기(og:image 등)는 루트 레이아웃에서 상속받는다.
export const metadata: Metadata = {
  title: "루팡방",
  description: "초대 코드로 입장한 실시간 루팡방. 부장님 몰래 다 같이 월급루팡!",
  robots: { index: false, follow: false },
};

export default function RoomLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>;
}
