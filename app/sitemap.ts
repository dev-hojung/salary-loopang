import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// 공개·정적 경로만 등록. 방(/room/[code])은 일시적·비공개라 제외.
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return [
    { url: `${SITE_URL}/`, lastModified, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/solo`, lastModified, changeFrequency: "monthly", priority: 0.6 },
  ];
}
