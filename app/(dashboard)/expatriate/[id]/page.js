"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import {
  Globe, ArrowLeft, Pencil, Trash2, X, Plus,
  User, FileText, Users, ChevronDown, ChevronUp, Save,
} from "lucide-react";

// ─── helpers ─────────────────────────────────────────────────────────────────

function fmtDate(d) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

function toInput(d) {
  if (!d) return "";
  return new Date(d).toISOString().slice(0, 10);
}

function expiryColor(date) {
  if (!date) return "bg-gray-100 text-gray-500";
  const diff = (new Date(date) - new Date()) / (1000 * 60 * 60 * 24);
  if (diff < 0) return "bg-red-100 text-red-700";
  if (diff <= 30) return "bg-orange-100 text-orange-700";
  if (diff <= 90) return "bg-yellow-100 text-yellow-700";
  return "bg-green-100 text-green-700";
}

function Field({ label, value, onChange, type = "text", editing, textarea }) {
  if (!editing) return (
    <div>
      <p className="text-xs text-gray-400 mb-0.5">{label}</p>
      <p className="text-sm text-gray-800 font-medium">{value || "-"}</p>
    </div>
  );
  const cls = "w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400";
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-0.5">{label}</label>
      {textarea
        ? <textarea value={value} onChange={e => onChange(e.target.value)} rows={2} className={cls} />
        : <input type={type} value={value} onChange={e => onChange(e.target.value)} className={cls} />
      }
    </div>
  );
}

const EMPTY_PERMIT = { permitTypeId: "", number: "", issuedDate: "", expiryDate: "" };
const EMPTY_FAMILY = {
  name: "", gender: "Male", birthPlace: "", birthDate: "",
  passportNo: "", passportIssuedDate: "", passportExpiryDate: "",
  familyStatus: "Wife", arrivalDate: "",
};

// ─── Permit Section ───────────────────────────────────────────────────────────

function PermitSection({ permits, expatId, familyId, permitTypes, onRefresh }) {
  const [modal, setModal] = useState(null); // "add" | permit-object for edit
  const [form, setForm] = useState(EMPTY_PERMIT);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const baseUrl = familyId
    ? `/api/expatriate/${expatId}/family/${familyId}/permits`
    : `/api/expatriate/${expatId}/permits`;

  function openAdd() {
    setForm({ ...EMPTY_PERMIT, permitTypeId: permitTypes[0]?.id || "" });
    setError("");
    setModal("add");
  }

  function openEdit(p) {
    setForm({
      permitTypeId: p.permitTypeId,
      number: p.number,
      issuedDate: toInput(p.issuedDate),
      expiryDate: toInput(p.expiryDate),
    });
    setError("");
    setModal(p);
  }

  function closeModal() { setModal(null); setError(""); }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const isEdit = modal !== "add";
    const url = isEdit ? `${baseUrl}/${modal.id}` : baseUrl;
    const method = isEdit ? "PATCH" : "POST";
    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Gagal menyimpan"); return; }
      closeModal();
      onRefresh();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(p) {
    if (!confirm(`Hapus permit ${p.permitType?.name ?? ""} — ${p.number}?`)) return;
    await fetch(`${baseUrl}/${p.id}`, { method: "DELETE" });
    onRefresh();
  }

  function setF(k, v) { setForm(f => ({ ...f, [k]: v })); }

  const selectedType = permitTypes.find(t => t.id === form.permitTypeId);
  const showExpiry = selectedType?.hasExpiry ?? true;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Perizinan</p>
        <button onClick={openAdd}
          className="flex items-center gap-1 text-xs text-orange-700 hover:text-orange-900 font-medium">
          <Plus size={13} /> Tambah
        </button>
      </div>

      {permits.length === 0 ? (
        <p className="text-sm text-gray-400 italic">Belum ada data perizinan</p>
      ) : (
        <div className="space-y-1.5">
          {permits.map(p => {
            const isEPO = p.permitType?.isEPO;
            return (
              <div key={p.id}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 group ${isEPO ? "bg-red-50 border border-red-100" : "bg-gray-50"}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded border ${isEPO ? "bg-red-100 border-red-200 text-red-700" : "bg-white border-gray-200 text-gray-700"}`}>
                      {p.permitType?.name ?? "—"}
                    </span>
                    <span className="text-sm text-gray-800">{p.number}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500">
                    <span>Terbit: {fmtDate(p.issuedDate)}</span>
                    {p.expiryDate && (
                      <span className={`px-1.5 py-0.5 rounded-full font-medium ${expiryColor(p.expiryDate)}`}>
                        Exp: {fmtDate(p.expiryDate)}
                      </span>
                    )}
                    {!p.expiryDate && !p.permitType?.hasExpiry && (
                      <span className="text-gray-400 italic">sekali terbit</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                  <button onClick={() => openEdit(p)} className="p-1 rounded hover:bg-orange-100 text-orange-600">
                    <Pencil size={13} />
                  </button>
                  <button onClick={() => handleDelete(p)} className="p-1 rounded hover:bg-red-100 text-red-500">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-orange-950">{modal === "add" ? "Tambah Perizinan" : "Edit Perizinan"}</h3>
              <button onClick={closeModal}><X size={18} className="text-gray-400" /></button>
            </div>

            {permitTypes.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-sm text-gray-500 mb-3">Belum ada jenis izin yang tersedia.</p>
                <a href="/expatriate/permit-types"
                  className="inline-block text-sm bg-orange-700 hover:bg-orange-800 text-white px-4 py-2 rounded-lg transition">
                  Buat Jenis Izin dulu →
                </a>
              </div>
            ) : (
            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Jenis</label>
                <select value={form.permitTypeId} onChange={e => setF("permitTypeId", e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                  required>
                  <option value="">— Pilih jenis izin —</option>
                  {permitTypes.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name}{t.isEPO ? " (EPO)" : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nomor</label>
                <input value={form.number} onChange={e => setF("number", e.target.value)} required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Issued Date</label>
                  <input type="date" value={form.issuedDate} onChange={e => setF("issuedDate", e.target.value)} required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Expiry Date {!showExpiry && <span className="text-gray-400 font-normal text-xs">(opsional)</span>}
                  </label>
                  <input type="date" value={form.expiryDate} onChange={e => setF("expiryDate", e.target.value)}
                    required={showExpiry}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                </div>
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
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Family Member Card ───────────────────────────────────────────────────────

function FamilyCard({ member, expatId, familyPermitTypes, onRefresh, onDelete }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  const memberHasEPO = member.permits?.some(p => p.permitType?.isEPO);

  function startEdit() {
    setForm({
      name: member.name, gender: member.gender, birthPlace: member.birthPlace,
      birthDate: toInput(member.birthDate), passportNo: member.passportNo,
      passportIssuedDate: toInput(member.passportIssuedDate),
      passportExpiryDate: toInput(member.passportExpiryDate),
      familyStatus: member.familyStatus, arrivalDate: toInput(member.arrivalDate),
    });
    setEditing(true);
  }

  async function saveEdit() {
    setSaving(true);
    try {
      await fetch(`/api/expatriate/${expatId}/family/${member.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      setEditing(false);
      onRefresh();
    } finally {
      setSaving(false);
    }
  }

  function setF(k, v) { setForm(f => ({ ...f, [k]: v })); }

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition"
      >
        <div className="flex items-center gap-3">
          <User size={16} className="text-gray-400 shrink-0" />
          <div className="text-left">
            <p className="text-sm font-semibold text-gray-800">{member.name}</p>
            <p className="text-xs text-gray-500">{member.familyStatus} · {member.gender}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {memberHasEPO && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">EPO</span>}
          {open ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
        </div>
      </button>

      {open && (
        <div className="px-4 py-4 space-y-5">
          {/* Info */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Data Pribadi</p>
              <div className="flex gap-2">
                {editing ? (
                  <>
                    <button onClick={() => setEditing(false)} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"><X size={13} /> Batal</button>
                    <button onClick={saveEdit} disabled={saving} className="flex items-center gap-1 text-xs text-orange-700 hover:text-orange-900 font-medium disabled:opacity-60">
                      <Save size={13} /> {saving ? "..." : "Simpan"}
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={startEdit} className="flex items-center gap-1 text-xs text-orange-700 hover:text-orange-900">
                      <Pencil size={13} /> Edit
                    </button>
                    <button onClick={() => onDelete(member)} className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700">
                      <Trash2 size={13} /> Hapus
                    </button>
                  </>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {editing ? (
                <>
                  <Field label="Nama" value={form.name} onChange={v => setF("name", v)} editing />
                  <div>
                    <label className="block text-xs text-gray-500 mb-0.5">Status Keluarga</label>
                    <select value={form.familyStatus} onChange={e => setF("familyStatus", e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
                      {["Wife", "Husband", "Child", "Other"].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-0.5">Gender</label>
                    <select value={form.gender} onChange={e => setF("gender", e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
                      <option>Male</option><option>Female</option>
                    </select>
                  </div>
                  <Field label="Tempat Lahir" value={form.birthPlace} onChange={v => setF("birthPlace", v)} editing />
                  <Field label="Tanggal Lahir" value={form.birthDate} onChange={v => setF("birthDate", v)} type="date" editing />
                  <Field label="Arrival Date" value={form.arrivalDate} onChange={v => setF("arrivalDate", v)} type="date" editing />
                  <Field label="Nomor Passport" value={form.passportNo} onChange={v => setF("passportNo", v)} editing />
                  <Field label="Passport Issued" value={form.passportIssuedDate} onChange={v => setF("passportIssuedDate", v)} type="date" editing />
                  <Field label="Passport Expiry" value={form.passportExpiryDate} onChange={v => setF("passportExpiryDate", v)} type="date" editing />
                </>
              ) : (
                <>
                  <Field label="Status Keluarga" value={member.familyStatus} />
                  <Field label="Gender" value={member.gender} />
                  <Field label="Tempat Lahir" value={member.birthPlace} />
                  <Field label="Tanggal Lahir" value={fmtDate(member.birthDate)} />
                  <Field label="Arrival Date" value={fmtDate(member.arrivalDate)} />
                  <Field label="Nomor Passport" value={member.passportNo} />
                  <Field label="Passport Issued" value={fmtDate(member.passportIssuedDate)} />
                  <Field label="Passport Expiry" value={fmtDate(member.passportExpiryDate)} />
                </>
              )}
            </div>
          </div>

          {/* Permits (includes EPO if any) */}
          <PermitSection
            permits={member.permits ?? []}
            expatId={expatId}
            familyId={member.id}
            permitTypes={familyPermitTypes}
            onRefresh={onRefresh}
          />
        </div>
      )}
    </div>
  );
}

// ─── Family Section ───────────────────────────────────────────────────────────

function FamilySection({ families, expatId, familyPermitTypes, onRefresh }) {
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FAMILY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function setF(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function handleAdd(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/expatriate/${expatId}/family`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Gagal menyimpan"); return; }
      setModal(false);
      onRefresh();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(member) {
    if (!confirm(`Hapus data ${member.name}? Semua perizinan keluarga ini juga akan dihapus.`)) return;
    await fetch(`/api/expatriate/${expatId}/family/${member.id}`, { method: "DELETE" });
    onRefresh();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Users size={16} className="text-orange-600" />
          <h3 className="font-semibold text-gray-800">Keluarga <span className="text-gray-400 font-normal text-sm">({families.length})</span></h3>
        </div>
        <button onClick={() => { setForm(EMPTY_FAMILY); setError(""); setModal(true); }}
          className="flex items-center gap-1.5 text-sm text-orange-700 hover:text-orange-900 font-medium">
          <Plus size={14} /> Tambah Anggota
        </button>
      </div>

      {families.length === 0
        ? <p className="text-sm text-gray-400 italic">Belum ada data keluarga</p>
        : <div className="space-y-2">
            {families.map(m => (
              <FamilyCard
                key={m.id}
                member={m}
                expatId={expatId}
                familyPermitTypes={familyPermitTypes}
                onRefresh={onRefresh}
                onDelete={handleDelete}
              />
            ))}
          </div>
      }

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 my-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-orange-950">Tambah Anggota Keluarga</h3>
              <button onClick={() => setModal(false)}><X size={18} className="text-gray-400" /></button>
            </div>
            <form onSubmit={handleAdd} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nama</label>
                  <input value={form.name} onChange={e => setF("name", e.target.value)} required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status Keluarga</label>
                  <select value={form.familyStatus} onChange={e => setF("familyStatus", e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
                    {["Wife", "Husband", "Child", "Other"].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                  <select value={form.gender} onChange={e => setF("gender", e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
                    <option value="Male">Male</option><option value="Female">Female</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tempat Lahir</label>
                  <input value={form.birthPlace} onChange={e => setF("birthPlace", e.target.value)} required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Lahir</label>
                  <input type="date" value={form.birthDate} onChange={e => setF("birthDate", e.target.value)} required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Arrival Date</label>
                  <input type="date" value={form.arrivalDate} onChange={e => setF("arrivalDate", e.target.value)} required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                </div>
                <div className="col-span-2 border-t pt-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Passport</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nomor Passport</label>
                  <input value={form.passportNo} onChange={e => setF("passportNo", e.target.value)} required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                </div>
                <div />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Issued Date</label>
                  <input type="date" value={form.passportIssuedDate} onChange={e => setF("passportIssuedDate", e.target.value)} required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>
                  <input type="date" value={form.passportExpiryDate} onChange={e => setF("passportExpiryDate", e.target.value)} required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                </div>
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setModal(false)}
                  className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-2 text-sm hover:bg-gray-50 transition">Batal</button>
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

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ExpatDetailPage({ params }) {
  const { id } = use(params);
  const router = useRouter();
  const [expat, setExpat] = useState(null);
  const [permitTypes, setPermitTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [delConfirm, setDelConfirm] = useState(false);

  async function fetchData() {
    const [expatRes, typesRes] = await Promise.all([
      fetch(`/api/expatriate/${id}`),
      fetch("/api/expatriate/permit-types"),
    ]);
    if (expatRes.ok) setExpat(await expatRes.json());
    if (typesRes.ok) setPermitTypes(await typesRes.json());
    setLoading(false);
  }

  useEffect(() => { fetchData(); }, [id]);

  function startEdit() {
    setForm({
      name: expat.name, birthPlace: expat.birthPlace, birthDate: toInput(expat.birthDate),
      gender: expat.gender, passportNo: expat.passportNo,
      passportIssuedDate: toInput(expat.passportIssuedDate),
      passportExpiryDate: toInput(expat.passportExpiryDate),
      position: expat.position, department: expat.department,
      presentAddress: expat.presentAddress, permanentAddress: expat.permanentAddress,
      arrivalDate: toInput(expat.arrivalDate),
      renewalNo: expat.renewalNo ?? "",
    });
    setEditing(true);
  }

  async function saveEdit() {
    setSaving(true);
    try {
      const body = { ...form, renewalNo: form.renewalNo !== "" ? Number(form.renewalNo) : null };
      const res = await fetch(`/api/expatriate/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) { setEditing(false); fetchData(); }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    await fetch(`/api/expatriate/${id}`, { method: "DELETE" });
    router.push("/expatriate");
  }

  function setF(k, v) { setForm(f => ({ ...f, [k]: v })); }

  const expatPermitTypes = permitTypes.filter(t => t.forExpat);
  const familyPermitTypes = permitTypes.filter(t => t.forFamily);

  if (loading) return <div className="text-center py-20 text-gray-400">Memuat data...</div>;
  if (!expat) return <div className="text-center py-20 text-gray-400">Data tidak ditemukan</div>;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      {/* Back + header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.push("/expatriate")}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition">
          <ArrowLeft size={18} />
        </button>
        <Globe size={20} className="text-orange-700" />
        <div>
          <h1 className="text-lg font-bold text-orange-950">{expat.name}</h1>
          <p className="text-sm text-gray-500">{expat.position} — {expat.department}</p>
        </div>
        <div className="ml-auto flex gap-2">
          {editing ? (
            <>
              <button onClick={() => setEditing(false)}
                className="flex items-center gap-1.5 border border-gray-300 text-gray-700 text-sm px-3 py-1.5 rounded-lg hover:bg-gray-50 transition">
                <X size={14} /> Batal
              </button>
              <button onClick={saveEdit} disabled={saving}
                className="flex items-center gap-1.5 bg-orange-700 hover:bg-orange-800 text-white text-sm px-3 py-1.5 rounded-lg transition disabled:opacity-60">
                <Save size={14} /> {saving ? "Menyimpan..." : "Simpan"}
              </button>
            </>
          ) : (
            <>
              <button onClick={startEdit}
                className="flex items-center gap-1.5 border border-gray-300 text-gray-700 text-sm px-3 py-1.5 rounded-lg hover:bg-gray-50 transition">
                <Pencil size={14} /> Edit
              </button>
              <button onClick={() => setDelConfirm(true)}
                className="flex items-center gap-1.5 border border-red-200 text-red-600 text-sm px-3 py-1.5 rounded-lg hover:bg-red-50 transition">
                <Trash2 size={14} /> Hapus
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Left col: personal info + permits */}
        <div className="col-span-2 space-y-6">
          {/* Personal Info */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <User size={16} className="text-orange-600" />
              <h2 className="font-semibold text-gray-800">Data Pribadi</h2>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Nama Lengkap" value={editing ? form.name : expat.name} onChange={v => setF("name", v)} editing={editing} />
              <Field label="Gender" value={editing ? form.gender : expat.gender} onChange={v => setF("gender", v)} editing={editing} />
              <Field label="Tempat Lahir" value={editing ? form.birthPlace : expat.birthPlace} onChange={v => setF("birthPlace", v)} editing={editing} />
              <Field label="Tanggal Lahir" value={editing ? form.birthDate : fmtDate(expat.birthDate)} onChange={v => setF("birthDate", v)} type="date" editing={editing} />
              <Field label="Jabatan" value={editing ? form.position : expat.position} onChange={v => setF("position", v)} editing={editing} />
              <Field label="Department" value={editing ? form.department : expat.department} onChange={v => setF("department", v)} editing={editing} />
              <Field label="Arrival Date" value={editing ? form.arrivalDate : fmtDate(expat.arrivalDate)} onChange={v => setF("arrivalDate", v)} type="date" editing={editing} />
              <div>
                {editing ? (
                  <>
                    <label className="block text-xs text-gray-500 mb-0.5">Perpanjangan ke- <span className="text-gray-400">(kosongkan jika pertama)</span></label>
                    <input
                      type="number" min="1"
                      value={form.renewalNo}
                      onChange={e => setF("renewalNo", e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                    />
                  </>
                ) : (
                  <>
                    <p className="text-xs text-gray-400 mb-0.5">Perpanjangan ke-</p>
                    <p className="text-sm text-gray-800 font-medium">
                      {expat.renewalNo != null ? expat.renewalNo : <span className="text-gray-400 italic">Pertama</span>}
                    </p>
                  </>
                )}
              </div>
            </div>

            <div className="mt-4 pt-4 border-t">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Passport</p>
              <div className="grid grid-cols-3 gap-4">
                <Field label="Nomor Passport" value={editing ? form.passportNo : expat.passportNo} onChange={v => setF("passportNo", v)} editing={editing} />
                <Field label="Issued Date" value={editing ? form.passportIssuedDate : fmtDate(expat.passportIssuedDate)} onChange={v => setF("passportIssuedDate", v)} type="date" editing={editing} />
                <Field label="Expiry Date" value={editing ? form.passportExpiryDate : fmtDate(expat.passportExpiryDate)} onChange={v => setF("passportExpiryDate", v)} type="date" editing={editing} />
              </div>
            </div>

            <div className="mt-4 pt-4 border-t">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Alamat</p>
              <div className="grid grid-cols-1 gap-4">
                <Field label="Present Address" value={editing ? form.presentAddress : expat.presentAddress} onChange={v => setF("presentAddress", v)} editing={editing} textarea />
                <Field label="Permanent Address" value={editing ? form.permanentAddress : expat.permanentAddress} onChange={v => setF("permanentAddress", v)} editing={editing} textarea />
              </div>
            </div>
          </div>

          {/* Permits */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <FileText size={16} className="text-orange-600" />
              <h2 className="font-semibold text-gray-800">Perizinan Expatriate</h2>
            </div>
            <PermitSection
              permits={expat.permits ?? []}
              expatId={id}
              permitTypes={expatPermitTypes}
              onRefresh={fetchData}
            />
          </div>
        </div>

        {/* Right col: family */}
        <div className="col-span-1">
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <FamilySection
              families={expat.families ?? []}
              expatId={id}
              familyPermitTypes={familyPermitTypes}
              onRefresh={fetchData}
            />
          </div>
        </div>
      </div>

      {/* Delete confirm modal */}
      {delConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-red-100 text-red-600 rounded-full p-2"><Trash2 size={20} /></div>
              <h2 className="font-bold text-lg">Hapus Expatriate?</h2>
            </div>
            <p className="text-sm text-gray-600 mb-1">
              Data <span className="font-semibold">{expat.name}</span> beserta semua perizinan dan keluarga akan dihapus permanen.
            </p>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setDelConfirm(false)}
                className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-2 text-sm hover:bg-gray-50 transition">Batal</button>
              <button onClick={handleDelete}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-lg py-2 text-sm transition">Hapus</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
