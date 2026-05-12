"use client";

import { useState, useEffect, useCallback } from "react";
import { Users, UserPlus, Pencil, Trash2, X, Check, ShieldCheck, UserRound, Ban, Globe } from "lucide-react";

const ROLE_LABELS = { admin: "Admin", employee: "Employee", expatriate_admin: "Expat Admin" };

const emptyForm = { name: "", email: "", password: "", role: "employee" };

export default function UserManagement({ currentUserId }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // "add" | "edit" | "delete"
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showDeleted, setShowDeleted] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users");
      const data = await res.json();
      setUsers(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const visibleUsers = showDeleted ? users : users.filter(u => !u.deletedAt);

  function openAdd() {
    setForm(emptyForm);
    setError("");
    setModal("add");
  }

  function openEdit(user) {
    setSelected(user);
    setForm({ name: user.name, email: user.email, password: "", role: user.role });
    setError("");
    setModal("edit");
  }

  function openDelete(user) {
    setSelected(user);
    setError("");
    setModal("delete");
  }

  function closeModal() {
    setModal(null);
    setSelected(null);
    setError("");
  }

  async function handleAdd(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Gagal menambah user"); return; }
      await fetchUsers();
      closeModal();
    } finally {
      setSaving(false);
    }
  }

  async function handleEdit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const body = { name: form.name, email: form.email, role: form.role };
    if (form.password) body.password = form.password;
    try {
      const res = await fetch(`/api/admin/users/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Gagal mengubah user"); return; }
      await fetchUsers();
      closeModal();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/users/${selected.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Gagal menghapus user"); return; }
      await fetchUsers();
      closeModal();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Users size={22} className="text-orange-700" />
          <h1 className="text-xl font-bold text-orange-950">Kelola User</h1>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showDeleted}
              onChange={e => setShowDeleted(e.target.checked)}
              className="rounded"
            />
            Tampilkan user nonaktif
          </label>
          <button
            onClick={openAdd}
            className="flex items-center gap-1.5 bg-orange-700 hover:bg-orange-800 text-white text-sm px-4 py-2 rounded-lg transition"
          >
            <UserPlus size={15} />
            Tambah User
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Memuat data...</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-orange-50 text-orange-900 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Nama</th>
                <th className="text-left px-4 py-3 font-semibold">Email</th>
                <th className="text-left px-4 py-3 font-semibold">Role</th>
                <th className="text-left px-4 py-3 font-semibold">Status</th>
                <th className="text-left px-4 py-3 font-semibold">Terdaftar</th>
                <th className="text-center px-4 py-3 font-semibold">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {visibleUsers.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-gray-400">Belum ada user</td>
                </tr>
              )}
              {visibleUsers.map(user => (
                <tr
                  key={user.id}
                  className={`transition ${user.deletedAt ? "bg-gray-50 text-gray-400" : "hover:bg-orange-50/40"}`}
                >
                  <td className="px-4 py-3 font-medium">
                    <div className="flex items-center gap-2">
                      {user.role === "admin"
                        ? <ShieldCheck size={15} className="text-orange-600 shrink-0" />
                        : user.role === "expatriate_admin"
                          ? <Globe size={15} className="text-blue-500 shrink-0" />
                          : <UserRound size={15} className="text-gray-400 shrink-0" />
                      }
                      {user.name}
                      {user.id === currentUserId && (
                        <span className="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded">Saya</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">{user.email}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      user.role === "admin"
                        ? "bg-orange-100 text-orange-800"
                        : user.role === "expatriate_admin"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-gray-100 text-gray-700"
                    }`}>
                      {ROLE_LABELS[user.role] ?? user.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {user.deletedAt ? (
                      <span className="flex items-center gap-1 text-xs text-red-500">
                        <Ban size={13} /> Nonaktif
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-green-600">
                        <Check size={13} /> Aktif
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-400">
                    {new Date(user.createdAt).toLocaleDateString("id-ID", {
                      day: "2-digit", month: "short", year: "numeric"
                    })}
                  </td>
                  <td className="px-4 py-3">
                    {!user.deletedAt && (
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => openEdit(user)}
                          title="Edit"
                          className="p-1.5 rounded-lg hover:bg-orange-100 text-orange-700 transition"
                        >
                          <Pencil size={15} />
                        </button>
                        {user.id !== currentUserId && (
                          <button
                            onClick={() => openDelete(user)}
                            title="Nonaktifkan"
                            className="p-1.5 rounded-lg hover:bg-red-100 text-red-500 transition"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Tambah / Edit */}
      {(modal === "add" || modal === "edit") && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-lg text-orange-950">
                {modal === "add" ? "Tambah User" : "Edit User"}
              </h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={modal === "add" ? handleAdd : handleEdit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nama</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                  placeholder="Nama lengkap"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                  placeholder="email@domain.com"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password {modal === "edit" && <span className="text-gray-400 font-normal">(kosongkan jika tidak diubah)</span>}
                </label>
                <input
                  type="password"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                  placeholder={modal === "add" ? "Password" : "Password baru (opsional)"}
                  required={modal === "add"}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select
                  value={form.role}
                  onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                >
                  <option value="employee">Employee</option>
                  <option value="admin">Admin</option>
                  <option value="expatriate_admin">Expat Admin</option>
                </select>
              </div>

              {error && <p className="text-sm text-red-500">{error}</p>}

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-2 text-sm hover:bg-gray-50 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-orange-700 hover:bg-orange-800 text-white rounded-lg py-2 text-sm transition disabled:opacity-60"
                >
                  {saving ? "Menyimpan..." : (modal === "add" ? "Tambah" : "Simpan")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Hapus */}
      {modal === "delete" && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-red-100 text-red-600 rounded-full p-2">
                <Trash2 size={20} />
              </div>
              <h2 className="font-bold text-lg text-gray-900">Nonaktifkan User?</h2>
            </div>
            <p className="text-sm text-gray-600 mb-1">
              User <span className="font-semibold">{selected.name}</span> akan dinonaktifkan.
            </p>
            <p className="text-xs text-gray-400 mb-5">
              Data user tidak dihapus — user hanya tidak bisa login. Aktivitas sebelumnya tetap tersimpan.
            </p>

            {error && <p className="text-sm text-red-500 mb-3">{error}</p>}

            <div className="flex gap-3">
              <button
                onClick={closeModal}
                className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-2 text-sm hover:bg-gray-50 transition"
              >
                Batal
              </button>
              <button
                onClick={handleDelete}
                disabled={saving}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-lg py-2 text-sm transition disabled:opacity-60"
              >
                {saving ? "Memproses..." : "Ya, Nonaktifkan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
