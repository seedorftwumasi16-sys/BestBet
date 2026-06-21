"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Search, Trash2, Ticket } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { adminApi, type BookingCodeAdminApi } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { safeToFixed } from "@/lib/admin-utils";
import { useToast } from "@/context/ToastContext";

export function AdminBookingCodesSection() {
  const toast = useToast();
  const toastRef = useRef(toast);
  toastRef.current = toast;
  const [codes, setCodes] = useState<BookingCodeAdminApi[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback((q?: string) => {
    setLoading(true);
    setError("");
    adminApi
      .getBookingCodes(q)
      .then((data) => setCodes(Array.isArray(data?.codes) ? data.codes : []))
      .catch((err) => {
        const message = err instanceof Error ? err.message : "Failed to load booking codes";
        setError(message);
        toastRef.current.error(message);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSearch = () => load(search.trim() || undefined);

  const remove = async (item: BookingCodeAdminApi) => {
    if (!confirm(`Delete booking code ${item.code}?`)) return;
    try {
      await adminApi.deleteBookingCode(item.id);
      setCodes((prev) => prev.filter((c) => c.id !== item.id));
      toast.success("Booking code deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-bestbet-yellow flex items-center gap-2">
          <Ticket size={20} /> Booking Codes
        </h2>
        <p className="text-sm text-bestbet-gray-muted">View, search, and manage saved bet slips.</p>
      </div>

      <div className="flex gap-2 max-w-md">
        <Input
          placeholder="Search code, email, name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
        />
        <Button variant="primary" size="sm" onClick={handleSearch}>
          <Search size={16} />
        </Button>
      </div>

      {error && !loading && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300 flex items-center justify-between gap-3">
          <span>{error}</span>
          <Button size="sm" variant="outline" onClick={() => load(search.trim() || undefined)}>Retry</Button>
        </div>
      )}

      {loading ? (
        <p className="text-bestbet-gray-muted">Loading...</p>
      ) : (
        <div className="space-y-3">
          {codes.map((item) => (
            <div key={item.id} className="card-premium p-4 border border-bestbet-yellow/10">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <code className="text-lg font-black text-bestbet-yellow tracking-wider">{item.code}</code>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <Badge variant={item.status === "active" ? "success" : item.status === "used" ? "warning" : "danger"}>
                      {item.status}
                    </Badge>
                    <Badge variant="default">{item.betType}</Badge>
                    <Badge variant="default">{item.selectionCount} selections</Badge>
                  </div>
                  <p className="text-xs text-bestbet-gray-muted mt-2">
                    Created by {item.creatorName || item.creatorEmail} · {item.createdAt}
                  </p>
                  {item.expiresAt && (
                    <p className="text-xs text-bestbet-gray-muted">Expires: {item.expiresAt}</p>
                  )}
                  {item.usedByEmail && (
                    <p className="text-xs text-bestbet-yellow mt-1">
                      Used by {item.usedByName || item.usedByEmail} · {item.usedAt}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold">{formatCurrency(Number(item.stake) || 0)} stake</p>
                  <p className="text-xs text-bestbet-gray-muted">Odds: {safeToFixed(item.totalOdds)}</p>
                  <p className="text-sm text-bestbet-yellow font-bold">{formatCurrency(Number(item.potentialWin) || 0)} potential</p>
                  {item.status === "active" && (
                    <Button size="sm" variant="danger" className="mt-2" onClick={() => remove(item)}>
                      <Trash2 size={14} />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
          {codes.length === 0 && (
            <p className="text-center text-bestbet-gray-muted py-8">No booking codes found</p>
          )}
        </div>
      )}
    </div>
  );
}
