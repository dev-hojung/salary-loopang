// next/og ImageResponse 용 한글 폰트 로더 — Google Fonts 에서 Noto Sans KR 를 텍스트 서브셋 ttf 로 받는다.
// satori 는 woff2 를 못 읽으므로 구형 User-Agent 로 ttf 를 유도한다. 실패 시 null(이미지는 폰트 없이 생성).
export async function loadKoreanFont(
  text: string,
  weight: number,
): Promise<ArrayBuffer | null> {
  try {
    const cssUrl = `https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@${weight}&text=${encodeURIComponent(text)}`;
    const cssRes = await fetch(cssUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 6.1; rv:1.0) Gecko/20100101 Firefox/1.0",
      },
      cache: "force-cache",
    });
    if (!cssRes.ok) return null;
    const css = await cssRes.text();
    const url = css.match(/src:\s*url\((https:\/\/[^)]+)\)/)?.[1];
    if (!url) return null;
    const fontRes = await fetch(url, { cache: "force-cache" });
    if (!fontRes.ok) return null;
    return await fontRes.arrayBuffer();
  } catch {
    return null;
  }
}
