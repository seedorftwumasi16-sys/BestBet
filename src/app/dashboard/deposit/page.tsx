"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { useAuth } from "@/context/AuthContext";
import { walletsApi } from "@/lib/api";
import { DEFAULT_MOMO_INFO } from "@/lib/momo";
import { ArrowLeft, Smartphone, Upload, Copy, CheckCircle2, User } from "lucide-react";

export default function DepositPage() {
  const { isLoggedIn, refreshUser } = useAuth();
  const [momoInfo, setMomoInfo] = useState(DEFAULT_MOMO_INFO);
  const [amount, setAmount] = useState("");
  const [amountSent, setAmountSent] = useState("");
  const [paymentReference, setPaymentReference] = useState("");
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    walletsApi
      .getMomoInfo()
      .then((info) =>
        setMomoInfo({
          number: info.number,
          recipientName: info.recipientName,
          provider: info.provider,
          currency: info.currency,
        })
      )
      .catch(() => {});
  }, []);

  const copyValue = async (field: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      /* clipboard unavailable */
    }
  };

  if (!isLoggedIn) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[60vh] p-6 text-center">
          <div>
            <h2 className="text-xl font-bold mb-2">Please log in</h2>
            <Link href="/login"><Button variant="primary">Log In</Button></Link>
          </div>
        </div>
      </MainLayout>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("amount", amount);
      formData.append("amountSent", amountSent || amount);
      formData.append("paymentReference", paymentReference);
      if (screenshot) formData.append("screenshot", screenshot);
      await walletsApi.deposit(formData);
      setSuccess(true);
      await refreshUser();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Deposit failed");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <MainLayout>
        <div className="max-w-lg mx-auto p-4 md:p-6 text-center space-y-5">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-bestbet-success/15 border border-bestbet-success/30">
            <CheckCircle2 size={32} className="text-bestbet-success" />
          </div>
          <Badge variant="warning">Pending Admin Approval</Badge>
          <h1 className="text-2xl md:text-3xl font-black font-display">Deposit Submitted</h1>
          <p className="text-bestbet-gray-muted leading-relaxed">
            Your deposit of <span className="text-white font-semibold">GHS {amountSent || amount}</span> is being
            reviewed. You will be notified once approved.
          </p>
          <div className="glass-panel rounded-2xl p-4 text-left space-y-2 text-sm">
            <p>
              <span className="text-bestbet-gray-muted">Reference:</span>{" "}
              <span className="font-semibold">{paymentReference}</span>
            </p>
            <p>
              <span className="text-bestbet-gray-muted">Paid to:</span>{" "}
              <span className="font-semibold">{momoInfo.recipientName}</span> ({momoInfo.number})
            </p>
          </div>
          <Link href="/dashboard">
            <Button variant="primary" className="w-full sm:w-auto">Back to Dashboard</Button>
          </Link>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-lg mx-auto p-4 md:p-6 pb-28 xl:pb-6 space-y-6">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm text-bestbet-gray-muted hover:text-bestbet-yellow transition-colors"
        >
          <ArrowLeft size={16} /> Back to Dashboard
        </Link>

        <div>
          <h1 className="text-2xl md:text-3xl font-black font-display">Deposit Funds</h1>
          <p className="text-sm text-bestbet-gray-muted mt-1">Send Mobile Money to the account below, then submit proof.</p>
        </div>

        <div className="promo-card-premium p-5 space-y-4">
          <p className="text-xs font-bold uppercase tracking-widest text-bestbet-yellow">Mobile Money Details</p>

          <div className="flex items-start gap-3 p-4 rounded-xl bg-black/30 border border-white/5">
            <div className="p-2.5 rounded-xl bg-bestbet-yellow/10 border border-bestbet-yellow/20 shrink-0">
              <Smartphone className="text-bestbet-yellow" size={22} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-bestbet-gray-muted mb-1">Phone Number</p>
              <div className="flex items-center gap-2">
                <p className="text-xl md:text-2xl font-black tracking-wide tabular-nums">{momoInfo.number}</p>
                <button
                  type="button"
                  onClick={() => copyValue("number", momoInfo.number)}
                  className="p-1.5 rounded-lg hover:bg-white/5 text-bestbet-gray-muted hover:text-bestbet-yellow transition-colors"
                  aria-label="Copy phone number"
                >
                  {copiedField === "number" ? <CheckCircle2 size={16} className="text-bestbet-success" /> : <Copy size={16} />}
                </button>
              </div>
              <p className="text-[11px] text-bestbet-gray-muted mt-1">MTN · Vodafone · AirtelTigo</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 rounded-xl bg-black/30 border border-white/5">
            <div className="p-2.5 rounded-xl bg-bestbet-yellow/10 border border-bestbet-yellow/20 shrink-0">
              <User className="text-bestbet-yellow" size={22} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-bestbet-gray-muted mb-1">Recipient Name</p>
              <div className="flex items-center gap-2">
                <p className="text-lg md:text-xl font-bold uppercase tracking-wide">{momoInfo.recipientName}</p>
                <button
                  type="button"
                  onClick={() => copyValue("name", momoInfo.recipientName)}
                  className="p-1.5 rounded-lg hover:bg-white/5 text-bestbet-gray-muted hover:text-bestbet-yellow transition-colors"
                  aria-label="Copy recipient name"
                >
                  {copiedField === "name" ? <CheckCircle2 size={16} className="text-bestbet-success" /> : <Copy size={16} />}
                </button>
              </div>
              <p className="text-[11px] text-bestbet-gray-muted mt-1">Verify this name before sending payment</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="card-premium p-5 md:p-6 space-y-4">
          <h2 className="text-sm font-bold font-display">Submit Payment Proof</h2>
          <Input
            label="Deposit Amount (GHS)"
            type="number"
            min="5"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
          <Input
            label="Amount Sent (GHS)"
            type="number"
            min="5"
            step="0.01"
            value={amountSent}
            onChange={(e) => setAmountSent(e.target.value)}
            placeholder="Same as deposit amount"
          />
          <Input
            label="Payment Reference Number"
            value={paymentReference}
            onChange={(e) => setPaymentReference(e.target.value)}
            placeholder="Transaction ID from MoMo"
            required
          />

          <div>
            <label className="block text-sm font-medium mb-2">Payment Screenshot</label>
            <label className="flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed border-[var(--border)] rounded-xl cursor-pointer hover:border-bestbet-yellow/50 transition-colors">
              <Upload size={24} className="text-bestbet-gray-muted" />
              <span className="text-sm text-bestbet-gray-muted text-center px-2">
                {screenshot ? screenshot.name : "Tap to upload MoMo confirmation screenshot"}
              </span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => setScreenshot(e.target.files?.[0] || null)}
                required
              />
            </label>
          </div>

          {error && <p className="text-sm text-bestbet-danger">{error}</p>}
          <Button type="submit" variant="primary" className="w-full" loading={loading}>
            Submit Deposit Request
          </Button>
        </form>
      </div>
    </MainLayout>
  );
}
