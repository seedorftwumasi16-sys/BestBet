"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { BRAND } from "@/lib/constants";

interface LogoProps {
  variant?: "horizontal" | "stacked" | "icon";
  className?: string;
  showSlogan?: boolean;
}

function ShieldIcon({ size = 36, className }: { size?: number; className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 48 48"
      width={size}
      height={size}
      className={cn("gold-glow shrink-0 drop-shadow-[0_0_12px_rgba(255,215,0,0.5)]", className)}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="bbShieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFE566" />
          <stop offset="50%" stopColor="#FFD700" />
          <stop offset="100%" stopColor="#FFC107" />
        </linearGradient>
      </defs>
      <path
        d="M24 2L6 10v12c0 11.5 7.7 22.3 18 26 10.3-3.7 18-14.5 18-26V10L24 2z"
        fill="url(#bbShieldGrad)"
      />
      <text
        x="24"
        y="31"
        textAnchor="middle"
        fontFamily="Inter, Arial, sans-serif"
        fontWeight="900"
        fontSize="20"
        fill="#000000"
      >
        B
      </text>
    </svg>
  );
}

export function Logo({ variant = "horizontal", className, showSlogan = false }: LogoProps) {
  if (variant === "icon") {
    return (
      <Link href="/" className={cn("flex items-center", className)} aria-label={BRAND.name}>
        <ShieldIcon size={36} />
      </Link>
    );
  }

  if (variant === "stacked") {
    return (
      <Link href="/" className={cn("flex flex-col items-center gap-2", className)} aria-label={BRAND.name}>
        <ShieldIcon size={56} />
        <div className="text-center">
          <p className="font-black text-xl tracking-wider">
            <span className="text-white">BEST</span>
            <span className="text-bestbet-yellow">BET</span>
          </p>
          {showSlogan && (
            <p className="text-sm text-bestbet-gray-muted font-medium tracking-wide mt-1">{BRAND.slogan}</p>
          )}
        </div>
      </Link>
    );
  }

  return (
    <Link href="/" className={cn("flex items-center gap-2 sm:gap-2.5", className)} aria-label={BRAND.name}>
      <ShieldIcon size={26} className="sm:hidden" />
      <ShieldIcon size={30} className="hidden sm:block md:hidden" />
      <ShieldIcon size={34} className="hidden md:block" />
      <div className="hidden md:flex flex-col">
        <span className="font-black text-base lg:text-lg tracking-wider leading-none">
          <span className="text-white">BEST</span>
          <span className="text-bestbet-yellow">BET</span>
        </span>
        {showSlogan && (
          <span className="text-[10px] text-bestbet-gray-muted font-medium tracking-wide mt-0.5">
            {BRAND.slogan}
          </span>
        )}
      </div>
      <span className="md:hidden font-black text-base tracking-wide leading-none">
        <span className="text-white">BEST</span>
        <span className="text-bestbet-yellow">BET</span>
      </span>
    </Link>
  );
}
