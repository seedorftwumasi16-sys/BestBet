import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { SportsSidebar } from "@/components/layout/SportsSidebar";
import { BetSlipPanel, FloatingBetSlipButton } from "@/components/layout/BetSlipPanel";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { MobileMainPadding } from "@/components/layout/MobileMainPadding";

export function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--background)] overflow-x-hidden">
      <Header />
      <div className="flex flex-1 max-w-[1920px] mx-auto w-full min-w-0">
        <SportsSidebar className="hidden lg:block w-56 xl:w-64" />
        <MobileMainPadding>{children}</MobileMainPadding>
        <BetSlipPanel />
      </div>
      <Footer />
      <BetSlipPanel floating />
      <FloatingBetSlipButton />
      <MobileBottomNav />
    </div>
  );
}
