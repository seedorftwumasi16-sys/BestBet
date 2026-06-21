export const DEFAULT_PROMOTION_IMAGE = "/images/promotions/default.svg";

export const PROMOTION_IMAGES: Record<string, string> = {
  p1: "/images/promotions/welcome.svg",
  p2: "/images/promotions/acca.svg",
  p3: "/images/promotions/refer.svg",
};

const BROKEN_IMAGE_PREFIXES = ["/banners/", "/banner/"];

export function isEmojiImage(value: string): boolean {
  if (!value) return false;
  if (value.startsWith("/") || value.startsWith("http")) return false;
  return /\p{Extended_Pictographic}/u.test(value);
}

export function isBrokenPromotionPath(value: string): boolean {
  return BROKEN_IMAGE_PREFIXES.some((prefix) => value.startsWith(prefix));
}

export function resolvePromotionImage(id: string, image?: string | null): string {
  if (image && !isEmojiImage(image) && !isBrokenPromotionPath(image)) {
    return image;
  }
  return PROMOTION_IMAGES[id] || DEFAULT_PROMOTION_IMAGE;
}
