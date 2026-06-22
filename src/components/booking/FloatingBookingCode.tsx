"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Ticket, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useBetSlip } from "@/context/BetSlipContext";
import { useToast } from "@/context/ToastContext";
import { betsApi } from "@/lib/api";
import type { BetSelection } from "@/lib/constants";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "bestbet-floating-booking-pos";
const DEFAULT_POSITION = { x: 91, y: 62 };
const DRAG_THRESHOLD_PX = 8;

interface StoredPosition {
  x: number;
  y: number;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function readStoredPosition(): StoredPosition {
  if (typeof window === "undefined") return DEFAULT_POSITION;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_POSITION;
    const parsed = JSON.parse(raw) as StoredPosition;
    if (
      typeof parsed.x === "number" &&
      typeof parsed.y === "number" &&
      Number.isFinite(parsed.x) &&
      Number.isFinite(parsed.y)
    ) {
      return {
        x: clamp(parsed.x, 6, 94),
        y: clamp(parsed.y, 8, 86),
      };
    }
  } catch {
    /* ignore */
  }
  return DEFAULT_POSITION;
}

function persistPosition(position: StoredPosition) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(position));
  } catch {
    /* ignore */
  }
}

export function FloatingBookingCode() {
  const toast = useToast();
  const { loadFromCode, setIsOpen, selections, savedBookingCode } = useBetSlip();

  const [mounted, setMounted] = useState(false);
  const [position, setPosition] = useState<StoredPosition>(DEFAULT_POSITION);
  const [isDragging, setIsDragging] = useState(false);
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const dragState = useRef({
    pointerId: -1,
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
    moved: false,
  });

  useEffect(() => {
    setMounted(true);
    setPosition(readStoredPosition());
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const showBadge = selections.length > 0 && Boolean(savedBookingCode);

  const handleLoad = useCallback(async () => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) {
      setError("Please enter a booking code");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const result = await betsApi.loadBookingCode(trimmed);
      loadFromCode(result.code, {
        ...result.payload,
        selections: result.payload.selections as BetSelection[],
      });
      toast.success(`Loaded ${result.payload.selections.length} selection(s)`);
      setOpen(false);
      setCode("");
      setIsOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid booking code");
    } finally {
      setLoading(false);
    }
  }, [code, loadFromCode, setIsOpen, toast]);

  const handlePointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragState.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: position.x,
      originY: position.y,
      moved: false,
    };
    setIsDragging(true);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (dragState.current.pointerId !== event.pointerId) return;

    const dx = event.clientX - dragState.current.startX;
    const dy = event.clientY - dragState.current.startY;

    if (!dragState.current.moved && Math.hypot(dx, dy) > DRAG_THRESHOLD_PX) {
      dragState.current.moved = true;
    }

    if (!dragState.current.moved) return;

    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;
    const originLeft = (dragState.current.originX / 100) * viewportW;
    const originTop = (dragState.current.originY / 100) * viewportH;

    setPosition({
      x: clamp(((originLeft + dx) / viewportW) * 100, 6, 94),
      y: clamp(((originTop + dy) / viewportH) * 100, 8, 86),
    });
  };

  const finishPointer = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (dragState.current.pointerId !== event.pointerId) return;

    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      /* ignore */
    }

    const moved = dragState.current.moved;
    dragState.current.pointerId = -1;
    setIsDragging(false);

    if (moved) {
      setPosition((current) => {
        persistPosition(current);
        return current;
      });
      return;
    }

    setError("");
    setOpen(true);
  };

  if (!mounted) return null;

  return (
    <>
      <button
        type="button"
        className={cn(
          "bb-floating-booking-fab fixed z-[52] touch-none select-none",
          isDragging && "bb-floating-booking-fab--dragging"
        )}
        style={{
          left: `${position.x}%`,
          top: `${position.y}%`,
        }}
        aria-label="Load bet using booking code"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishPointer}
        onPointerCancel={finishPointer}
      >
        {showBadge && (
          <span className="bb-floating-booking-badge" aria-hidden="true">
            {selections.length > 9 ? "9+" : selections.length}
          </span>
        )}
        <Ticket size={18} strokeWidth={2.5} className="shrink-0" aria-hidden="true" />
        <span className="text-[9px] font-extrabold leading-none tracking-wide">Code</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-[68] flex items-end sm:items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="floating-booking-title"
          >
            <button
              type="button"
              className="absolute inset-0 bg-black/75 backdrop-blur-sm"
              onClick={() => setOpen(false)}
              aria-label="Close"
            />

            <motion.div
              initial={{ opacity: 0, y: 48 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 32 }}
              transition={{ type: "spring", damping: 28, stiffness: 320 }}
              className="bb-floating-booking-sheet relative z-10 w-full sm:max-w-md sm:mx-4"
            >
              <div className="flex items-start justify-between gap-3 mb-5">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#FFD000]/80 mb-1">
                    BestBet
                  </p>
                  <h2 id="floating-booking-title" className="text-lg sm:text-xl font-black text-white">
                    Load Bet Using Booking Code
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-full p-2 text-white/70 hover:text-white hover:bg-white/10 transition-colors shrink-0"
                  aria-label="Close dialog"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4">
                <Input
                  label="Booking Code"
                  placeholder="Enter booking code"
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value.toUpperCase());
                    if (error) setError("");
                  }}
                  icon={<Ticket size={18} />}
                  error={error}
                  autoComplete="off"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void handleLoad();
                  }}
                />

                <Button
                  variant="primary"
                  className="w-full min-h-[48px] bg-[#FFD000] hover:bg-[#FFD000]/90 text-black border-[#FFD000]/30"
                  size="lg"
                  loading={loading}
                  onClick={() => void handleLoad()}
                >
                  Load Bet
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
