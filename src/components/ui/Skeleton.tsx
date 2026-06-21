"use client";

import { motion } from "framer-motion";

interface SkeletonProps {
  className?: string;
  variant?: "text" | "rect" | "circle";
}

export function Skeleton({ className = "", variant = "rect" }: SkeletonProps) {
  const baseClass = "skeleton rounded";
  const variantClass =
    variant === "circle" ? "rounded-full" : variant === "text" ? "h-4 rounded" : "rounded-lg";

  return <div className={`${baseClass} ${variantClass} ${className}`} aria-hidden="true" />;
}

export function MatchCardSkeleton() {
  return (
    <div className="bg-[var(--card)] rounded-xl p-4 space-y-3">
      <div className="flex justify-between">
        <Skeleton className="h-3 w-24" variant="text" />
        <Skeleton className="h-3 w-12" variant="text" />
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Skeleton className="w-8 h-8" variant="circle" />
          <Skeleton className="h-4 w-28" variant="text" />
        </div>
        <Skeleton className="h-4 w-8" variant="text" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-28" variant="text" />
          <Skeleton className="w-8 h-8" variant="circle" />
        </div>
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-10 flex-1" />
        <Skeleton className="h-10 flex-1" />
        <Skeleton className="h-10 flex-1" />
      </div>
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="space-y-6 p-4">
      <Skeleton className="h-48 w-full rounded-2xl" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <MatchCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

export function FadeIn({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function StaggerContainer({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: 0.08 } },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 16 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
