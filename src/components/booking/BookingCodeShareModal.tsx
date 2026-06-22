"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { X, Share2, Download, Ticket } from "lucide-react";
import { BookingCodeShareCard } from "@/components/booking/BookingCodeShareCard";
import { Button } from "@/components/ui/Button";
import {
  deriveBetSlipName,
  downloadBookingCardImage,
  shareBookingCode,
  type BookingShareData,
} from "@/lib/booking-share";
import { useToast } from "@/context/ToastContext";

interface BookingCodeShareModalProps {
  open: boolean;
  data: BookingShareData | null;
  onClose: () => void;
}

export function BookingCodeShareModal({ open, data, onClose }: BookingCodeShareModalProps) {
  const router = useRouter();
  const toast = useToast();
  const cardRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [sharing, setSharing] = useState(false);

  const handleCopyCode = useCallback(async () => {
    if (!data) return;
    await navigator.clipboard.writeText(data.code);
    setCopied(true);
    toast.success("Booking code copied");
    setTimeout(() => setCopied(false), 2000);
  }, [data, toast]);

  const handleShare = useCallback(async () => {
    if (!data) return;
    setSharing(true);
    try {
      await shareBookingCode(data);
      toast.success(
        typeof navigator.share === "function"
          ? "Copied — share menu opened"
          : "Share text copied to clipboard"
      );
    } catch {
      toast.error("Could not share booking code");
    } finally {
      setSharing(false);
    }
  }, [data, toast]);

  const handleDownload = useCallback(async () => {
    if (!data || !cardRef.current) return;
    setDownloading(true);
    try {
      await downloadBookingCardImage(cardRef.current, `bestbet-${data.code}.png`);
      toast.success("Image downloaded");
    } catch {
      toast.error("Could not download image");
    } finally {
      setDownloading(false);
    }
  }, [data, toast]);

  const handleLoadBet = useCallback(() => {
    if (!data) return;
    onClose();
    router.push(`/booking?code=${encodeURIComponent(data.code)}`);
  }, [data, onClose, router]);

  return (
    <AnimatePresence>
      {open && data && (
        <motion.div
          className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-label="Booking code share card"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={onClose}
            aria-label="Close"
          />

          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            className="relative z-10 w-full max-w-md max-h-[92dvh] overflow-y-auto overscroll-contain rounded-t-[20px] sm:rounded-[20px]"
          >
            <div className="sticky top-0 z-10 flex justify-end p-3 pb-0">
              <button
                type="button"
                onClick={onClose}
                className="rounded-full bg-black/60 p-2 text-white/80 hover:text-white hover:bg-black/80 transition-colors"
                aria-label="Close share card"
              >
                <X size={18} />
              </button>
            </div>

            <div className="px-4 pb-4 space-y-4">
              <BookingCodeShareCard
                ref={cardRef}
                data={data}
                onCopyCode={handleCopyCode}
                copied={copied}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Button variant="primary" className="w-full" onClick={handleCopyCode}>
                  Copy Booking Code
                </Button>
                <Button
                  variant="outline"
                  className="w-full border-bestbet-yellow/40 text-bestbet-yellow"
                  loading={sharing}
                  onClick={handleShare}
                >
                  <Share2 size={16} className="mr-1" />
                  Share Bet Slip
                </Button>
                <Button
                  variant="secondary"
                  className="w-full"
                  loading={downloading}
                  onClick={handleDownload}
                >
                  <Download size={16} className="mr-1" />
                  Download Image
                </Button>
                <Button variant="ghost" className="w-full border border-white/10" onClick={handleLoadBet}>
                  <Ticket size={16} className="mr-1" />
                  Load Bet Using Code
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function buildShareDataFromRecord(
  record: {
    code: string;
    stake: number;
    totalOdds: number;
    potentialWin: number;
    createdAt: string;
    status: string;
    selections: unknown[];
  },
  selections: BookingShareData["selections"]
): BookingShareData {
  return {
    code: record.code,
    name: deriveBetSlipName(record.selections.length, record.createdAt),
    stake: record.stake,
    totalOdds: record.totalOdds,
    potentialWin: record.potentialWin,
    selections,
    createdAt: record.createdAt,
    status: record.status || "active",
  };
}
