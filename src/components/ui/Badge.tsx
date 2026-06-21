"use client";

import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "live" | "new" | "hot" | "success" | "warning" | "danger";
  className?: string;
}

export function Badge({ children, variant = "default", className }: BadgeProps) {
  const variants = {
    default: "bg-[var(--card)] text-[var(--foreground)]",
    live: "bg-bestbet-live/20 text-bestbet-live",
    new: "bg-bestbet-yellow/20 text-bestbet-yellow",
    hot: "bg-orange-500/20 text-orange-400",
    success: "bg-bestbet-success/20 text-bestbet-success",
    warning: "bg-bestbet-yellow-secondary/20 text-bestbet-yellow-secondary",
    danger: "bg-bestbet-danger/20 text-bestbet-danger",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide",
        variants[variant],
        className
      )}
    >
      {variant === "live" && (
        <span className="w-1.5 h-1.5 rounded-full bg-bestbet-live mr-1 live-pulse" aria-hidden="true" />
      )}
      {children}
    </span>
  );
}
