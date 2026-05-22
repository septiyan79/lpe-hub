"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Globe, ArrowLeft, Plus, Pencil, Trash2, X, Check,
} from "lucide-react";

const EMPTY_FORM = {
  name: "", description: "",
  forExpat: true, forFamily: true,
  hasExpiry: true, isOneTime: false, isEPO: false,
  linkedToWorkPermit: false,
  order: 0,
};

function Toggle({ label, desc, checked, onChange }) {
  return (
    <label className="flex items-start gap-3 cursor-pointer select-none">
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative w-9 h-5 rounded-full transition-colors shrink-0 mt-0.5 ${checked ? "bg-orange-600" : "bg-gray-300"}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${checked ? "translate-x-4" : ""}`} />
      </button>
      <div>
        <p className="text-sm text-gray-800 font-medium leading-snug">{label}</p>
        {desc && <p className="text-xs text-gray-400 mt-0.5">{desc}</p>}
      </div>
    </label>
  );
}


export default function PermitTypesPage() {
  const router = useRouter();
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
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

  function openAdd() { setForm({ ...EMPTY_FORM, order: types.length }); setError(""); setModal("add"); }
  function openEdit(t) {
    setForm({
      name: t.name, description: t.description ?? "",
      forExpat: t.forExpat, forFamily: t.forFamily,
      hasExpiry: t.hasExpiry, isOneTime: t.isOneTime, isEPO: t.isEPO,
      linkedToWorkPermit: t.linkedToWorkPermit,
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
        body: JSON.stringify({ ...form, order: Number(form.order) }),
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
    if (!confirm(`Hapus jenis izin "${t.name}"?\nTidak bisa dilakukan jika sudah dipakai permit.`)) return;
    const res = await fetch(`/api/expatriate/permit-types/${t.id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) { alert(data.error || "Gagal menghapus"); return; }
    fetchTypes();
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">

      {/* ── Sticky Header ── */}
      <div className="sticky top-[52px] z-30 bg-orange-50 -mt-14 pt-14 pb-3 flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/expatriate")}
            className="p-1.5 rounded-lg hover:bg-orange-100 text-orange-700 transition">
            <ArrowLeft size={18} />
          </button>
          <Globe size={20} className="text-orange-700" />
          <div>
            <h1 className="text-lg font-bold text-orange-950 leading-tight">Jenis Izin Expatriate</h1>
            <p className="text-xs text-gray-500">Kelola tipe-tipe perizinan yang tersedia</p>
          </div>
          {!loading && (
            <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">
              {types.length} jenis
            </span>
          )}
        </div>
        <button onClick={openAdd}
          className="flex items-center gap-1.5 bg-orange-700 hover:bg-orange-800 text-white text-sm px-4 py-2 rounded-lg transition">
          <Plus size={15} /> Tambah Jenis
        </button>
      </div>

      {/* ── Content ── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-400">
          <div className="w-8 h-8 border-2 border-orange-300 border-t-orange-600 rounded-full animate-spin" />
          <span className="text-sm">Memuat data...</span>
        </div>
      ) : types.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-400">
          <Globe size={40} className="text-gray-200" />
          <p className="text-sm">Belum ada jenis izin. Tambahkan yang pertama.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-orange-950 text-orange-200 text-[10px] font-bold uppercase tracking-widest">
                <th className="w-10 px-4 py-2.5 text-center">#</th>
                <th className="px-4 py-2.5 text-left border-l border-orange-800">Nama</th>
                <th className="px-4 py-2.5 text-left border-l border-orange-800 hidden md:table-cell">Deskripsi</th>
                <th className="px-4 py-2.5 text-center border-l border-orange-800">Expat</th>
                <th className="px-4 py-2.5 text-center border-l border-orange-800">Keluarga</th>
                <th className="px-4 py-2.5 text-center border-l border-orange-800">Expiry</th>
                <th className="px-4 py-2.5 text-center border-l border-orange-800">Sekali Terbit</th>
                <th className="px-4 py-2.5 text-center border-l border-orange-800">Izin Kerja</th>
                <th className="px-4 py-2.5 text-center border-l border-orange-800">EPO</th>
                <th className="px-4 py-2.5 text-center border-l border-orange-800">Urutan</th>
                <th className="px-4 py-2.5 border-l border-orange-800" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {types.map((t, i) => (
                <tr key={t.id} className="bg-white hover:bg-orange-50/40 transition-colors group">
                  <td className="px-4 py-3.5 text-center text-xs text-gray-400 font-medium">{i + 1}</td>

                  <td className="px-4 py-3.5 border-l border-gray-100">
                    <div className="flex items-center gap-2">
                      {t.isEPO && (
                        <span className="text-[10px] font-bold bg-red-100 text-red-600 px-1.5 py-0.5 rounded shrink-0">EPO</span>
                      )}
                      {t.linkedToWorkPermit && !t.isEPO && (
                        <span className="text-[10px] font-bold bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded shrink-0">IK</span>
                      )}
                      <span className="font-semibold text-gray-800">{t.name}</span>
                    </div>
                  </td>

                  <td className="px-4 py-3.5 border-l border-gray-100 hidden md:table-cell max-w-[220px]">
                    <span className="text-xs text-gray-400 truncate block" title={t.description ?? ""}>
                      {t.description || <span className="italic text-gray-300">—</span>}
                    </span>
                  </td>

                  <td className="px-4 py-3.5 border-l border-gray-100 text-center">
                    {t.forExpat
                      ? <span className="inline-flex items-center justify-center w-5 h-5 bg-green-100 rounded-full"><Check size={11} className="text-green-600" /></span>
                      : <span className="text-gray-200">—</span>}
                  </td>
                  <td className="px-4 py-3.5 border-l border-gray-100 text-center">
                    {t.forFamily
                      ? <span className="inline-flex items-center justify-center w-5 h-5 bg-green-100 rounded-full"><Check size={11} className="text-green-600" /></span>
                      : <span className="text-gray-200">—</span>}
                  </td>
                  <td className="px-4 py-3.5 border-l border-gray-100 text-center">
                    {t.hasExpiry
                      ? <span className="inline-flex items-center justify-center w-5 h-5 bg-blue-100 rounded-full"><Check size={11} className="text-blue-500" /></span>
                      : <span className="text-gray-200">—</span>}
                  </td>
                  <td className="px-4 py-3.5 border-l border-gray-100 text-center">
                    {t.isOneTime
                      ? <span className="inline-flex items-center justify-center w-5 h-5 bg-gray-100 rounded-full"><Check size={11} className="text-gray-500" /></span>
                      : <span className="text-gray-200">—</span>}
                  </td>
                  <td className="px-4 py-3.5 border-l border-gray-100 text-center">
                    {t.linkedToWorkPermit
                      ? <span className="inline-flex items-center justify-center w-5 h-5 bg-orange-100 rounded-full"><Check size={11} className="text-orange-500" /></span>
                      : <span className="text-gray-200">—</span>}
                  </td>
                  <td className="px-4 py-3.5 border-l border-gray-100 text-center">
                    {t.isEPO
                      ? <span className="inline-flex items-center justify-center w-5 h-5 bg-red-100 rounded-full"><Check size={11} className="text-red-500" /></span>
                      : <span className="text-gray-200">—</span>}
                  </td>

                  <td className="px-4 py-3.5 border-l border-gray-100 text-center">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 text-gray-500 text-xs font-semibold">
                      {t.order}
                    </span>
                  </td>

                  <td className="px-4 py-3.5 border-l border-gray-100">
                    <div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEdit(t)}
                        className="p-1.5 rounded-lg hover:bg-orange-100 text-orange-500 transition-colors">
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => handleDelete(t)}
                        className="p-1.5 rounded-lg hover:bg-red-100 text-red-400 transition-colors">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 border-t-2 border-gray-200">
                <td colSpan={11} className="px-4 py-2.5 text-xs text-gray-400 font-medium">
                  Total: {types.length} jenis izin
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* ── Modal ── */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 my-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-orange-950">
                {modal === "add" ? "Tambah Jenis Izin" : `Edit: ${modal.name}`}
              </h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nama <span className="text-red-500">*</span>
                </label>
                <input
                  value={form.name}
                  onChange={e => setF("name", e.target.value)}
                  required
                  placeholder="contoh: Pengesahan RPTKA"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Deskripsi <span className="text-gray-400 font-normal">(opsional)</span>
                </label>
                <textarea
                  value={form.description}
                  onChange={e => setF("description", e.target.value)}
                  rows={2}
                  placeholder="Keterangan singkat tentang jenis izin ini"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>

              <div className="rounded-xl border border-gray-200 divide-y divide-gray-100 overflow-hidden">
                <div className="px-4 py-2.5 bg-gray-50">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Pengaturan</p>
                </div>
                <div className="px-4 py-3">
                  <Toggle label="Berlaku untuk Expatriate" checked={form.forExpat} onChange={v => setF("forExpat", v)} />
                </div>
                <div className="px-4 py-3">
                  <Toggle label="Berlaku untuk Keluarga" checked={form.forFamily} onChange={v => setF("forFamily", v)} />
                </div>
                <div className="px-4 py-3">
                  <Toggle label="Memiliki tanggal kadaluarsa" desc="Jika aktif, field expiry date wajib diisi" checked={form.hasExpiry} onChange={v => setF("hasExpiry", v)} />
                </div>
                <div className="px-4 py-3">
                  <Toggle label="Sekali terbit (tidak perlu perpanjangan)" desc="eVisa, dll — expiry ditampilkan tapi tidak memicu status urgency saat expired" checked={form.isOneTime} onChange={v => setF("isOneTime", v)} />
                </div>
                <div className="px-4 py-3">
                  <Toggle label="Masa berlaku mengikuti izin kerja" desc="Pengesahan RPTKA — ditampilkan sebagai nomor saja di tabel" checked={form.linkedToWorkPermit} onChange={v => setF("linkedToWorkPermit", v)} />
                </div>
                <div className="px-4 py-3 bg-red-50/50">
                  <Toggle label="EPO (Exit Permit Only)" desc="Satu per orang — menandai expat tidak aktif" checked={form.isEPO} onChange={v => setF("isEPO", v)} />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Urutan tampil</label>
                <input
                  type="number"
                  value={form.order}
                  onChange={e => setF("order", e.target.value)}
                  min={0}
                  className="w-28 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
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

