"use client";

import { cn } from "@/lib/utils";
import {
  inputFieldClasses,
  inputIconLeftClass,
  inputIconRightClass,
} from "@/lib/input-styles";
import { forwardRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: React.ReactNode;
  inputPrefix?: React.ReactNode;
  showPasswordToggle?: boolean;
  wrapperClassName?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      label,
      error,
      hint,
      icon,
      inputPrefix,
      id,
      showPasswordToggle,
      wrapperClassName,
      type,
      ...props
    },
    ref
  ) => {
    const inputId = id || label?.toLowerCase().replace(/\s/g, "-");
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === "password" || showPasswordToggle;
    const inputType = isPassword && showPassword ? "text" : type;
    const hasLeading = Boolean(icon || inputPrefix);

    return (
      <div className={cn("w-full", wrapperClassName)}>
        {label && (
          <label
            htmlFor={inputId}
            className="mb-2.5 block text-sm font-semibold tracking-wide text-[var(--foreground)]"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <span className={inputIconLeftClass} aria-hidden="true">
              {icon}
            </span>
          )}
          {!icon && inputPrefix && (
            <span
              className={cn(inputIconLeftClass, "w-auto text-sm font-semibold tabular-nums")}
              aria-hidden="true"
            >
              {inputPrefix}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            type={inputType}
            className={inputFieldClasses({
              hasLeading,
              hasTrailing: isPassword,
              error: Boolean(error),
              className,
            })}
            {...props}
          />
          {isPassword && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className={cn(
                inputIconRightClass,
                "rounded-lg text-bestbet-gray-muted transition-colors hover:bg-[var(--card-hover)] hover:text-[var(--foreground)]"
              )}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          )}
        </div>
        {error && <p className="mt-2 text-xs text-bestbet-danger">{error}</p>}
        {!error && hint && (
          <p className="mt-2 text-xs text-bestbet-gray-muted">{hint}</p>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";
