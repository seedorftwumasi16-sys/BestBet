"use client";

import { forwardRef } from "react";
import { Check, Copy } from "lucide-react";
import { BRAND } from "@/lib/constants";
import {
  formatBookingCreatedAt,
  formatSelectionLine,
  type BookingShareData,
} from "@/lib/booking-share";
import { formatCurrency, formatOdds } from "@/lib/utils";
import { cn } from "@/lib/utils";

function ShieldIcon({ size = 40 }: { size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 48 48"
      width={size}
      height={size}
      className="gold-glow shrink-0"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="bbShareShieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFE566" />
          <stop offset="50%" stopColor="#FFD700" />
          <stop offset="100%" stopColor="#FFC107" />
        </linearGradient>
      </defs>
      <path
        d="M24 2L6 10v12c0 11.5 7.7 22.3 18 26 10.3-3.7 18-14.5 18-26V10L24 2z"
        fill="url(#bbShareShieldGrad)"
      />
      <text
        x="24"
        y="31"
        textAnchor="middle"
        fontFamily="Inter, Arial, sans-serif"
        fontWeight="900"
        fontSize="20"
        fill="#000000"
      >
        B
      </text>
    </svg>
  );
}

interface BookingCodeShareCardProps {
  data: BookingShareData;
  onCopyCode?: () => void;
  copied?: boolean;
  className?: string;
}

export const BookingCodeShareCard = forwardRef<HTMLDivElement, BookingCodeShareCardProps>(
  function BookingCodeShareCard({ data, onCopyCode, copied, className }, ref) {
    const statusLabel =
      data.status.charAt(0).toUpperCase() + data.status.slice(1).toLowerCase();

    return (
      <div
        ref={ref}
        className={cn("bb-booking-share-card overflow-hidden", className)}
        data-booking-code={data.code}
      >
        <header className="bb-booking-share-header">
          <ShieldIcon size={36} />
          <p className="bb-booking-share-tagline">{BRAND.slogan.toUpperCase()}</p>
        </header>

        <div className="bb-booking-share-body">
          <p className="bb-booking-share-label">Booking Code</p>
          <div className="bb-booking-share-code-row">
            <p className="bb-booking-share-code">{data.code}</p>
            {onCopyCode && (
              <button
                type="button"
                onClick={onCopyCode}
                className="bb-booking-share-copy-btn"
                aria-label="Copy booking code"
              >
                {copied ? <Check size={18} className="text-bestbet-success" /> : <Copy size={18} />}
              </button>
            )}
          </div>

          <h2 className="bb-booking-share-name">{data.name}</h2>

          <dl className="bb-booking-share-summary">
            <div>
              <dt>Total Odds</dt>
              <dd>{formatOdds(data.totalOdds)}</dd>
            </div>
            <div>
              <dt>Stake</dt>
              <dd>{formatCurrency(data.stake)}</dd>
            </div>
            <div>
              <dt>Potential Win</dt>
              <dd className="text-bestbet-yellow">{formatCurrency(data.potentialWin)}</dd>
            </div>
            <div>
              <dt>Selections</dt>
              <dd>{data.selections.length}</dd>
            </div>
          </dl>

          <div className="bb-booking-share-selections">
            <p className="bb-booking-share-selections-title">Selected Matches</p>
            <ul className="space-y-2">
              {data.selections.map((sel) => (
                <li key={sel.id} className="bb-booking-share-selection-item">
                  <Check size={14} className="shrink-0 text-bestbet-yellow mt-0.5" aria-hidden />
                  <span>{formatSelectionLine(sel)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <footer className="bb-booking-share-footer">
          <p>
            <span className="text-bestbet-gray-muted">Created:</span>{" "}
            {formatBookingCreatedAt(data.createdAt)}
          </p>
          <p>
            <span className="text-bestbet-gray-muted">Status:</span>{" "}
            <span className="text-bestbet-success font-semibold">{statusLabel}</span>
          </p>
        </footer>
      </div>
    );
  }
);
