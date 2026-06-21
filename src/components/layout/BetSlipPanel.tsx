"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from "framer-motion";
import { X, Trash2, Copy, Share2, Ticket, ChevronDown, ChevronUp, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useBetSlip } from "@/context/BetSlipContext";
import { useAuth } from "@/context/AuthContext";
import { CURRENCY_SYMBOL, formatCurrency, formatOdds } from "@/lib/utils";
import { inputFieldClasses, inputIconLeftClass } from "@/lib/input-styles";
import { cn } from "@/lib/utils";
import { betsApi, ApiError } from "@/lib/api";

interface BetSlipPanelProps {
  className?: string;
  floating?: boolean;
}

function BetSlipHeader({ onClose, showMinimize }: { onClose?: () => void; showMinimize?: boolean }) {
  const { selections, setIsOpen } = useBetSlip();
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] shrink-0">
      <div className="flex items-center gap-2">
        <Ticket size={18} className="text-bestbet-yellow" />
        <h2 className="font-bold text-sm">Bet Slip</h2>
        {selections.length > 0 && (
          <span className="bg-bestbet-yellow text-bestbet-black text-xs font-bold px-1.5 py-0.5 rounded-full">
            {selections.length}
          </span>
        )}
      </div>
      {showMinimize && onClose && (
        <button
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-white/5 transition-colors"
          aria-label="Minimize bet slip"
        >
          <Minimize2 size={18} />
        </button>
      )}
    </div>
  );
}

function BetTypeTabs() {
  const { betType, setBetType } = useBetSlip();
  return (
    <div className="flex border-b border-[var(--border)] shrink-0">
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
  );
}

function SelectionList() {
  const { selections, removeSelection } = useBetSlip();
  if (selections.length === 0) {
    return (
      <div className="text-center py-8 px-4">
        <Ticket size={32} className="mx-auto text-bestbet-gray-muted mb-3 opacity-50" />
        <p className="text-sm text-bestbet-gray-muted">Your bet slip is empty</p>
        <p className="text-xs text-bestbet-gray-muted mt-1">Tap odds on a match to add selections</p>
      </div>
    );
  }
  return (
    <div className="p-4 space-y-3">
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
              className="absolute top-2 right-2 p-1 rounded opacity-70 hover:opacity-100 hover:bg-[var(--card-hover)] transition-all"
              aria-label="Remove selection"
            >
              <X size={14} />
            </button>
            <p className="text-xs text-bestbet-gray-muted pr-6 truncate">{sel.matchName}</p>
            <p className="text-sm font-semibold mt-0.5">{sel.selection}</p>
            <div className="flex justify-between items-center mt-1">
              <span className="text-xs text-bestbet-gray-muted">{sel.market}</span>
              <span className="text-sm font-bold text-bestbet-yellow tabular-nums">{formatOdds(sel.odds)}</span>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

function BetSlipFooter({
  betError,
  placing,
  placed,
  onPlaceBet,
  showBooking,
  setShowBooking,
  onGenerateCode,
  generating,
  copied,
  onCopyCode,
  codeInput,
  setCodeInput,
  onLoadCode,
  bookingCode,
}: {
  betError: string;
  placing: boolean;
  placed: boolean;
  onPlaceBet: () => void;
  showBooking: boolean;
  setShowBooking: (v: boolean) => void;
  onGenerateCode: () => void;
  generating: boolean;
  copied: boolean;
  onCopyCode: () => void;
  codeInput: string;
  setCodeInput: (v: string) => void;
  onLoadCode: () => void;
  bookingCode: string;
}) {
  const { selections, stake, setStake, totalOdds, potentialWin, clearSelections, betType } = useBetSlip();
  const { isLoggedIn } = useAuth();
  const router = useRouter();
  const quickStakes = [5, 10, 25, 50, 100];

  if (selections.length === 0) return null;

  const validationError =
    betType === "single" && selections.length !== 1
      ? "Single bets require exactly one selection"
      : betType === "multi" && selections.length < 2
        ? "Multi bets require at least two selections"
        : "";

  return (
    <div className="shrink-0 border-t border-[var(--border)] bg-[var(--bet-slip-bg)]">
      <div className="p-4 space-y-3 max-h-[40vh] overflow-y-auto">
        <div>
          <label className="text-xs font-medium text-bestbet-gray-muted mb-1.5 block">Stake</label>
          <div className="relative">
            <span className={cn(inputIconLeftClass, "w-auto text-sm font-bold tabular-nums")} aria-hidden="true">
              {CURRENCY_SYMBOL}
            </span>
            <input
              type="number"
              value={stake}
              onChange={(e) => setStake(Math.max(1, Number(e.target.value)))}
              className={inputFieldClasses({ hasLeading: true, className: "text-sm font-bold" })}
              min={1}
            />
          </div>
          <div className="flex gap-1.5 mt-2 flex-wrap">
            {quickStakes.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStake(s)}
                className={cn(
                  "flex-1 min-w-[3rem] py-1.5 text-xs font-medium rounded-md transition-colors",
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
            <span className="font-bold tabular-nums">{formatOdds(totalOdds)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-bestbet-gray-muted">Potential Win</span>
            <span className="font-bold text-bestbet-yellow tabular-nums">{formatCurrency(potentialWin)}</span>
          </div>
        </div>

        {(betError || validationError) && (
          <p className="text-xs text-bestbet-danger text-center">{betError || validationError}</p>
        )}

        <div className="flex gap-2">
          <Button variant="ghost" size="sm" className="flex-1" onClick={clearSelections}>
            <Trash2 size={14} /> Clear
          </Button>
          <Button variant="ghost" size="sm" className="flex-1" onClick={() => setShowBooking(!showBooking)}>
            <Ticket size={14} /> Booking
          </Button>
        </div>

        {showBooking && (
          <div className="space-y-3 pt-1">
            {bookingCode ? (
              <div className="flex items-center gap-2 bg-[var(--card)] rounded-lg p-3">
                <code className="flex-1 text-sm font-bold text-bestbet-yellow tracking-widest truncate">{bookingCode}</code>
                <button type="button" onClick={onCopyCode} className="p-2 hover:bg-[var(--card-hover)] rounded-lg" aria-label="Copy code">
                  <Copy size={16} />
                </button>
                <button type="button" className="p-2 hover:bg-[var(--card-hover)] rounded-lg" aria-label="Share code">
                  <Share2 size={16} />
                </button>
              </div>
            ) : (
              <Button variant="outline" size="sm" className="w-full" loading={generating} onClick={onGenerateCode}>
                Generate Booking Code
              </Button>
            )}
            {copied && <p className="text-xs text-bestbet-success text-center">Copied to clipboard!</p>}
            <div className="flex items-end gap-2">
              <Input
                placeholder="Enter code"
                value={codeInput}
                onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
                icon={<Ticket size={16} />}
                wrapperClassName="flex-1 min-w-0"
                className="text-xs"
              />
              <Button variant="secondary" size="sm" onClick={onLoadCode}>
                Load
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 pt-0 border-t border-[var(--border)]/50">
        {isLoggedIn ? (
          <Button
            variant="primary"
            className="w-full"
            size="lg"
            onClick={onPlaceBet}
            loading={placing}
            disabled={Boolean(validationError) || placing}
          >
            {placed ? "Bet Placed!" : `Place Bet - ${formatCurrency(stake)}`}
          </Button>
        ) : (
          <Button
            variant="primary"
            className="w-full"
            size="lg"
            onClick={() => router.push("/login")}
          >
            Log In to Place Bet
          </Button>
        )}
      </div>
    </div>
  );
}

function MobileCollapsedBar() {
  const { selections, isOpen, setIsOpen, totalOdds } = useBetSlip();
  if (selections.length === 0 || isOpen) return null;

  return (
    <motion.button
      type="button"
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 80, opacity: 0 }}
      onClick={() => setIsOpen(true)}
      className="xl:hidden fixed bottom-[4.25rem] sm:bottom-[4.5rem] left-3 right-3 z-30 flex items-center justify-between gap-3 rounded-2xl border border-bestbet-yellow/25 bg-[var(--bet-slip-bg)] px-4 py-3 shadow-xl shadow-black/30 bet-slip-glow min-h-[52px]"
      aria-label={`Open bet slip with ${selections.length} selections`}
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-bestbet-yellow text-bestbet-black">
          <Ticket size={18} />
        </span>
        <div className="text-left min-w-0">
          <p className="text-xs font-bold text-[var(--foreground)]">
            Bet Slip · {selections.length} {selections.length === 1 ? "pick" : "picks"}
          </p>
          <p className="text-[11px] text-bestbet-gray-muted tabular-nums">Total odds {formatOdds(totalOdds)}</p>
        </div>
      </div>
      <ChevronUp size={20} className="text-bestbet-yellow shrink-0" />
    </motion.button>
  );
}

function MobileBetSlipDrawer() {
  const { isOpen, setIsOpen } = useBetSlip();
  const [betError, setBetError] = useState("");
  const [placing, setPlacing] = useState(false);
  const [placed, setPlaced] = useState(false);
  const [showBooking, setShowBooking] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [codeInput, setCodeInput] = useState("");
  const router = useRouter();
  const dragY = useMotionValue(0);
  const backdropOpacity = useTransform(dragY, [0, 200], [1, 0.3]);

  const {
    selections,
    stake,
    betType,
    bookingCode,
    savedBookingCode,
    clearSelections,
    loadFromCode,
  } = useBetSlip();
  const { isLoggedIn, refreshUser: refreshAuthUser } = useAuth();

  const closeDrawer = useCallback(() => setIsOpen(false), [setIsOpen]);

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > 80 || info.velocity.y > 400) closeDrawer();
  };

  const handlePlaceBet = async () => {
    if (!isLoggedIn) {
      router.push("/login");
      return;
    }
    if (betType === "single" && selections.length !== 1) return;
    if (betType === "multi" && selections.length < 2) return;

    setPlacing(true);
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
      await refreshAuthUser();
      setPlaced(true);
      setTimeout(() => {
        setPlaced(false);
        clearSelections();
        closeDrawer();
      }, 1500);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        router.push("/login");
        return;
      }
      setBetError(err instanceof Error ? err.message : "Failed to place bet");
    } finally {
      setPlacing(false);
    }
  };

  const handleGenerateCode = async () => {
    if (!isLoggedIn || selections.length === 0) return;
    setGenerating(true);
    setBetError("");
    try {
      const record = await betsApi.saveBookingCode({ selections, stake, betType });
      loadFromCode(record.code, { selections, stake: record.stake, betType: record.betType });
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
      loadFromCode(code, { ...payload, selections: payload.selections as typeof selections });
      setCodeInput("");
    } catch {
      loadFromCode(codeInput.trim());
      setCodeInput("");
    }
  };

  return (
    <AnimatePresence>
      {isOpen && selections.length > 0 && (
        <>
          <motion.button
            type="button"
            aria-label="Close bet slip"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ opacity: backdropOpacity }}
            onClick={closeDrawer}
            className="xl:hidden fixed inset-0 z-40 bg-black/45 backdrop-blur-[1px]"
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.35 }}
            onDragEnd={handleDragEnd}
            style={{ y: dragY }}
            className="xl:hidden fixed bottom-0 left-0 right-0 z-50 flex max-h-[70dvh] flex-col rounded-t-2xl border-t border-bestbet-yellow/15 bg-[var(--bet-slip-bg)] shadow-2xl bet-slip-glow"
          >
            <div className="flex justify-center pt-2 pb-1 shrink-0 cursor-grab active:cursor-grabbing">
              <div className="h-1 w-10 rounded-full bg-white/20" aria-hidden="true" />
            </div>
            <BetSlipHeader onClose={closeDrawer} showMinimize />
            <BetTypeTabs />
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
              <SelectionList />
            </div>
            <BetSlipFooter
              betError={betError}
              placing={placing}
              placed={placed}
              onPlaceBet={handlePlaceBet}
              showBooking={showBooking}
              setShowBooking={setShowBooking}
              onGenerateCode={handleGenerateCode}
              generating={generating}
              copied={copied}
              onCopyCode={handleCopyCode}
              codeInput={codeInput}
              setCodeInput={setCodeInput}
              onLoadCode={handleLoadCode}
              bookingCode={bookingCode}
            />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export function BetSlipPanel({ className, floating = false }: BetSlipPanelProps) {
  if (floating) {
    return (
      <>
        <MobileCollapsedBar />
        <MobileBetSlipDrawer />
      </>
    );
  }

  const [betError, setBetError] = useState("");
  const [placing, setPlacing] = useState(false);
  const [placed, setPlaced] = useState(false);
  const [showBooking, setShowBooking] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [codeInput, setCodeInput] = useState("");
  const router = useRouter();
  const {
    selections,
    stake,
    betType,
    bookingCode,
    savedBookingCode,
    clearSelections,
    loadFromCode,
  } = useBetSlip();
  const { isLoggedIn, refreshUser } = useAuth();

  const handlePlaceBet = async () => {
    if (!isLoggedIn) {
      router.push("/login");
      return;
    }
    if (betType === "single" && selections.length !== 1) return;
    if (betType === "multi" && selections.length < 2) return;

    setPlacing(true);
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
      setPlaced(true);
      setTimeout(() => {
        setPlaced(false);
        clearSelections();
      }, 1500);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        router.push("/login");
        return;
      }
      setBetError(err instanceof Error ? err.message : "Failed to place bet");
    } finally {
      setPlacing(false);
    }
  };

  const handleGenerateCode = async () => {
    if (!isLoggedIn || selections.length === 0) return;
    setGenerating(true);
    try {
      const record = await betsApi.saveBookingCode({ selections, stake, betType });
      loadFromCode(record.code, { selections, stake: record.stake, betType: record.betType });
      navigator.clipboard.writeText(record.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      setBetError(err instanceof Error ? err.message : "Failed to generate booking code");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <aside
      className={cn(
        "w-80 shrink-0 bg-[var(--bet-slip-bg)] bet-slip-glow sticky top-16 h-[calc(100vh-4rem)] overflow-hidden hidden xl:flex flex-col",
        className
      )}
      aria-label="Bet slip"
    >
      <BetSlipHeader />
      <BetTypeTabs />
      <div className="flex-1 min-h-0 overflow-y-auto">
        <SelectionList />
      </div>
      <BetSlipFooter
        betError={betError}
        placing={placing}
        placed={placed}
        onPlaceBet={handlePlaceBet}
        showBooking={showBooking}
        setShowBooking={setShowBooking}
        onGenerateCode={handleGenerateCode}
        generating={generating}
        copied={copied}
        onCopyCode={async () => {
          if (bookingCode) {
            navigator.clipboard.writeText(bookingCode);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }
        }}
        codeInput={codeInput}
        setCodeInput={setCodeInput}
        onLoadCode={async () => {
          if (!codeInput.trim()) return;
          try {
            const { payload, code } = await betsApi.loadBookingCode(codeInput.trim());
            loadFromCode(code, { ...payload, selections: payload.selections as typeof selections });
            setCodeInput("");
          } catch {
            loadFromCode(codeInput.trim());
            setCodeInput("");
          }
        }}
        bookingCode={bookingCode}
      />
    </aside>
  );
}

export function FloatingBetSlipButton() {
  return null;
}
