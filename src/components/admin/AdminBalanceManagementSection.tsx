"use client";

import { useEffect, useState } from "react";
import { Wallet, RefreshCw, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { adminApi, type UserAdminApi } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { isProtectedAdminEmail } from "@/lib/constants";
import { useToast } from "@/context/ToastContext";
import { useAuth } from "@/context/AuthContext";

export function AdminBalanceManagementSection() {
  const toast = useToast();
  const { user } = useAuth();
  const [users, setUsers] = useState<UserAdminApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [resetting, setResetting] = useState(false);

  const load = () => {
    setLoading(true);
    setError("");
    adminApi
      .getUsers()
      .then((data) => setUsers(Array.isArray(data) ? data : []))
      .catch((err) => {
        const message = err instanceof Error ? err.message : "Failed to load balances";
        setError(message);
        toast.error(message);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const totalBalance = users.reduce((sum, u) => sum + Number(u.balance ?? 0), 0);
  const resettableUsers = users.filter((u) => !isProtectedAdminEmail(u.email));

  const handleResetAll = async () => {
    if (user?.roleId !== "super_admin") {
      toast.error("Only super admins can reset all balances");
      return;
    }
    if (confirmText.trim() !== "RESET ALL BALANCES") {
      toast.error('Type "RESET ALL BALANCES" to confirm');
      return;
    }
    setResetting(true);
    try {
      const result = await adminApi.resetAllUserBalances(confirmText.trim());
      toast.success(result.message);
      setConfirmText("");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to reset balances");
    } finally {
      setResetting(false);
    }
  };

  if (loading) {
    return <p className="text-bestbet-gray-muted">Loading balance data...</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-bestbet-yellow flex items-center gap-2">
          <Wallet size={20} /> Balance Management
        </h2>
        <p className="text-sm text-bestbet-gray-muted mt-1">
          Review wallet totals and reset all user balances. The protected super admin account is preserved.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300 flex items-center justify-between gap-3">
          <span>{error}</span>
          <Button size="sm" variant="outline" onClick={load}>
            Retry
          </Button>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card-premium p-4 border border-bestbet-yellow/10">
          <p className="text-xs text-bestbet-gray-muted">Total user balance</p>
          <p className="text-2xl font-bold text-bestbet-yellow mt-1">{formatCurrency(totalBalance)}</p>
        </div>
        <div className="card-premium p-4 border border-bestbet-yellow/10">
          <p className="text-xs text-bestbet-gray-muted">Accounts tracked</p>
          <p className="text-2xl font-bold mt-1">{users.length}</p>
        </div>
        <div className="card-premium p-4 border border-bestbet-yellow/10">
          <p className="text-xs text-bestbet-gray-muted">Resettable users</p>
          <p className="text-2xl font-bold mt-1">{resettableUsers.length}</p>
        </div>
      </div>

      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={load}>
          <RefreshCw size={14} className="mr-1" /> Refresh
        </Button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-bestbet-yellow/10">
        <table className="table-premium">
          <thead>
            <tr>
              <th>User</th>
              <th>Balance</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>
                  <p className="font-medium">{u.name}</p>
                  <p className="text-xs text-bestbet-gray-muted">{u.email}</p>
                </td>
                <td className="font-bold text-bestbet-yellow">{formatCurrency(u.balance)}</td>
                <td>{isProtectedAdminEmail(u.email) ? "Protected admin" : u.status}</td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={3} className="text-center text-bestbet-gray-muted py-8">
                  No users found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {user?.roleId === "super_admin" && (
        <div className="card-premium p-5 border border-red-500/20 space-y-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="text-red-400 shrink-0 mt-0.5" size={18} />
            <div>
              <h3 className="text-sm font-bold text-red-300">Reset All User Balances</h3>
              <p className="text-xs text-bestbet-gray-muted mt-1">
                Sets every non-admin wallet to GH₵ 0.00. Deposits, bets, and account records are not deleted.
              </p>
            </div>
          </div>
          <Input
            label='Type "RESET ALL BALANCES" to confirm'
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
          />
          <Button
            variant="danger"
            size="sm"
            loading={resetting}
            disabled={confirmText.trim() !== "RESET ALL BALANCES"}
            onClick={() => void handleResetAll()}
          >
            Reset All User Balances
          </Button>
        </div>
      )}
    </div>
  );
}
