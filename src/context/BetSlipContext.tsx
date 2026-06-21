"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import type { BetSelection } from "@/lib/constants";

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
  const [stake, setStake] = useState(10);
  const [betType, setBetType] = useState<"single" | "multi">("single");
  const [bookingCode, setBookingCode] = useState("");
  const [savedBookingCode, setSavedBookingCode] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const totalOdds = selections.reduce((acc, s) => acc * s.odds, selections.length ? 1 : 0);
  const potentialWin = stake * totalOdds;

  const addSelection = useCallback((selection: BetSelection) => {
    setSelections((prev) => {
      const exists = prev.find((s) => s.matchId === selection.matchId && s.market === selection.market);
      if (exists) {
        return prev.map((s) =>
          s.matchId === selection.matchId && s.market === selection.market ? selection : s
        );
      }
      return [...prev, selection];
    });
    setIsOpen(true);
  }, []);

  const removeSelection = useCallback((id: string) => {
    setSelections((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const clearSelections = useCallback(() => {
    setSelections([]);
    setStake(10);
    setBookingCode("");
    setSavedBookingCode("");
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
    if (payload?.selections) setSelections(payload.selections);
    if (payload?.stake) setStake(payload.stake);
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
