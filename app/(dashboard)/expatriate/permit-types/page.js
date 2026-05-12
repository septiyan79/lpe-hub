"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Globe, ArrowLeft, Plus, Pencil, Trash2, X, Save, GripVertical, Check } from "lucide-react";

const EMPTY_FORM = {
  name: "", description: "",
  forExpat: true, forFamily: true,
  hasExpiry: true, isEPO: false,
  order: 0,
};

function Toggle({ label, checked, onChange }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none">
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative w-9 h-5 rounded-full transition-colors ${checked ? "bg-orange-600" : "bg-gray-300"}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${checked ? "translate-x-4" : ""}`} />
      </button>
      <span className="text-sm text-gray-700">{label}</span>
    </label>
  );
}

export default function PermitTypesPage() {
  const router = useRouter();
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // "add" | type-object for edit
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function fetchTypes() {
    setLoading(true);
    try {
      const res = await fetch("/api/expatriate/permit-types");
      if (res.ok) setTypes(await res.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchTypes(); }, []);

  function openAdd() {
    setForm({ ...EMPTY_FORM, order: types.length });
    setError("");
    setModal("add");
  }

  function openEdit(t) {
    setForm({
      name: t.name, description: t.description ?? "",
      forExpat: t.forExpat, forFamily: t.forFamily,
      hasExpiry: t.hasExpiry, isEPO: t.isEPO,
      order: t.order,
    });
    setError("");
    setModal(t);
  }

  function closeModal() { setModal(null); setError(""); }

  function setF(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const isEdit = modal !== "add";
    const url = isEdit ? `/api/expatriate/permit-types/${modal.id}` : "/api/expatriate/permit-types";
    const method = isEdit ? "PATCH" : "POST";
    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          order: Number(form.order),
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Gagal menyimpan"); return; }
      closeModal();
      fetchTypes();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(t) {
    if (!confirm(`Hapus jenis izin "${t.name}"? Ini tidak bisa dilakukan jika sudah dipakai permit.`)) return;
    const res = await fetch(`/api/expatriate/permit-types/${t.id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) { alert(data.error || "Gagal menghapus"); return; }
    fetchTypes();
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.push("/expatriate")}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition">
          <ArrowLeft size={18} />
        </button>
        <Globe size={20} className="text-orange-700" />
        <div>
          <h1 className="text-lg font-bold text-orange-950">Jenis Izin Expatriate</h1>
          <p className="text-sm text-gray-500">Kelola tipe-tipe perizinan yang tersedia</p>
        </div>
        <button
          onClick={openAdd}
          className="ml-auto flex items-center gap-1.5 bg-orange-700 hover:bg-orange-800 text-white text-sm px-4 py-2 rounded-lg transition"
        >
          <Plus size={15} /> Tambah Jenis
        </button>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">Memuat data...</div>
      ) : types.length === 0 ? (
        <div className="text-center py-16 text-gray-400">Belum ada jenis izin. Tambahkan yang pertama.</div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-orange-50 border-b border-gray-200">
              <tr>
                <th className="w-8 px-4 py-3" />
                <th className="text-left px-4 py-3 text-xs font-semibold text-orange-900">Nama</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-orange-900 hidden md:table-cell">Deskripsi</th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-orange-900">Expat</th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-orange-900">Keluarga</th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-orange-900">Has Expiry</th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-orange-900">EPO</th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-orange-900">Urutan</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {types.map(t => (
                <tr key={t.id} className="hover:bg-gray-50 transition group">
                  <td className="px-4 py-3 text-gray-300">
                    <GripVertical size={14} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-800">{t.name}</span>
                      {t.isEPO && (
                        <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-medium">EPO</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs hidden md:table-cell max-w-[180px] truncate" title={t.description ?? ""}>
                    {t.description || <span className="text-gray-300 italic">—</span>}
                  </td>
                  <td className="px-3 py-3 text-center">
                    {t.forExpat ? <Check size={14} className="mx-auto text-green-600" /> : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-3 py-3 text-center">
                    {t.forFamily ? <Check size={14} className="mx-auto text-green-600" /> : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-3 py-3 text-center">
                    {t.hasExpiry ? <Check size={14} className="mx-auto text-green-600" /> : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-3 py-3 text-center">
                    {t.isEPO ? <Check size={14} className="mx-auto text-red-500" /> : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-3 py-3 text-center text-gray-500">{t.order}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition">
                      <button onClick={() => openEdit(t)}
                        className="p-1.5 rounded hover:bg-orange-100 text-orange-600">
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => handleDelete(t)}
                        className="p-1.5 rounded hover:bg-red-100 text-red-500">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-orange-950">
                {modal === "add" ? "Tambah Jenis Izin" : `Edit: ${modal.name}`}
              </h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nama <span className="text-red-500">*</span></label>
                <input
                  value={form.name}
                  onChange={e => setF("name", e.target.value)}
                  required
                  placeholder="contoh: RPTKA"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi <span className="text-gray-400 font-normal">(opsional)</span></label>
                <textarea
                  value={form.description}
                  onChange={e => setF("description", e.target.value)}
                  rows={2}
                  placeholder="Keterangan singkat tentang jenis izin ini"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>

              <div className="border rounded-xl p-4 space-y-3 bg-gray-50">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Pengaturan</p>
                <Toggle label="Berlaku untuk Expatriate" checked={form.forExpat} onChange={v => setF("forExpat", v)} />
                <Toggle label="Berlaku untuk Keluarga" checked={form.forFamily} onChange={v => setF("forFamily", v)} />
                <Toggle label="Memiliki tanggal kadaluarsa (hasExpiry)" checked={form.hasExpiry} onChange={v => setF("hasExpiry", v)} />
                <div className="border-t pt-3">
                  <Toggle label="Ini adalah EPO (Exit Permit Only) — satu per orang" checked={form.isEPO} onChange={v => setF("isEPO", v)} />
                  {form.isEPO && (
                    <p className="text-xs text-red-600 mt-1 ml-11">API akan menolak jika orang ini sudah punya permit EPO</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Urutan tampil</label>
                <input
                  type="number"
                  value={form.order}
                  onChange={e => setF("order", e.target.value)}
                  min={0}
                  className="w-32 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
                <p className="text-xs text-gray-400 mt-1">Angka kecil tampil lebih dulu</p>
              </div>

              {error && <p className="text-sm text-red-500">{error}</p>}

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={closeModal}
                  className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-2 text-sm hover:bg-gray-50 transition">
                  Batal
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 bg-orange-700 hover:bg-orange-800 text-white rounded-lg py-2 text-sm transition disabled:opacity-60">
                  {saving ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
