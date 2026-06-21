import { cn } from "@/lib/utils";

/** Shared field height: 56px (within 52–56px spec) */
export const INPUT_HEIGHT_CLASS = "h-14";

/** Left padding when an icon or prefix is present */
export const INPUT_ICON_PADDING = "pl-12";

/** Right padding when a trailing control is present */
export const INPUT_TRAILING_PADDING = "pr-12";

export const inputIconLeftClass =
  "pointer-events-none absolute left-4 top-1/2 z-10 flex h-5 w-5 -translate-y-1/2 items-center justify-center text-bestbet-gray-muted";

export const inputIconRightClass =
  "absolute right-3 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center";

export function inputFieldClasses(options?: {
  hasLeading?: boolean;
  hasTrailing?: boolean;
  error?: boolean;
  className?: string;
}) {
  const { hasLeading, hasTrailing, error, className } = options ?? {};
  return cn(
    "flex w-full items-center rounded-xl border bg-[var(--card)]",
    INPUT_HEIGHT_CLASS,
    "px-4 text-sm leading-normal text-[var(--foreground)]",
    "placeholder:text-bestbet-gray-muted/70",
    "transition-[border-color,box-shadow,background-color] duration-300 ease-out",
    "border-[var(--border)]",
    "focus:border-bestbet-yellow focus:outline-none focus:ring-2 focus:ring-bestbet-yellow/30",
    "focus:shadow-[0_0_0_1px_rgba(255,215,0,0.15),0_0_24px_rgba(255,215,0,0.08)]",
    hasLeading && INPUT_ICON_PADDING,
    hasTrailing && INPUT_TRAILING_PADDING,
    error && "border-bestbet-danger focus:border-bestbet-danger focus:ring-bestbet-danger/25",
    className
  );
}
