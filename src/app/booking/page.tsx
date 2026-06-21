"use client";

import { useState } from "react";
import Link from "next/link";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useBetSlip } from "@/context/BetSlipContext";
import { useAuth } from "@/context/AuthContext";
import { betsApi } from "@/lib/api";
import type { BetSelection } from "@/lib/constants";
import { formatCurrency, formatOdds } from "@/lib/utils";
import { Ticket, Search, ChevronRight } from "lucide-react";
import { useToast } from "@/context/ToastContext";

export default function BookingPage() {
  const toast = useToast();
  const { isLoggedIn, refreshUser } = useAuth();
  const { loadFromCode, selections, stake, betType, totalOdds, potentialWin, savedBookingCode, setIsOpen } = useBetSlip();
  const [code, setCode] = useState("");
  const [loadedMeta, setLoadedMeta] = useState<{ expiresAt?: string; status?: string } | null>(null);
  const [placing, setPlacing] = useState(false);

  const handleLoad = async () => {
    if (!code.trim()) return;
    try {
      const result = await betsApi.loadBookingCode(code.trim());
      loadFromCode(result.code, {
        ...result.payload,
        selections: result.payload.selections as BetSelection[],
      });
      setLoadedMeta({ expiresAt: result.expiresAt, status: result.status });
      toast.success(`Loaded ${result.payload.selections.length} selection(s)`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Booking code not found");
    }
  };

  const handlePlace = async () => {
    if (!isLoggedIn || selections.length === 0) return;
    setPlacing(true);
    try {
      await betsApi.place({
        type: betType,
        stake,
        selections: selections.map((s) => ({
          matchId: s.matchId,
          market: s.market,
          selection: s.selection,
          odds: s.odds,
        })),
        savedBookingCode: savedBookingCode || undefined,
      });
      await refreshUser();
      toast.success("Bet placed successfully!");
      setIsOpen(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to place bet");
    } finally {
      setPlacing(false);
    }
  };

  return (
    <MainLayout>
      <div className="max-w-lg mx-auto p-4 md:p-6 space-y-6 pb-28">
        <div className="text-center">
          <Ticket size={40} className="mx-auto text-bestbet-yellow mb-3" />
          <h1 className="text-2xl font-black">Booking Code</h1>
          <p className="text-sm text-bestbet-gray-muted mt-1">Load a saved bet slip and place your bet</p>
        </div>

        <div className="card-premium p-4 space-y-3">
          <Input
            label="Enter Booking Code"
            placeholder="BB12345678"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
          />
          <Button variant="primary" className="w-full" onClick={handleLoad}>
            <Search size={16} className="mr-1" /> Load Bet Slip
          </Button>
        </div>

        {selections.length > 0 && (
          <div className="card-premium p-4 space-y-4 border border-bestbet-yellow/20">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-bestbet-yellow">Loaded Slip</h2>
              {loadedMeta?.expiresAt && (
                <span className="text-[10px] text-bestbet-gray-muted">
                  Expires {new Date(loadedMeta.expiresAt).toLocaleDateString()}
                </span>
              )}
            </div>

            <div className="space-y-2">
              {selections.map((sel) => (
                <div key={sel.id} className="rounded-lg bg-white/[0.03] border border-white/5 p-3">
                  <p className="text-xs text-bestbet-gray-muted">{sel.matchName}</p>
                  <p className="text-sm font-semibold">{sel.selection}</p>
                  <div className="flex justify-between text-xs mt-1">
                    <span className="text-bestbet-gray-muted">{sel.market}</span>
                    <span className="font-bold text-bestbet-yellow">{formatOdds(sel.odds)}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-lg bg-black/30 p-3 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-bestbet-gray-muted">Type</span>
                <span className="capitalize font-medium">{betType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-bestbet-gray-muted">Stake</span>
                <span className="font-bold">{formatCurrency(stake)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-bestbet-gray-muted">Total Odds</span>
                <span className="font-bold">{formatOdds(totalOdds)}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-white/5">
                <span className="text-bestbet-gray-muted">Potential Win</span>
                <span className="font-bold text-bestbet-yellow">{formatCurrency(potentialWin)}</span>
              </div>
            </div>

            {isLoggedIn ? (
              <Button variant="primary" className="w-full" size="lg" loading={placing} onClick={handlePlace}>
                Place Bet — {formatCurrency(stake)}
              </Button>
            ) : (
              <Link href="/login">
                <Button variant="primary" className="w-full" size="lg">
                  Log In to Place Bet <ChevronRight size={16} />
                </Button>
              </Link>
            )}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
