import { ImageResponse } from "next/og";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/site";
import { loadKoreanFont } from "@/lib/ogFont";

// 소셜 공유(카톡·X·페북) 미리보기 카드 — 코드로 동적 생성.
export const alt = `${SITE_NAME} — ${SITE_TAGLINE}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  const heading = SITE_NAME;
  const tagline = SITE_TAGLINE;
  const badge = "로그인 없이 4자리 코드로 바로 시작";
  const foot = "생산성이 낮을수록 랭킹 상승";

  const [bold, regular] = await Promise.all([
    loadKoreanFont(heading, 700),
    loadKoreanFont(badge + tagline + foot, 400),
  ]);

  const fonts: {
    name: string;
    data: ArrayBuffer;
    weight: 400 | 700;
    style: "normal";
  }[] = [];
  if (bold) fonts.push({ name: "NotoSansKR", data: bold, weight: 700, style: "normal" });
  if (regular)
    fonts.push({ name: "NotoSansKR", data: regular, weight: 400, style: "normal" });

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "84px 88px",
          background: "linear-gradient(135deg, #0d7a72 0%, #0a5c56 55%, #08403c 100%)",
          color: "#ffffff",
          fontFamily: "NotoSansKR",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 18,
            fontSize: 34,
            fontWeight: 400,
            opacity: 0.95,
          }}
        >
          <div
            style={{
              display: "flex",
              width: 18,
              height: 18,
              borderRadius: 999,
              background: "#7ee7dc",
            }}
          />
          <div style={{ display: "flex" }}>{badge}</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 150, lineHeight: 1 }}>🕵️</div>
          <div style={{ display: "flex", fontSize: 128, fontWeight: 700, marginTop: 8 }}>
            {heading}
          </div>
          <div style={{ display: "flex", fontSize: 52, fontWeight: 400, opacity: 0.92, marginTop: 14 }}>
            {tagline}
          </div>
        </div>

        <div style={{ display: "flex", fontSize: 34, fontWeight: 400, opacity: 0.85 }}>
          {foot}
        </div>
      </div>
    ),
    { ...size, fonts: fonts.length ? fonts : undefined },
  );
}
