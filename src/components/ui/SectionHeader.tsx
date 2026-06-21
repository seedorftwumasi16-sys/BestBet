import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface SectionHeaderProps {
  id?: string;
  title: string;
  actionLabel?: string;
  actionHref?: string;
  live?: boolean;
  className?: string;
}

export function SectionHeader({ id, title, actionLabel, actionHref, live, className }: SectionHeaderProps) {
  return (
    <div className={cn("flex items-center justify-between mb-4", className)}>
      <h2
        id={id}
        className={cn(
          "flex items-center gap-2.5 font-display text-base md:text-lg font-bold tracking-tight text-white",
          live && "text-bestbet-live"
        )}
      >
        {live && <span className="w-2 h-2 rounded-full bg-bestbet-live live-pulse shrink-0" />}
        <span className="h-5 w-1 rounded-full bg-gradient-to-b from-bestbet-yellow to-bestbet-yellow-secondary shrink-0" />
        {title}
      </h2>
      {actionLabel && actionHref && (
        <Link
          href={actionHref}
          className="flex items-center gap-0.5 text-xs font-semibold text-bestbet-yellow hover:text-bestbet-yellow-light transition-colors"
        >
          {actionLabel}
          <ChevronRight size={14} />
        </Link>
      )}
    </div>
  );
}
