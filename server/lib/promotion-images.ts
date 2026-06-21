export const DEFAULT_PROMOTION_IMAGE = "/images/promotions/default.svg";

export const PROMOTION_IMAGES: Record<string, string> = {
  p1: "/images/promotions/welcome.svg",
  p2: "/images/promotions/acca.svg",
  p3: "/images/promotions/refer.svg",
};

const BROKEN_IMAGE_PREFIXES = ["/banners/", "/banner/"];

export function resolvePromotionImage(id: string, imageUrl?: string | null): string {
  if (imageUrl && !imageUrl.startsWith("/") && !imageUrl.startsWith("http")) {
    return PROMOTION_IMAGES[id] || DEFAULT_PROMOTION_IMAGE;
  }
  if (imageUrl && !BROKEN_IMAGE_PREFIXES.some((prefix) => imageUrl.startsWith(prefix))) {
    return imageUrl;
  }
  return PROMOTION_IMAGES[id] || DEFAULT_PROMOTION_IMAGE;
}
