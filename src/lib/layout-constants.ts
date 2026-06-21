/** Space reserved for floating bottom nav + safe area (matches MobileBottomNav). */
export const MOBILE_NAV_CLEARANCE =
  "calc(4.75rem + env(safe-area-inset-bottom, 0px))";

/** Collapsed bet slip bar height + gap above nav. */
export const MOBILE_SLIP_BAR_CLEARANCE =
  "calc(7.25rem + env(safe-area-inset-bottom, 0px))";

export const DASHBOARD_TAB_SLUGS = {
  Overview: "overview",
  "Active Bets": "active-bets",
  History: "history",
  Transactions: "transactions",
  "Booking Codes": "booking-codes",
} as const;

export type DashboardTab = keyof typeof DASHBOARD_TAB_SLUGS;

export function dashboardTabFromSlug(slug: string | null): DashboardTab | null {
  if (!slug) return null;
  const entry = Object.entries(DASHBOARD_TAB_SLUGS).find(([, value]) => value === slug);
  return entry ? (entry[0] as DashboardTab) : null;
}
