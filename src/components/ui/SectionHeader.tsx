import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface SectionHeaderProps {
  id?: string;
  title: string;
  actionLabel?: string;
  actionHref?: string;
  live?: boolean;
  leading?: ReactNode;
  className?: string;
}

export function SectionHeader({ id, title, actionLabel, actionHref, live, leading, className }: SectionHeaderProps) {
  return (
    <div className={cn("flex items-center justify-between gap-2 mb-3 sm:mb-4", className)}>
      <h2
        id={id}
        className={cn(
          "flex items-center gap-2 font-display text-lg sm:text-xl md:text-lg font-bold tracking-tight text-white min-w-0",
          live && "text-bestbet-live"
        )}
      >
        {leading}
        {live && <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-bestbet-live live-pulse shrink-0" />}
        {!leading && (
          <span className="h-4 sm:h-5 w-0.5 sm:w-1 rounded-full bg-gradient-to-b from-bestbet-yellow to-bestbet-yellow-secondary shrink-0" />
        )}
        <span className="truncate">{title}</span>
      </h2>
      {actionLabel && actionHref && (
        <Link
          href={actionHref}
          className="flex items-center gap-0.5 text-[11px] sm:text-xs font-semibold text-bestbet-yellow hover:text-bestbet-yellow-light transition-colors shrink-0 whitespace-nowrap"
        >
          {actionLabel}
          <ChevronRight size={14} />
        </Link>
      )}
    </div>
  );
}
