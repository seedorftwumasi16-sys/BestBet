"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { adminApi, contentApi, type AdminStatsApi, type UserAdminApi, type DepositAdminApi, type WithdrawalAdminApi } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";

export function AdminUsersSection() {
  const [users, setUsers] = useState<UserAdminApi[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.getUsers().then(setUsers).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const updateStatus = async (id: string, status: string) => {
    await adminApi.updateUserStatus(id, status);
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, status } : u)));
  };

  const adjustBalance = async (id: string, type: "add" | "deduct") => {
    const amount = prompt(`Amount to ${type}:`);
    if (!amount) return;
    await adminApi.adjustBalance(id, Number(amount), type);
    const updated = await adminApi.getUsers();
    setUsers(updated);
  };

  if (loading) return <p className="text-bestbet-gray-muted">Loading users...</p>;

  return (
    <div className="overflow-x-auto rounded-xl border border-bestbet-yellow/10">
      <table className="table-premium">
        <thead>
          <tr>
            <th>User</th>
            <th>Balance</th>
            <th>Status</th>
            <th>Actions</th>
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
              <td>
                <Badge variant={u.status === "active" ? "success" : "danger"}>{u.status}</Badge>
              </td>
              <td className="flex flex-wrap gap-1">
                {u.status !== "suspended" && (
                  <Button size="sm" variant="outline" onClick={() => updateStatus(u.id, "suspended")}>Suspend</Button>
                )}
                {u.status !== "banned" && (
                  <Button size="sm" variant="danger" onClick={() => updateStatus(u.id, "banned")}>Ban</Button>
                )}
                {u.status !== "active" && (
                  <Button size="sm" variant="primary" onClick={() => updateStatus(u.id, "active")}>Activate</Button>
                )}
                <Button size="sm" variant="secondary" onClick={() => adjustBalance(u.id, "add")}>Add</Button>
                <Button size="sm" variant="secondary" onClick={() => adjustBalance(u.id, "deduct")}>Deduct</Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function AdminDepositsSection() {
  const [deposits, setDeposits] = useState<DepositAdminApi[]>([]);

  const load = () => adminApi.getDeposits().then(setDeposits).catch(() => {});
  useEffect(() => { load(); }, []);

  const approve = async (id: string) => { await adminApi.approveDeposit(id); load(); };
  const reject = async (id: string) => {
    const note = prompt("Rejection reason:");
    await adminApi.rejectDeposit(id, note || undefined);
    load();
  };
  const requestInfo = async (id: string) => {
    const note = prompt("What info is needed?");
    if (note) { await adminApi.requestDepositInfo(id, note); load(); }
  };

  return (
    <div className="space-y-3">
      {deposits.map((d) => (
        <div key={d.id} className="card-premium p-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-bold">{d.name || d.email} — {formatCurrency(Number(d.amount))}</p>
            <p className="text-xs text-bestbet-gray-muted">Ref: {d.payment_reference} · {d.created_at}</p>
            {d.screenshot_url && (
              <a href={d.screenshot_url} target="_blank" rel="noopener" className="text-xs text-bestbet-yellow hover:underline">View Screenshot</a>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={d.status === "completed" ? "success" : d.status === "pending" ? "warning" : "danger"}>{d.status}</Badge>
            {d.status === "pending" && (
              <>
                <Button size="sm" variant="primary" onClick={() => approve(d.id)}>Approve</Button>
                <Button size="sm" variant="outline" onClick={() => requestInfo(d.id)}>Request Info</Button>
                <Button size="sm" variant="danger" onClick={() => reject(d.id)}>Reject</Button>
              </>
            )}
          </div>
        </div>
      ))}
      {deposits.length === 0 && <p className="text-bestbet-gray-muted text-center py-8">No deposits</p>}
    </div>
  );
}

export function AdminWithdrawalsSection() {
  const [withdrawals, setWithdrawals] = useState<WithdrawalAdminApi[]>([]);
  const load = () => adminApi.getWithdrawals().then(setWithdrawals).catch(() => {});
  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-3">
      {withdrawals.map((w) => (
        <div key={w.id} className="bg-bestbet-dark-secondary rounded-xl p-4 border border-bestbet-gray flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-bold">{w.name || w.email} — {formatCurrency(Number(w.amount))}</p>
            <p className="text-xs text-bestbet-gray-muted">{w.account_details} · {w.created_at}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={w.status === "completed" ? "success" : w.status === "pending" ? "warning" : "danger"}>{w.status}</Badge>
            {w.status === "pending" && (
              <>
                <Button size="sm" variant="primary" onClick={async () => { await adminApi.approveWithdrawal(w.id); load(); }}>Approve</Button>
                <Button size="sm" variant="danger" onClick={async () => { await adminApi.rejectWithdrawal(w.id); load(); }}>Reject</Button>
              </>
            )}
          </div>
        </div>
      ))}
      {withdrawals.length === 0 && <p className="text-bestbet-gray-muted text-center py-8">No withdrawals</p>}
    </div>
  );
}

export function AdminAuditSection() {
  const [logs, setLogs] = useState<Record<string, unknown>[]>([]);
  useEffect(() => { adminApi.getAuditLogs().then((data) => setLogs(data as Record<string, unknown>[])).catch(() => {}); }, []);

  return (
    <div className="space-y-2 max-h-[600px] overflow-y-auto">
      {logs.map((log) => (
        <div key={String(log.id)} className="bg-bestbet-dark-secondary rounded-lg p-3 border border-bestbet-gray text-sm">
          <div className="flex justify-between">
            <span className="font-medium">{String(log.action)}</span>
            <span className="text-xs text-bestbet-gray-muted">{String(log.created_at)}</span>
          </div>
          <p className="text-xs text-bestbet-gray-muted mt-1">{String(log.user_email || "system")} — {String(log.details || "")}</p>
        </div>
      ))}
    </div>
  );
}

export function AdminBookingsSection() {
  const [data, setData] = useState<{ codes: Record<string, unknown>[]; logs: Record<string, unknown>[] }>({ codes: [], logs: [] });
  useEffect(() => { adminApi.getBookings().then((data) => setData(data as { codes: Record<string, unknown>[]; logs: Record<string, unknown>[] })).catch(() => {}); }, []);

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <div>
        <h3 className="font-bold mb-3">Booking Codes</h3>
        {data.codes.map((c) => (
          <div key={String(c.id)} className="p-3 bg-bestbet-dark-secondary rounded-lg border border-bestbet-gray mb-2 text-sm">
            <span className="font-mono text-bestbet-yellow">{String(c.code)}</span>
            <span className="text-xs text-bestbet-gray-muted ml-2">{String(c.email || c.user_id)}</span>
          </div>
        ))}
      </div>
      <div>
        <h3 className="font-bold mb-3">Activity Log</h3>
        {data.logs.map((l) => (
          <div key={String(l.id)} className="p-3 bg-bestbet-dark-secondary rounded-lg border border-bestbet-gray mb-2 text-sm">
            <span className="font-medium">{String(l.action)}</span> — <span className="font-mono">{String(l.code)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AdminVirtualSection() {
  const [games, setGames] = useState<Record<string, unknown>[]>([]);
  useEffect(() => { contentApi.getVirtualGames().then((data) => setGames(data as unknown as Record<string, unknown>[])).catch(() => {}); }, []);

  return (
    <div className="grid md:grid-cols-2 gap-4">
      {games.map((g) => (
        <div key={String(g.id)} className="bg-bestbet-dark-secondary rounded-xl p-4 border border-bestbet-gray">
          <h3 className="font-bold">{String(g.name)}</h3>
          <p className="text-xs text-bestbet-gray-muted capitalize mt-1">{String(g.type).replace(/_/g, " ")}</p>
          <Badge variant="success" className="mt-2">Active</Badge>
        </div>
      ))}
    </div>
  );
}

export function AdminSettingsSection() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [momoNumber, setMomoNumber] = useState("0203907314");
  const [momoRecipient, setMomoRecipient] = useState("RAHAMATU NUHU");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    contentApi.getSettings().then((data) => {
      setSettings(data);
      if (data.momo_number) setMomoNumber(data.momo_number);
      if (data.momo_recipient_name) setMomoRecipient(data.momo_recipient_name);
    }).catch(() => {});
  }, []);

  const saveMomoSettings = async () => {
    setSaving(true);
    setMessage("");
    try {
      await contentApi.updateSettings({
        momo_number: momoNumber.trim(),
        momo_recipient_name: momoRecipient.trim(),
      });
      setSettings((prev) => ({
        ...prev,
        momo_number: momoNumber.trim(),
        momo_recipient_name: momoRecipient.trim(),
      }));
      setMessage("Mobile Money settings saved.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-lg">
      <div className="card-premium p-5 space-y-4">
        <h3 className="text-sm font-bold font-display text-bestbet-yellow">Mobile Money Deposits</h3>
        <Input label="Phone Number" value={momoNumber} onChange={(e) => setMomoNumber(e.target.value)} />
        <Input label="Recipient Name" value={momoRecipient} onChange={(e) => setMomoRecipient(e.target.value)} />
        <Button variant="primary" size="sm" loading={saving} onClick={saveMomoSettings}>
          Save MoMo Settings
        </Button>
        {message && <p className="text-sm text-bestbet-gray-muted">{message}</p>}
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-bold text-bestbet-gray-muted uppercase tracking-wider">All Settings</h3>
        {Object.entries(settings).map(([key, value]) => (
          <div key={key} className="flex justify-between p-3 bg-bestbet-dark-secondary rounded-lg border border-bestbet-gray gap-4">
            <span className="text-sm text-bestbet-gray-muted shrink-0">{key}</span>
            <span className="text-sm font-medium text-right break-all">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function useAdminStats() {
  const [stats, setStats] = useState<AdminStatsApi | null>(null);
  useEffect(() => {
    adminApi.getStats().then(setStats).catch(() => {});
  }, []);
  return stats;
}
