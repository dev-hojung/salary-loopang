// 서비스 공개 정보 — SEO(메타데이터·sitemap·robots·OG 이미지)에서 공용으로 쓰는 상수.
// 배포 URL 우선순위: 명시적 env(NEXT_PUBLIC_SITE_URL) → Railway 자동 주입 도메인 → 로컬.
// 커스텀 도메인이 확정되면 Railway 변수에 NEXT_PUBLIC_SITE_URL 를 넣으면 canonical/OG 가 그 값을 따른다.
function resolveSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/+$/, '');
  const railway = process.env.RAILWAY_PUBLIC_DOMAIN; // Railway 가 런타임/빌드에 자동 주입
  if (railway) return `https://${railway}`;
  return 'http://localhost:3000';
}

export const SITE_URL = resolveSiteUrl();
export const SITE_NAME = '딴짓메이트';
export const SITE_TAGLINE = '부장님 몰래 다 같이 월급루팡';
export const SITE_DESCRIPTION =
  '로그인 없이 4자리 코드로 시작하는 실시간 멀티플레이 딴짓 놀이. 생산성이 낮을수록 랭킹 상승! 부장님 경보·1:1 대결·미니게임·매일 루팡왕까지, 직장인 동료와 함께 즐기는 월급루팡 게임.';
export const SITE_KEYWORDS = [
  '딴짓메이트',
  '월급루팡',
  '루팡',
  '루팡왕',
  '직장인 게임',
  '사무실 게임',
  '실시간 멀티플레이',
  '부장님 몰래',
  '딴짓',
  '킬링타임',
];
