"use client";

import { Suspense } from "react";
import { DashboardContent } from "@/components/dashboard/DashboardContent";
import { MainLayout } from "@/components/layout/MainLayout";
import { Skeleton } from "@/components/ui/Skeleton";

function DashboardFallback() {
  return (
    <MainLayout>
      <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    </MainLayout>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardFallback />}>
      <DashboardContent />
    </Suspense>
  );
}
