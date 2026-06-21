"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { adminApi } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { useToast } from "@/context/ToastContext";

interface BetRow {
  id: string;
  email?: string;
  name?: string;
  type: string;
  stake: number;
  potential_win: number;
  status: string;
  booking_code?: string;
  created_at: string;
}

export function AdminBettingHistorySection() {
  const toast = useToast();
  const [bets, setBets] = useState<BetRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi
      .getBets()
      .then((data) => setBets(data as BetRow[]))
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load betting history"))
      .finally(() => setLoading(false));
  }, [toast]);

  if (loading) return <p className="text-bestbet-gray-muted">Loading betting history...</p>;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-bestbet-yellow">Betting History</h2>
        <p className="text-sm text-bestbet-gray-muted">{bets.length} recent bets</p>
      </div>
      <div className="overflow-x-auto rounded-xl border border-bestbet-yellow/10">
        <table className="table-premium">
          <thead>
            <tr>
              <th>User</th>
              <th>Type</th>
              <th>Stake</th>
              <th>Potential Win</th>
              <th>Status</th>
              <th>Code</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {bets.map((bet) => (
              <tr key={bet.id}>
                <td>
                  <p className="font-medium">{bet.name || "User"}</p>
                  <p className="text-xs text-bestbet-gray-muted">{bet.email}</p>
                </td>
                <td className="capitalize">{bet.type}</td>
                <td className="font-bold text-bestbet-yellow">{formatCurrency(Number(bet.stake))}</td>
                <td>{formatCurrency(Number(bet.potential_win))}</td>
                <td>
                  <Badge
                    variant={
                      bet.status === "won"
                        ? "success"
                        : bet.status === "pending"
                          ? "warning"
                          : bet.status === "lost"
                            ? "danger"
                            : "default"
                    }
                  >
                    {bet.status}
                  </Badge>
                </td>
                <td className="font-mono text-xs text-bestbet-yellow">{bet.booking_code || "—"}</td>
                <td className="text-xs text-bestbet-gray-muted">{bet.created_at}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {bets.length === 0 && (
          <p className="text-center text-bestbet-gray-muted py-8">No bets placed yet</p>
        )}
      </div>
    </div>
  );
}
