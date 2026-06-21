import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { SportsSidebar } from "@/components/layout/SportsSidebar";
import { BetSlipPanel, FloatingBetSlipButton } from "@/components/layout/BetSlipPanel";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";

export function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--background)] overflow-x-hidden">
      <Header />
      <div className="flex flex-1 max-w-[1920px] mx-auto w-full min-w-0">
        <SportsSidebar className="hidden lg:block w-56 xl:w-64" />
        <main className="flex-1 overflow-x-hidden overflow-y-auto pb-[4.75rem] sm:pb-24 xl:pb-0 min-w-0" id="main-content">
          {children}
        </main>
        <BetSlipPanel />
      </div>
      <Footer />
      <BetSlipPanel floating />
      <FloatingBetSlipButton />
      <MobileBottomNav />
    </div>
  );
}
