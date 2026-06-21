"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Save, X, Shield } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { adminApi, type AdminAccountApi } from "@/lib/api";
import { useToast } from "@/context/ToastContext";
import { useAuth } from "@/context/AuthContext";

interface AdminForm {
  name: string;
  email: string;
  password: string;
  role: "super_admin" | "sub_admin";
  status: "active" | "suspended";
}

const emptyForm = (): AdminForm => ({
  name: "",
  email: "",
  password: "",
  role: "sub_admin",
  status: "active",
});

export function AdminAdminsSection() {
  const toast = useToast();
  const { user } = useAuth();
  const [admins, setAdmins] = useState<AdminAccountApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<AdminForm>(emptyForm);

  const load = useCallback(() => {
    setLoading(true);
    setLoadError("");
    adminApi
      .getAdmins()
      .then((data) => setAdmins(Array.isArray(data) ? data : []))
      .catch((err) => {
        const message = err instanceof Error ? err.message : "Failed to load admins";
        setLoadError(message);
        toast.error(message);
      })
      .finally(() => setLoading(false));
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm());
    setShowForm(true);
  };

  const openEdit = (admin: AdminAccountApi) => {
    setEditingId(admin.id);
    setForm({
      name: admin.name,
      email: admin.email,
      password: "",
      role: admin.role,
      status: admin.status === "suspended" ? "suspended" : "active",
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm());
  };

  const saveAdmin = async () => {
    if (!form.name.trim() || !form.email.trim()) {
      toast.error("Name and email are required");
      return;
    }
    if (!editingId && !form.password) {
      toast.error("Password is required for new admins");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        role: form.role,
        status: form.status,
        ...(form.password ? { password: form.password } : {}),
      };

      if (editingId) {
        const updated = await adminApi.updateAdmin(editingId, payload);
        setAdmins((prev) => prev.map((a) => (a.id === editingId ? updated : a)));
        toast.success("Admin updated successfully");
      } else {
        const created = await adminApi.createAdmin(payload);
        setAdmins((prev) => [created, ...prev]);
        toast.success("Admin created successfully");
      }
      closeForm();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save admin");
    } finally {
      setSaving(false);
    }
  };

  const removeAdmin = async (admin: AdminAccountApi) => {
    if (!confirm(`Remove admin access for ${admin.name}?`)) return;
    try {
      await adminApi.deleteAdmin(admin.id);
      setAdmins((prev) => prev.filter((a) => a.id !== admin.id));
      if (editingId === admin.id) closeForm();
      toast.success("Admin removed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete admin");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-bestbet-yellow flex items-center gap-2">
            <Shield size={20} /> Admin Management
          </h2>
          <p className="text-sm text-bestbet-gray-muted">Add, edit, and remove admin accounts.</p>
        </div>
        <Button variant="primary" size="sm" onClick={openCreate}>
          <Plus size={16} className="mr-1" /> Add Admin
        </Button>
      </div>

      {showForm && (
        <div className="card-premium p-5 space-y-4 border border-bestbet-yellow/20">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-bestbet-yellow">
              {editingId ? "Edit Admin" : "Add Admin"}
            </h3>
            <button onClick={closeForm} className="p-1.5 rounded-lg hover:bg-white/5" aria-label="Close">
              <X size={18} />
            </button>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <Input label="Full Name" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
            <Input label="Email" type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
            <Input
              label={editingId ? "New Password (optional)" : "Password"}
              type="password"
              value={form.password}
              onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
            />
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-bestbet-gray-muted">Role</span>
              <select
                value={form.role}
                onChange={(e) => setForm((p) => ({ ...p, role: e.target.value as AdminForm["role"] }))}
                className="w-full rounded-lg bg-bestbet-gray/80 border border-bestbet-yellow/10 px-3 py-2.5 text-sm outline-none focus:border-bestbet-yellow/40"
              >
                <option value="sub_admin">Sub Admin</option>
                <option value="super_admin">Super Admin</option>
              </select>
            </label>
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-bestbet-gray-muted">Status</span>
              <select
                value={form.status}
                onChange={(e) => setForm((p) => ({ ...p, status: e.target.value as AdminForm["status"] }))}
                className="w-full rounded-lg bg-bestbet-gray/80 border border-bestbet-yellow/10 px-3 py-2.5 text-sm outline-none focus:border-bestbet-yellow/40"
              >
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
              </select>
            </label>
          </div>
          <div className="flex gap-2">
            <Button variant="primary" size="sm" loading={saving} onClick={saveAdmin}>
              <Save size={14} className="mr-1" /> {editingId ? "Update Admin" : "Create Admin"}
            </Button>
            <Button variant="outline" size="sm" onClick={closeForm}>Cancel</Button>
          </div>
        </div>
      )}

      {loadError && !loading && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300 flex items-center justify-between gap-3">
          <span>{loadError}</span>
          <Button size="sm" variant="outline" onClick={load}>Retry</Button>
        </div>
      )}

      {loading ? (
        <p className="text-bestbet-gray-muted">Loading admins...</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-bestbet-yellow/10">
          <table className="table-premium">
            <thead>
              <tr>
                <th>Admin</th>
                <th>Role</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {admins.map((admin) => (
                <tr key={admin.id}>
                  <td>
                    <p className="font-medium">{admin.name}</p>
                    <p className="text-xs text-bestbet-gray-muted">{admin.email}</p>
                  </td>
                  <td>
                    <Badge variant={admin.role === "super_admin" ? "warning" : "default"}>
                      {admin.role === "super_admin" ? "Super Admin" : "Sub Admin"}
                    </Badge>
                  </td>
                  <td>
                    <Badge variant={admin.status === "active" ? "success" : "danger"}>{admin.status}</Badge>
                  </td>
                  <td className="text-xs text-bestbet-gray-muted">
                    {admin.createdAt ? new Date(admin.createdAt).toLocaleDateString() : "—"}
                  </td>
                  <td className="flex gap-1">
                    <Button size="sm" variant="outline" onClick={() => openEdit(admin)}>
                      <Pencil size={14} />
                    </Button>
                    {admin.userId !== user?.id && (
                      <Button size="sm" variant="danger" onClick={() => removeAdmin(admin)}>
                        <Trash2 size={14} />
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {admins.length === 0 && (
            <p className="text-center text-bestbet-gray-muted py-8">No admin accounts found</p>
          )}
        </div>
      )}
    </div>
  );
}
