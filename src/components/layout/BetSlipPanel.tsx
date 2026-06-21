"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Trash2, Copy, Share2, Ticket, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useBetSlip } from "@/context/BetSlipContext";
import { useAuth } from "@/context/AuthContext";
import { CURRENCY_SYMBOL, formatCurrency, formatOdds } from "@/lib/utils";
import { inputFieldClasses, inputIconLeftClass } from "@/lib/input-styles";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { betsApi } from "@/lib/api";

interface BetSlipPanelProps {
  className?: string;
  floating?: boolean;
}

export function BetSlipPanel({ className, floating = false }: BetSlipPanelProps) {
  const {
    selections,
    stake,
    betType,
    bookingCode,
    savedBookingCode,
    isOpen,
    removeSelection,
    clearSelections,
    setStake,
    setBetType,
    setIsOpen,
    generateCode,
    loadFromCode,
    totalOdds,
    potentialWin,
  } = useBetSlip();
  const { isLoggedIn, refreshUser } = useAuth();
  const [codeInput, setCodeInput] = useState("");
  const [showBooking, setShowBooking] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [placed, setPlaced] = useState(false);
  const [betError, setBetError] = useState("");

  const handlePlaceBet = async () => {
    if (!isLoggedIn) return;
    setPlaced(true);
    setBetError("");
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
      setTimeout(() => {
        setPlaced(false);
        clearSelections();
      }, 1500);
    } catch (err) {
      setBetError(err instanceof Error ? err.message : "Failed to place bet");
      setPlaced(false);
    }
  };

  const handleGenerateCode = async () => {
    if (!isLoggedIn || selections.length === 0) return;
    setGenerating(true);
    setBetError("");
    try {
      const record = await betsApi.saveBookingCode({
        selections,
        stake,
        betType,
      });
      loadFromCode(record.code, {
        selections,
        stake: record.stake,
        betType: record.betType,
      });
      navigator.clipboard.writeText(record.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      setBetError(err instanceof Error ? err.message : "Failed to generate booking code");
    } finally {
      setGenerating(false);
    }
  };

  const handleCopyCode = async () => {
    if (bookingCode) {
      navigator.clipboard.writeText(bookingCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleLoadCode = async () => {
    if (!codeInput.trim()) return;
    try {
      const { payload, code } = await betsApi.loadBookingCode(codeInput.trim());
      loadFromCode(code, {
        ...payload,
        selections: payload.selections as typeof selections,
      });
      setCodeInput("");
    } catch {
      loadFromCode(codeInput.trim());
      setCodeInput("");
    }
  };

  const quickStakes = [5, 10, 25, 50, 100];

  const content = (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
        <div className="flex items-center gap-2">
          <Ticket size={18} className="text-bestbet-yellow" />
          <h2 className="font-bold text-sm">Bet Slip</h2>
          {selections.length > 0 && (
            <span className="bg-bestbet-yellow text-bestbet-black text-xs font-bold px-1.5 py-0.5 rounded-full">
              {selections.length}
            </span>
          )}
        </div>
        {floating && (
          <button onClick={() => setIsOpen(false)} aria-label="Close bet slip">
            <X size={18} />
          </button>
        )}
      </div>

      <div className="flex border-b border-[var(--border)]">
        {(["single", "multi"] as const).map((type) => (
          <button
            key={type}
            onClick={() => setBetType(type)}
            className={cn(
              "flex-1 py-2.5 text-xs font-bold uppercase tracking-wide transition-colors",
              betType === type
                ? "text-bestbet-yellow border-b-2 border-bestbet-yellow"
                : "text-bestbet-gray-muted hover:text-[var(--foreground)]"
            )}
          >
            {type === "single" ? "Single" : "Multi / Acca"}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {selections.length === 0 ? (
          <div className="text-center py-8">
            <Ticket size={32} className="mx-auto text-bestbet-gray-muted mb-3 opacity-50" />
            <p className="text-sm text-bestbet-gray-muted">Your bet slip is empty</p>
            <p className="text-xs text-bestbet-gray-muted mt-1">Click on odds to add selections</p>
          </div>
        ) : (
          <AnimatePresence>
            {selections.map((sel) => (
              <motion.div
                key={sel.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="bg-[var(--card)] rounded-lg p-3 relative group"
              >
                <button
                  onClick={() => removeSelection(sel.id)}
                  className="absolute top-2 right-2 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-[var(--card-hover)] transition-all"
                  aria-label="Remove selection"
                >
                  <X size={14} />
                </button>
                <p className="text-xs text-bestbet-gray-muted">{sel.matchName}</p>
                <p className="text-sm font-semibold mt-0.5">{sel.selection}</p>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-xs text-bestbet-gray-muted">{sel.market}</span>
                  <span className="text-sm font-bold text-bestbet-yellow">{formatOdds(sel.odds)}</span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      {selections.length > 0 && (
        <div className="p-4 border-t border-[var(--border)] space-y-3">
          <div>
            <label className="text-xs font-medium text-bestbet-gray-muted mb-1.5 block">Stake</label>
            <div className="relative">
              <span className={cn(inputIconLeftClass, "w-auto text-sm font-bold tabular-nums")} aria-hidden="true">
                {CURRENCY_SYMBOL}
              </span>
              <input
                type="number"
                value={stake}
                onChange={(e) => setStake(Math.max(0, Number(e.target.value)))}
                className={inputFieldClasses({ hasLeading: true, className: "text-sm font-bold" })}
                min={1}
              />
            </div>
            <div className="flex gap-1.5 mt-2">
              {quickStakes.map((s) => (
                <button
                  key={s}
                  onClick={() => setStake(s)}
                  className={cn(
                    "flex-1 py-1.5 text-xs font-medium rounded-md transition-colors",
                    stake === s
                      ? "bg-bestbet-yellow text-bestbet-black"
                      : "bg-[var(--card)] hover:bg-[var(--card-hover)]"
                  )}
                >
                  {formatCurrency(s)}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-[var(--card)] rounded-lg p-3 space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-bestbet-gray-muted">Total Odds</span>
              <span className="font-bold">{formatOdds(totalOdds)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-bestbet-gray-muted">Potential Win</span>
              <span className="font-bold text-bestbet-yellow">{formatCurrency(potentialWin)}</span>
            </div>
          </div>

          {betError && (
            <p className="text-xs text-bestbet-danger text-center">{betError}</p>
          )}

          {isLoggedIn ? (
            <Button
              variant="primary"
              className="w-full"
              size="lg"
              onClick={handlePlaceBet}
              loading={placed}
            >
              {placed ? "Bet Placed!" : `Place Bet - ${formatCurrency(stake)}`}
            </Button>
          ) : (
            <Link href="/login">
              <Button variant="primary" className="w-full" size="lg">
                Log In to Place Bet
              </Button>
            </Link>
          )}

          <div className="flex gap-2">
            <Button variant="ghost" size="sm" className="flex-1" onClick={clearSelections}>
              <Trash2 size={14} /> Clear
            </Button>
            <Button variant="ghost" size="sm" className="flex-1" onClick={() => setShowBooking(!showBooking)}>
              <Ticket size={14} /> Booking
            </Button>
          </div>
        </div>
      )}

      <AnimatePresence>
        {showBooking && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-[var(--border)] overflow-hidden"
          >
            <div className="p-4 space-y-3">
              <p className="text-xs font-bold uppercase tracking-wide text-bestbet-gray-muted">Booking Code</p>

              {bookingCode ? (
                <div className="flex items-center gap-2 bg-[var(--card)] rounded-lg p-3">
                  <code className="flex-1 text-sm font-bold text-bestbet-yellow tracking-widest">{bookingCode}</code>
                  <button onClick={handleCopyCode} className="p-2 hover:bg-[var(--card-hover)] rounded-lg" aria-label="Copy code">
                    <Copy size={16} />
                  </button>
                  <button className="p-2 hover:bg-[var(--card-hover)] rounded-lg" aria-label="Share code">
                    <Share2 size={16} />
                  </button>
                </div>
              ) : (
                <Button variant="outline" size="sm" className="w-full" loading={generating} onClick={handleGenerateCode}>
                  Generate Booking Code
                </Button>
              )}

              {copied && <p className="text-xs text-bestbet-success text-center">Copied to clipboard!</p>}

              <div className="flex items-end gap-2">
                <Input
                  placeholder="Enter code (e.g. BB12345678)"
                  value={codeInput}
                  onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
                  icon={<Ticket size={16} />}
                  wrapperClassName="flex-1 min-w-0"
                  className="text-xs"
                />
                <Button variant="secondary" size="sm" onClick={handleLoadCode}>
                  Load
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  if (floating) {
    return (
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className={cn(
              "fixed bottom-16 left-0 right-0 z-40 bg-[var(--bet-slip-bg)] border-t border-bestbet-yellow/15 rounded-t-2xl shadow-2xl max-h-[70vh] overflow-hidden bet-slip-glow",
              className
            )}
          >
            {content}
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  return (
    <aside
      className={cn(
        "w-80 shrink-0 bg-[var(--bet-slip-bg)] bet-slip-glow sticky top-16 h-[calc(100vh-4rem)] overflow-hidden hidden xl:flex flex-col",
        className
      )}
      aria-label="Bet slip"
    >
      {content}
    </aside>
  );
}

export function FloatingBetSlipButton() {
  const { selections, isOpen, setIsOpen } = useBetSlip();

  if (selections.length === 0) return null;

  return (
    <button
      onClick={() => setIsOpen(!isOpen)}
      className="xl:hidden fixed bottom-20 right-4 z-30 bg-bestbet-yellow text-bestbet-black font-bold px-4 py-3 rounded-full shadow-lg shadow-bestbet-yellow/30 flex items-center gap-2 active:scale-95 transition-transform yellow-glow"
      aria-label={`Bet slip with ${selections.length} selections`}
    >
      <Ticket size={18} />
      <span>{selections.length}</span>
      <ChevronDown size={16} className={`transition-transform ${isOpen ? "rotate-180" : ""}`} />
    </button>
  );
}
