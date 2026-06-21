"use client";

import { useState, useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import { ThemeProvider } from "@/context/ThemeContext";
import { AuthProvider } from "@/context/AuthContext";
import { BetSlipProvider } from "@/context/BetSlipContext";
import { SplashScreen } from "@/components/brand/SplashScreen";

export function Providers({ children }: { children: React.ReactNode }) {
  const [showSplash, setShowSplash] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Skip splash in dev — it blocks interaction and slows testing
    if (process.env.NODE_ENV === "development") {
      setShowSplash(false);
      return;
    }
    const seen = sessionStorage.getItem("bestbet-splash-seen");
    if (!seen) {
      setShowSplash(true);
      sessionStorage.setItem("bestbet-splash-seen", "1");
    }
  }, []);

  return (
    <ThemeProvider>
      <AuthProvider>
        <BetSlipProvider>
          {children}
          {mounted && (
            <AnimatePresence>
              {showSplash && <SplashScreen onComplete={() => setShowSplash(false)} />}
            </AnimatePresence>
          )}
        </BetSlipProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
