"use client";

import { createContext, useContext, useState, useCallback, useMemo } from "react";
import type { BetSelection } from "@/lib/constants";
import { calculatePotentialWin, calculateTotalOdds, sanitizeOdds } from "@/lib/odds-utils";

interface BetSlipContextType {
  selections: BetSelection[];
  stake: number;
  betType: "single" | "multi";
  bookingCode: string;
  savedBookingCode: string;
  isOpen: boolean;
  addSelection: (selection: BetSelection) => void;
  removeSelection: (id: string) => void;
  clearSelections: () => void;
  setStake: (stake: number) => void;
  setBetType: (type: "single" | "multi") => void;
  setIsOpen: (open: boolean) => void;
  generateCode: () => string;
  loadFromCode: (code: string, payload?: { selections?: BetSelection[]; stake?: number; betType?: "single" | "multi" }) => void;
  clearSavedBookingCode: () => void;
  totalOdds: number;
  potentialWin: number;
}

const BetSlipContext = createContext<BetSlipContextType | undefined>(undefined);

export function BetSlipProvider({ children }: { children: React.ReactNode }) {
  const [selections, setSelections] = useState<BetSelection[]>([]);
  const [stake, setStakeState] = useState(10);
  const [betType, setBetType] = useState<"single" | "multi">("single");
  const [bookingCode, setBookingCode] = useState("");
  const [savedBookingCode, setSavedBookingCode] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const totalOdds = useMemo(() => calculateTotalOdds(selections), [selections]);
  const potentialWin = useMemo(() => calculatePotentialWin(stake, totalOdds), [stake, totalOdds]);

  const addSelection = useCallback((selection: BetSelection) => {
    const sanitized: BetSelection = {
      ...selection,
      odds: sanitizeOdds(selection.odds),
    };
    setSelections((prev) => {
      const exists = prev.find((s) => s.matchId === sanitized.matchId && s.market === sanitized.market);
      if (exists) {
        return prev.map((s) =>
          s.matchId === sanitized.matchId && s.market === sanitized.market ? sanitized : s
        );
      }
      return [...prev, sanitized];
    });
  }, []);

  const removeSelection = useCallback((id: string) => {
    setSelections((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const clearSelections = useCallback(() => {
    setSelections([]);
    setStakeState(10);
    setBookingCode("");
    setSavedBookingCode("");
    setIsOpen(false);
  }, []);

  const setStake = useCallback((value: number) => {
    setStakeState(Math.max(1, Number(value) || 0));
  }, []);

  const clearSavedBookingCode = useCallback(() => {
    setSavedBookingCode("");
  }, []);

  const generateCode = useCallback(() => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "BB-";
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setBookingCode(code);
    return code;
  }, []);

  const loadFromCode = useCallback((code: string, payload?: { selections?: BetSelection[]; stake?: number; betType?: "single" | "multi" }) => {
    setBookingCode(code);
    setSavedBookingCode(code);
    if (payload?.selections) {
      setSelections(payload.selections.map((s) => ({ ...s, odds: sanitizeOdds(s.odds) })));
    }
    if (payload?.stake) setStakeState(Math.max(1, payload.stake));
    if (payload?.betType) setBetType(payload.betType);
    setIsOpen(true);
  }, []);

  return (
    <BetSlipContext.Provider
      value={{
        selections,
        stake,
        betType,
        bookingCode,
        savedBookingCode,
        isOpen,
        addSelection,
        removeSelection,
        clearSelections,
        setStake,
        setBetType,
        setIsOpen,
        generateCode,
        loadFromCode,
        clearSavedBookingCode,
        totalOdds,
        potentialWin,
      }}
    >
      {children}
    </BetSlipContext.Provider>
  );
}

export function useBetSlip() {
  const context = useContext(BetSlipContext);
  if (!context) throw new Error("useBetSlip must be used within BetSlipProvider");
  return context;
}
