import { ImageResponse } from "next/og";
import { getSupabaseServer } from "@/lib/supabaseServer";
import { normalizeRoomCode } from "@/lib/roomCode";
import { loadKoreanFont } from "@/lib/ogFont";
import { SITE_NAME } from "@/lib/site";

// 방별 초대 링크(/room/CODE) 공유 미리보기 — 방 제목 + 4자리 코드로 리치 카드 생성.
export const alt = "딴짓메이트 루팡방 초대";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ code: string }> }) {
  const { code: rawCode } = await params;
  const code = normalizeRoomCode(String(rawCode)) ?? String(rawCode).toUpperCase().slice(0, 8);

  let title: string | null = null;
  try {
    const { data } = await getSupabaseServer()
      .from("rooms")
      .select("title")
      .eq("code", code)
      .maybeSingle();
    title = (data?.title as string | undefined) ?? null;
  } catch {
    /* 조회 실패 시 기본 문구 */
  }

  const rawHeading = title || "루팡방";
  const heading = rawHeading.length > 16 ? `${rawHeading.slice(0, 16)}…` : rawHeading;
  const tagline = "부장님 몰래 다 같이 월급루팡";
  const cta = "이 코드로 지금 참여";
  const alpha = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"; // 방코드 문자 서브셋 보장

  const [bold, regular] = await Promise.all([
    loadKoreanFont(heading + SITE_NAME + alpha, 700),
    loadKoreanFont(tagline + cta + "코드" + alpha, 400),
  ]);
  const fonts: { name: string; data: ArrayBuffer; weight: 400 | 700; style: "normal" }[] = [];
  if (bold) fonts.push({ name: "NotoSansKR", data: bold, weight: 700, style: "normal" });
  if (regular) fonts.push({ name: "NotoSansKR", data: regular, weight: 400, style: "normal" });

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "78px 88px",
          background: "linear-gradient(135deg, #0d7a72 0%, #0a5c56 55%, #08403c 100%)",
          color: "#ffffff",
          fontFamily: "NotoSansKR",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 36, fontWeight: 700 }}>
          <div style={{ display: "flex", fontSize: 64, lineHeight: 1 }}>🕵️</div>
          <div style={{ display: "flex" }}>{SITE_NAME}</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 88, fontWeight: 700, lineHeight: 1.05 }}>{heading}</div>
          <div style={{ display: "flex", fontSize: 46, fontWeight: 400, opacity: 0.9, marginTop: 14 }}>
            {tagline}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <div style={{ display: "flex", fontSize: 32, fontWeight: 400, opacity: 0.85 }}>{cta}</div>
          <div
            style={{
              display: "flex",
              fontSize: 72,
              fontWeight: 700,
              letterSpacing: 10,
              padding: "6px 30px",
              border: "3px solid rgba(255,255,255,0.55)",
              borderRadius: 18,
            }}
          >
            {code}
          </div>
        </div>
      </div>
    ),
    { ...size, fonts: fonts.length ? fonts : undefined },
  );
}
