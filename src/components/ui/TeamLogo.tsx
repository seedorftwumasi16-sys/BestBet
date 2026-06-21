"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { getTeamInitials, getTeamLogoUrl } from "@/lib/sports-assets";

interface TeamLogoProps {
  name: string;
  shortName?: string;
  logo?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizes = { sm: 28, md: 36, lg: 44 };

export function TeamLogo({ name, shortName, logo, size = "md", className }: TeamLogoProps) {
  const px = sizes[size];
  const remote = getTeamLogoUrl(name, shortName);
  const src = remote || (logo?.startsWith("http") || logo?.startsWith("/") ? logo : null);
  const [failed, setFailed] = useState(false);
  const initials = getTeamInitials(name, shortName);

  if (src && !failed) {
    return (
      <div
        className={cn("relative shrink-0 rounded-full bg-white/5 ring-1 ring-white/10 overflow-hidden", className)}
        style={{ width: px, height: px }}
      >
        <Image
          src={src}
          alt={name}
          fill
          unoptimized
          className="object-contain p-1"
          onError={() => setFailed(true)}
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "shrink-0 rounded-full flex items-center justify-center font-bold text-bestbet-black",
        "bg-gradient-to-br from-bestbet-yellow to-bestbet-yellow-secondary ring-1 ring-bestbet-yellow/30",
        size === "sm" && "text-[9px]",
        size === "md" && "text-[10px]",
        size === "lg" && "text-xs",
        className
      )}
      style={{ width: px, height: px }}
      aria-hidden
    >
      {initials}
    </div>
  );
}
