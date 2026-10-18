import type { SiteImage } from "@/types";

export type SiteImageSection = "hero" | "brand_story" | "atmosphere";

/**
 * Server-side fetch of visible, ordered images for one landing-page section
 * (same `GET /api/site-images` the client hook used to call). Returns [] on
 * any error, so callers fall back to their static assets without showing an
 * error state on the public site.
 *
 * `cache: "no-store"` keeps the homepage dynamic, so admin edits appear on
 * the next request. The rewrite in next.config.js only applies to browser
 * requests, so the backend is addressed directly here.
 */
export async function getSiteImages(section: SiteImageSection): Promise<SiteImage[]> {
  try {
    const backend = process.env.BACKEND_URL ?? "http://127.0.0.1:3001";
    const res = await fetch(`${backend}/api/site-images?section=${section}`, { cache: "no-store" });
    if (!res.ok) return [];
    const json = await res.json();
    return Array.isArray(json?.data) ? (json.data as SiteImage[]) : [];
  } catch {
    // Backend unreachable: keep the static fallback.
    return [];
  }
}
