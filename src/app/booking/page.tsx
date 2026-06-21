"use client";

import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useBetSlip } from "@/context/BetSlipContext";
import { betsApi } from "@/lib/api";
import { Ticket, Search } from "lucide-react";

export default function BookingPage() {
  const { loadFromCode, selections } = useBetSlip();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);

  const handleLoad = async () => {
    if (!code.trim()) return;
    setError("");
    try {
      const { payload } = await betsApi.loadBookingCode(code.trim());
      loadFromCode(code.trim(), payload as Parameters<typeof loadFromCode>[1]);
      setLoaded(true);
    } catch {
      setError("Booking code not found");
    }
  };

  return (
    <MainLayout>
      <div className="max-w-lg mx-auto p-4 md:p-6 space-y-6">
        <div className="text-center">
          <Ticket size={40} className="mx-auto text-bestbet-yellow mb-3" />
          <h1 className="text-2xl font-black">Load Booking Code</h1>
          <p className="text-sm text-bestbet-gray-muted mt-1">Enter a code to load a saved bet slip</p>
        </div>

        <div className="flex gap-2">
          <Input
            placeholder="BB-XXXXXX"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            className="flex-1"
          />
          <Button variant="primary" onClick={handleLoad}>
            <Search size={16} /> Load
          </Button>
        </div>

        {error && <p className="text-sm text-bestbet-danger text-center">{error}</p>}
        {loaded && (
          <div className="card-premium p-4 border-bestbet-yellow/20 text-center auth-glow">
            <p className="text-bestbet-success font-bold">Bet slip loaded!</p>
            <p className="text-sm text-bestbet-gray-muted mt-1">{selections.length} selection(s) added</p>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
