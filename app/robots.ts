import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// 검색 크롤러 규칙. 방(/room/ — 일시적·비공개)과 API 는 색인 제외.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/room/", "/api/"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
