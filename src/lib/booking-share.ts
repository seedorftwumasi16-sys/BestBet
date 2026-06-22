import type { BetSelection } from "@/lib/constants";
import { formatOdds } from "@/lib/utils";

export interface BookingShareData {
  code: string;
  name: string;
  stake: number;
  totalOdds: number;
  potentialWin: number;
  selections: BetSelection[];
  createdAt: string;
  status: string;
}

export function deriveBetSlipName(selectionCount: number, createdAt?: string): string {
  const date = createdAt ? new Date(createdAt) : new Date();
  const day = date.getUTCDay();
  if (selectionCount >= 4 && (day === 0 || day === 5 || day === 6)) {
    return "Weekend Jackpot";
  }
  if (selectionCount === 1) return "Single Bet";
  if (selectionCount === 2) return "Double Bet";
  if (selectionCount === 3) return "Treble";
  return `${selectionCount}-Fold Multi`;
}

export function formatSelectionLine(sel: BetSelection): string {
  return `${sel.matchName} — ${sel.selection}`;
}

export function formatBookingCreatedAt(iso: string): string {
  const date = new Date(iso);
  const formatted = date.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  });
  return `${formatted} GMT`;
}

export function buildBookingShareText(data: BookingShareData): string {
  return [
    `🔥 BestBet Booking Code: ${data.code}`,
    data.name,
    `Odds: ${formatOdds(data.totalOdds)}`,
    "Load this bet instantly on BestBet using the booking code above.",
  ].join("\n");
}

export async function copyBookingShareText(data: BookingShareData): Promise<void> {
  await navigator.clipboard.writeText(buildBookingShareText(data));
}

export async function shareBookingCode(data: BookingShareData): Promise<void> {
  const text = buildBookingShareText(data);
  await navigator.clipboard.writeText(text);

  if (typeof navigator.share === "function") {
    try {
      await navigator.share({
        title: "BestBet Booking Code",
        text,
      });
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      throw err;
    }
  }
}

export async function downloadBookingCardImage(
  element: HTMLElement,
  fileName: string
): Promise<void> {
  const { toPng } = await import("html-to-image");
  const dataUrl = await toPng(element, {
    backgroundColor: "#0A0A0A",
    pixelRatio: 2,
    cacheBust: true,
  });

  const link = document.createElement("a");
  link.download = fileName;
  link.href = dataUrl;
  link.click();
}
