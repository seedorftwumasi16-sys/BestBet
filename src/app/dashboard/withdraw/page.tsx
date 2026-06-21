"use client";

import { useState } from "react";
import Link from "next/link";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { useAuth } from "@/context/AuthContext";
import { walletsApi } from "@/lib/api";
import { ArrowLeft, Smartphone } from "lucide-react";
import { formatCurrency, CURRENCY_SYMBOL } from "@/lib/utils";

export default function WithdrawPage() {
  const { isLoggedIn, user, refreshUser } = useAuth();
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("mobile_money");
  const [accountDetails, setAccountDetails] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  if (!isLoggedIn) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[60vh] p-6 text-center">
          <Link href="/login"><Button variant="primary">Log In</Button></Link>
        </div>
      </MainLayout>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await walletsApi.withdraw(Number(amount), method, accountDetails);
      setSuccess(true);
      await refreshUser();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Withdrawal failed");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <MainLayout>
        <div className="max-w-lg mx-auto p-6 text-center space-y-4">
          <Badge variant="warning">Pending Approval</Badge>
          <h1 className="text-2xl font-black">Withdrawal Requested</h1>
          <p className="text-bestbet-gray-muted">Your withdrawal is being processed by our team.</p>
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
          <h1 className="text-2xl font-black">Withdraw Funds</h1>
          <p className="text-sm text-bestbet-gray-muted mt-1">Available: {formatCurrency(user!.balance)}</p>
        </div>

        <form onSubmit={handleSubmit} className="card-premium p-6 space-y-4">
          <Input
            label="Withdrawal Amount"
            type="number"
            min="10"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputPrefix={CURRENCY_SYMBOL}
            placeholder="0.00"
            required
          />
          <div>
            <label className="block text-sm font-medium mb-2">Method</label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="h-14 w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 text-sm transition-all duration-300 focus:border-bestbet-yellow focus:outline-none focus:ring-2 focus:ring-bestbet-yellow/30"
            >
              <option value="mobile_money">Mobile Money</option>
              <option value="bank_transfer">Bank Transfer</option>
            </select>
          </div>
          <Input
            label={method === "mobile_money" ? "Mobile Money Number" : "Bank Account Details"}
            value={accountDetails}
            onChange={(e) => setAccountDetails(e.target.value)}
            placeholder={method === "mobile_money" ? "024XXXXXXX" : "Bank name, account number"}
            icon={<Smartphone size={18} />}
            required
          />
          {error && <p className="text-sm text-bestbet-danger">{error}</p>}
          <Button type="submit" variant="primary" className="w-full" loading={loading}>
            Request Withdrawal
          </Button>
        </form>
      </div>
    </MainLayout>
  );
}
