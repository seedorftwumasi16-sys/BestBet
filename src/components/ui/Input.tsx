"use client";

import { cn } from "@/lib/utils";
import { forwardRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  showPasswordToggle?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, icon, id, showPasswordToggle, type, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s/g, "-");
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === "password" || showPasswordToggle;
    const inputType = isPassword && showPassword ? "text" : type;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-semibold text-[var(--foreground)] mb-2.5"
          >
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {icon && (
            <div className="pointer-events-none absolute left-4 flex h-full items-center text-bestbet-gray-muted">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            type={inputType}
            className={cn(
              "flex h-12 w-full items-center rounded-xl border border-[var(--border)] bg-[var(--card)]",
              "px-4 text-sm leading-normal text-[var(--foreground)]",
              "placeholder:text-bestbet-gray-muted/80",
              "transition-all duration-200",
              "focus:border-bestbet-yellow focus:outline-none focus:ring-2 focus:ring-bestbet-yellow/25",
              icon && "pl-11",
              (isPassword || showPasswordToggle) && "pr-11",
              error && "border-bestbet-danger focus:ring-bestbet-danger/25",
              className
            )}
            {...props}
          />
          {isPassword && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 flex h-8 w-8 items-center justify-center rounded-lg text-bestbet-gray-muted transition-colors hover:bg-[var(--card-hover)] hover:text-[var(--foreground)]"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          )}
        </div>
        {error && <p className="mt-2 text-xs text-bestbet-danger">{error}</p>}
      </div>
    );
  }
);
Input.displayName = "Input";
