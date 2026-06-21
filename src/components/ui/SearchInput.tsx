"use client";

import { forwardRef } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  inputFieldClasses,
  inputIconLeftClass,
} from "@/lib/input-styles";

interface SearchInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  wrapperClassName?: string;
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  ({ className, wrapperClassName, ...props }, ref) => {
    return (
      <div className={cn("relative", wrapperClassName)}>
        <span className={inputIconLeftClass} aria-hidden="true">
          <Search size={18} />
        </span>
        <input
          ref={ref}
          type="search"
          className={inputFieldClasses({ hasLeading: true, className: cn("glass-panel", className) })}
          {...props}
        />
      </div>
    );
  }
);
SearchInput.displayName = "SearchInput";
