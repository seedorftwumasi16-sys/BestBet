"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, useMotionValue, PanInfo } from "framer-motion";
import { X, Trash2, Copy, Share2, Ticket, ChevronUp, Minimize2, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useBetSlip } from "@/context/BetSlipContext";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { CURRENCY_SYMBOL, formatCurrency, formatOdds } from "@/lib/utils";
import { inputFieldClasses, inputIconLeftClass } from "@/lib/input-styles";
import { cn } from "@/lib/utils";
import { betsApi, ApiError } from "@/lib/api";

interface BetSlipPanelProps {
  className?: string;
  floating?: boolean;
}

function useBetSlipActions() {
  const router = useRouter();
  const toast = useToast();
  const [betError, setBetError] = useState("");
  const [placing, setPlacing] = useState(false);
  const [placed, setPlaced] = useState(false);
  const [showBooking, setShowBooking] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [codeInput, setCodeInput] = useState("");

  const {
    selections,
    stake,
    betType,
    bookingCode,
    savedBookingCode,
    clearSelections,
    loadFromCode,
    setIsOpen,
  } = useBetSlip();
  const { isLoggedIn, refreshUser: refreshAuthUser } = useAuth();

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
      const result = await betsApi.place({
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
      toast.success(`Bet placed! Code: ${result.bookingCode}`);
      clearSelections();
      setIsOpen(false);
      router.push("/dashboard?tab=active-bets");
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        router.push("/login");
        return;
      }
      const message = err instanceof Error ? err.message : "Failed to place bet";
      setBetError(message);
      toast.error(message);
    } finally {
      setPlacing(false);
      setTimeout(() => setPlaced(false), 1500);
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
      toast.success("Booking code copied");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to generate booking code";
      setBetError(message);
      toast.error(message);
    } finally {
      setGenerating(false);
    }
  };

  const handleCopyCode = async () => {
    if (bookingCode) {
      navigator.clipboard.writeText(bookingCode);
      setCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleLoadCode = async () => {
    if (!codeInput.trim()) return;
    try {
      const { payload, code } = await betsApi.loadBookingCode(codeInput.trim());
      loadFromCode(code, { ...payload, selections: payload.selections as typeof selections });
      setCodeInput("");
      toast.success("Booking code loaded");
    } catch {
      loadFromCode(codeInput.trim());
      setCodeInput("");
    }
  };

  return {
    betError,
    placing,
    placed,
    showBooking,
    setShowBooking,
    generating,
    copied,
    codeInput,
    setCodeInput,
    handlePlaceBet,
    handleGenerateCode,
    handleCopyCode,
    handleLoadCode,
    bookingCode,
  };
}

function BetSlipHeader({
  onMinimize,
  onMaximize,
}: {
  onMinimize?: () => void;
  onMaximize?: () => void;
}) {
  const { selections } = useBetSlip();
  return (
    <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border)] shrink-0">
      <div className="flex items-center gap-2 min-w-0">
        <Ticket size={18} className="text-bestbet-yellow shrink-0" />
        <h2 className="font-bold text-sm truncate">Bet Slip</h2>
        {selections.length > 0 && (
          <span className="bg-bestbet-yellow text-bestbet-black text-xs font-bold px-1.5 py-0.5 rounded-full shrink-0">
            {selections.length}
          </span>
        )}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {onMaximize && (
          <button
            type="button"
            onClick={onMaximize}
            className="p-2 rounded-lg hover:bg-white/5 transition-colors"
            aria-label="Maximize bet slip"
          >
            <Maximize2 size={16} />
          </button>
        )}
        {onMinimize && (
          <button
            type="button"
            onClick={onMinimize}
            className="p-2 rounded-lg hover:bg-white/5 transition-colors"
            aria-label="Minimize bet slip"
          >
            <Minimize2 size={16} />
          </button>
        )}
      </div>
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
          type="button"
          onClick={() => setBetType(type)}
          className={cn(
            "flex-1 py-2 text-xs font-bold uppercase tracking-wide transition-colors",
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
    <div className="p-3 space-y-2">
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
              type="button"
              onClick={() => removeSelection(sel.id)}
              className="absolute top-2 right-2 p-1 rounded opacity-70 hover:opacity-100 hover:bg-[var(--card-hover)] transition-all"
              aria-label="Remove selection"
            >
              <X size={14} />
            </button>
            <p className="text-xs text-bestbet-gray-muted pr-6 truncate">{sel.matchName}</p>
            <p className="text-sm font-semibold mt-0.5 truncate">{sel.selection}</p>
            <div className="flex justify-between items-center mt-1 gap-2">
              <span className="text-xs text-bestbet-gray-muted truncate">{sel.market}</span>
              <span className="text-sm font-bold text-bestbet-yellow tabular-nums shrink-0">{formatOdds(sel.odds)}</span>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

function BetSlipFormFields({
  betError,
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
  const quickStakes = [5, 10, 25, 50, 100];

  if (selections.length === 0) return null;

  const validationError =
    betType === "single" && selections.length !== 1
      ? "Single bets require exactly one selection"
      : betType === "multi" && selections.length < 2
        ? "Multi bets require at least two selections"
        : "";

  return (
    <div className="p-3 space-y-3 border-t border-[var(--border)]">
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
                "flex-1 min-w-[2.75rem] py-1.5 text-xs font-medium rounded-md transition-colors",
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
        <div className="flex justify-between text-xs gap-2">
          <span className="text-bestbet-gray-muted">Total Odds</span>
          <span className="font-bold tabular-nums">{formatOdds(totalOdds)}</span>
        </div>
        <div className="flex justify-between text-sm gap-2">
          <span className="text-bestbet-gray-muted">Potential Win</span>
          <span className="font-bold text-bestbet-yellow tabular-nums">{formatCurrency(potentialWin)}</span>
        </div>
      </div>

      {(betError || validationError) && (
        <p className="text-xs text-bestbet-danger text-center">{betError || validationError}</p>
      )}

      <div className="flex gap-2">
        <Button variant="ghost" size="sm" className="flex-1 min-w-0" onClick={clearSelections}>
          <Trash2 size={14} /> Clear
        </Button>
        <Button variant="ghost" size="sm" className="flex-1 min-w-0" onClick={() => setShowBooking(!showBooking)}>
          <Ticket size={14} /> Booking
        </Button>
      </div>

      {showBooking && (
        <div className="space-y-3 pt-1">
          {bookingCode ? (
            <div className="flex items-center gap-2 bg-[var(--card)] rounded-lg p-3 min-w-0">
              <code className="flex-1 text-sm font-bold text-bestbet-yellow tracking-widest truncate">{bookingCode}</code>
              <button type="button" onClick={onCopyCode} className="p-2 hover:bg-[var(--card-hover)] rounded-lg shrink-0" aria-label="Copy code">
                <Copy size={16} />
              </button>
              <button type="button" className="p-2 hover:bg-[var(--card-hover)] rounded-lg shrink-0" aria-label="Share code">
                <Share2 size={16} />
              </button>
            </div>
          ) : (
            <Button variant="outline" size="sm" className="w-full" loading={generating} onClick={onGenerateCode}>
              Generate Booking Code
            </Button>
          )}
          {copied && <p className="text-xs text-bestbet-success text-center">Copied to clipboard!</p>}
          <div className="flex items-end gap-2 min-w-0">
            <Input
              placeholder="Enter code"
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
              icon={<Ticket size={16} />}
              wrapperClassName="flex-1 min-w-0"
              className="text-xs"
            />
            <Button variant="secondary" size="sm" className="shrink-0" onClick={onLoadCode}>
              Load
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function BetSlipPlaceButton({
  placing,
  placed,
  onPlaceBet,
}: {
  placing: boolean;
  placed: boolean;
  onPlaceBet: () => void;
}) {
  const { selections, stake, betType } = useBetSlip();
  const { isLoggedIn } = useAuth();
  const router = useRouter();

  if (selections.length === 0) return null;

  const validationError =
    betType === "single" && selections.length !== 1
      ? true
      : betType === "multi" && selections.length < 2;

  return (
    <div className="shrink-0 border-t border-[var(--border)] bg-[var(--bet-slip-bg)] p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      {isLoggedIn ? (
        <Button
          variant="primary"
          className="w-full min-h-[48px]"
          size="lg"
          onClick={onPlaceBet}
          loading={placing}
          disabled={validationError || placing}
        >
          {placed ? "Bet Placed!" : `Place Bet - ${formatCurrency(stake)}`}
        </Button>
      ) : (
        <Button variant="primary" className="w-full min-h-[48px]" size="lg" onClick={() => router.push("/login")}>
          Log In to Place Bet
        </Button>
      )}
    </div>
  );
}

function MobileCollapsedBar() {
  const { selections, isOpen, setIsOpen, totalOdds, stake } = useBetSlip();
  if (selections.length === 0 || isOpen) return null;

  return (
    <motion.button
      type="button"
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 20, opacity: 0 }}
      onClick={() => setIsOpen(true)}
      style={{ bottom: "var(--mobile-nav-clearance)" }}
      className="xl:hidden fixed left-3 right-3 z-[46] mx-auto flex max-w-lg items-center justify-between gap-2 rounded-full border border-bestbet-yellow/30 bg-[var(--bet-slip-bg)]/95 px-3 py-2 shadow-lg shadow-black/40 bet-slip-glow backdrop-blur-sm min-h-[44px] pointer-events-auto"
      aria-label={`Open bet slip with ${selections.length} selections`}
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-bestbet-yellow text-bestbet-black shrink-0">
          <span className="text-xs font-black">{selections.length}</span>
        </span>
        <div className="text-left min-w-0">
          <p className="text-[11px] font-bold truncate">Bet Slip</p>
          <p className="text-[10px] text-bestbet-gray-muted tabular-nums truncate">
            {formatOdds(totalOdds)} · {formatCurrency(stake)}
          </p>
        </div>
      </div>
      <span className="flex items-center gap-1 text-bestbet-yellow shrink-0 text-[11px] font-semibold">
        Expand
        <ChevronUp size={16} />
      </span>
    </motion.button>
  );
}

function MobileBetSlipDrawer() {
  const { isOpen, setIsOpen, selections } = useBetSlip();
  const dragY = useMotionValue(0);
  const actions = useBetSlipActions();

  const closeDrawer = useCallback(() => setIsOpen(false), [setIsOpen]);

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > 80 || info.velocity.y > 400) closeDrawer();
  };

  return (
    <AnimatePresence>
      {isOpen && selections.length > 0 && (
        <motion.div
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0 }}
          transition={{ type: "spring", damping: 30, stiffness: 340 }}
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={{ top: 0, bottom: 0.4 }}
          onDragEnd={handleDragEnd}
          style={{ y: dragY, bottom: "var(--mobile-nav-clearance)" }}
          className="xl:hidden fixed left-0 right-0 z-[47] flex flex-col rounded-t-2xl border border-bestbet-yellow/15 border-b-0 bg-[var(--bet-slip-bg)] shadow-2xl bet-slip-glow pointer-events-auto max-h-[min(72dvh,calc(100dvh-var(--mobile-nav-clearance)-0.5rem))]"
          role="dialog"
          aria-label="Bet slip"
        >
          <div className="flex justify-center pt-2 pb-1 shrink-0 cursor-grab active:cursor-grabbing touch-none">
            <div className="h-1 w-10 rounded-full bg-white/25" aria-hidden="true" />
          </div>
          <BetSlipHeader onMinimize={closeDrawer} />
          <BetTypeTabs />
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
            <SelectionList />
            <BetSlipFormFields
              betError={actions.betError}
              showBooking={actions.showBooking}
              setShowBooking={actions.setShowBooking}
              onGenerateCode={actions.handleGenerateCode}
              generating={actions.generating}
              copied={actions.copied}
              onCopyCode={actions.handleCopyCode}
              codeInput={actions.codeInput}
              setCodeInput={actions.setCodeInput}
              onLoadCode={actions.handleLoadCode}
              bookingCode={actions.bookingCode}
            />
          </div>
          <BetSlipPlaceButton
            placing={actions.placing}
            placed={actions.placed}
            onPlaceBet={actions.handlePlaceBet}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function DesktopBetSlipPanel({ className }: { className?: string }) {
  const actions = useBetSlipActions();
  const { selections } = useBetSlip();

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
        {selections.length > 0 && (
          <BetSlipFormFields
            betError={actions.betError}
            showBooking={actions.showBooking}
            setShowBooking={actions.setShowBooking}
            onGenerateCode={actions.handleGenerateCode}
            generating={actions.generating}
            copied={actions.copied}
            onCopyCode={actions.handleCopyCode}
            codeInput={actions.codeInput}
            setCodeInput={actions.setCodeInput}
            onLoadCode={actions.handleLoadCode}
            bookingCode={actions.bookingCode}
          />
        )}
      </div>
      <BetSlipPlaceButton
        placing={actions.placing}
        placed={actions.placed}
        onPlaceBet={actions.handlePlaceBet}
      />
    </aside>
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

  return <DesktopBetSlipPanel className={className} />;
}

export function FloatingBetSlipButton() {
  return null;
}
