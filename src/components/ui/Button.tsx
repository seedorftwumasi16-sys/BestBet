"use client";

import { cn } from "@/lib/utils";
import { forwardRef } from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", loading, children, disabled, ...props }, ref) => {
    const variants = {
      primary:
        "bg-bestbet-yellow text-bestbet-black hover:bg-bestbet-yellow-secondary hover:shadow-lg hover:shadow-bestbet-yellow/25 font-bold border border-bestbet-yellow/20",
      secondary:
        "bg-[var(--card)] text-[var(--foreground)] hover:bg-[var(--card-hover)] hover:border-bestbet-yellow/30 border border-[var(--border)]",
      outline:
        "border-2 border-bestbet-yellow text-bestbet-yellow hover:bg-bestbet-yellow hover:text-bestbet-black hover:shadow-lg hover:shadow-bestbet-yellow/20",
      ghost: "text-[var(--foreground)] hover:bg-bestbet-yellow/10 hover:text-bestbet-yellow",
      danger: "bg-bestbet-danger text-white hover:bg-bestbet-red-dark",
    };

    const sizes = {
      sm: "px-3 py-1.5 text-xs rounded-lg",
      md: "px-4 py-2.5 text-sm rounded-lg",
      lg: "px-6 py-3 text-base rounded-xl",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          "inline-flex items-center justify-center gap-2 font-semibold transition-all duration-200",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bestbet-yellow",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          "active:scale-[0.98]",
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {loading && (
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";
