"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { useAuth } from "@/context/AuthContext";
import { walletsApi } from "@/lib/api";
import { ArrowLeft, Smartphone, Upload } from "lucide-react";

export default function DepositPage() {
  const { isLoggedIn, refreshUser } = useAuth();
  const [momoNumber, setMomoNumber] = useState("0245680115");
  const [amount, setAmount] = useState("");
  const [amountSent, setAmountSent] = useState("");
  const [paymentReference, setPaymentReference] = useState("");
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    walletsApi.getMomoInfo().then((info) => setMomoNumber(info.number)).catch(() => {});
  }, []);

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
        <div className="max-w-lg mx-auto p-6 text-center space-y-4">
          <Badge variant="warning">Pending Admin Approval</Badge>
          <h1 className="text-2xl font-black">Deposit Submitted</h1>
          <p className="text-bestbet-gray-muted">Your deposit is being reviewed. You will be notified once approved.</p>
          <Link href="/dashboard"><Button variant="primary">Back to Dashboard</Button></Link>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-lg mx-auto p-4 md:p-6 space-y-6">
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-bestbet-gray-muted hover:text-bestbet-yellow">
          <ArrowLeft size={16} /> Back
        </Link>
        <div>
          <h1 className="text-2xl font-black">Deposit Funds</h1>
          <p className="text-sm text-bestbet-gray-muted mt-1">Pay via Mobile Money</p>
        </div>

        <div className="stat-card p-4 space-y-2">
          <p className="text-xs text-bestbet-gray-muted uppercase tracking-wider">Send payment to</p>
          <div className="flex items-center gap-3">
            <Smartphone className="text-bestbet-yellow" size={24} />
            <div>
              <p className="text-2xl font-black tracking-wider">{momoNumber}</p>
              <p className="text-xs text-bestbet-gray-muted">Mobile Money (MTN/Vodafone/AirtelTigo)</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="card-premium p-6 space-y-4">
          <Input label="Deposit Amount (GHS)" type="number" min="5" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />
          <Input label="Amount Sent (GHS)" type="number" min="5" step="0.01" value={amountSent} onChange={(e) => setAmountSent(e.target.value)} placeholder="Same as deposit amount" />
          <Input label="Payment Reference Number" value={paymentReference} onChange={(e) => setPaymentReference(e.target.value)} placeholder="Transaction ID from MoMo" required />

          <div>
            <label className="block text-sm font-medium mb-2">Payment Screenshot</label>
            <label className="flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed border-[var(--border)] rounded-xl cursor-pointer hover:border-bestbet-yellow transition-colors">
              <Upload size={24} className="text-bestbet-gray-muted" />
              <span className="text-sm text-bestbet-gray-muted">{screenshot ? screenshot.name : "Upload screenshot"}</span>
              <input type="file" accept="image/*" className="hidden" onChange={(e) => setScreenshot(e.target.files?.[0] || null)} required />
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
