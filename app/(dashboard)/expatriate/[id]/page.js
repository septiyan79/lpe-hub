"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import {
  Globe, ArrowLeft, Pencil, Trash2, X, Plus,
  User, FileText, Users, ChevronDown, ChevronUp, Save,
  Briefcase, CalendarDays, MapPin, RotateCcw,
} from "lucide-react";

// ─── helpers ─────────────────────────────────────────────────────────────────

function fmtDate(d) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtShort(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "2-digit" });
}

function toInput(d) {
  if (!d) return "";
  return new Date(d).toISOString().slice(0, 10);
}

function daysLeft(d) {
  return Math.floor((new Date(d) - new Date()) / (1000 * 60 * 60 * 24));
}

function expatUrgency(expat) {
  const allDates = [
    expat.passportExpiryDate,
    ...(expat.permits ?? [])
      .filter(p => p.expiryDate && p.permitType?.hasExpiry && !p.permitType?.isEPO && !p.permitType?.isOneTime)
      .map(p => p.expiryDate),
  ].filter(Boolean);
  if (!allDates.length) return "none";
  const min = Math.min(...allDates.map(d => daysLeft(d)));
  if (min < 0) return "expired";
  if (min <= 30) return "critical";
  if (min <= 90) return "warning";
  return "ok";
}

function memberUrgency(member) {
  const allDates = [
    member.passportExpiryDate,
    ...(member.permits ?? [])
      .filter(p => p.expiryDate && p.permitType?.hasExpiry && !p.permitType?.isEPO && !p.permitType?.isOneTime)
      .map(p => p.expiryDate),
  ].filter(Boolean);
  if (!allDates.length) return "none";
  const min = Math.min(...allDates.map(d => daysLeft(d)));
  if (min < 0) return "expired";
  if (min <= 30) return "critical";
  if (min <= 90) return "warning";
  return "ok";
}

const URGENCY_STYLE = {
  expired:  { borderL: "border-l-4 border-l-red-400",    avatarBg: "bg-red-100",    avatarText: "text-red-500" },
  critical: { borderL: "border-l-4 border-l-orange-400", avatarBg: "bg-orange-100", avatarText: "text-orange-500" },
  warning:  { borderL: "border-l-4 border-l-yellow-400", avatarBg: "bg-yellow-100", avatarText: "text-yellow-600" },
  ok:       { borderL: "border-l-4 border-l-green-400",  avatarBg: "bg-green-100",  avatarText: "text-green-600" },
  none:     { borderL: "border-l-4 border-l-gray-200",   avatarBg: "bg-gray-100",   avatarText: "text-gray-400" },
};

function expiryColor(date) {
  if (!date) return "bg-gray-100 text-gray-500";
  const diff = (new Date(date) - new Date()) / (1000 * 60 * 60 * 24);
  if (diff < 0) return "bg-red-100 text-red-700";
  if (diff <= 30) return "bg-orange-100 text-orange-700";
  if (diff <= 90) return "bg-yellow-100 text-yellow-700";
  return "bg-green-100 text-green-700";
}

function PermitPill({ label, date, hasExpiry = true, issuedDate, alwaysShow = false }) {
  let colorCls = "bg-gray-100 text-gray-400";
  if (!hasExpiry) {
    if (issuedDate) colorCls = "bg-blue-100 text-blue-600";
    else if (!alwaysShow) return null;
  } else if (date) {
    const diff = daysLeft(date);
    if (diff < 0)        colorCls = "bg-red-100 text-red-600";
    else if (diff <= 30) colorCls = "bg-orange-100 text-orange-600";
    else if (diff <= 90) colorCls = "bg-yellow-100 text-yellow-700";
    else                 colorCls = "bg-green-100 text-green-700";
  } else if (!alwaysShow) {
    return null;
  }
  const showDate = date && (hasExpiry || !issuedDate);
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${colorCls}`}>
      {label}
      {showDate && <span className="font-normal opacity-75">{fmtShort(date)}</span>}
    </span>
  );
}

function SectionHeader({ icon: Icon, label }) {
  return (
    <div className="inline-flex items-center gap-2 bg-orange-950 text-orange-200 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest mb-3">
      {Icon && <Icon size={11} />}
      {label}
    </div>
  );
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
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY_PERMIT);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [renewModal, setRenewModal] = useState(null);
  const [renewForm, setRenewForm] = useState({ number: "", issuedDate: "", expiryDate: "" });
  const [renewSaving, setRenewSaving] = useState(false);
  const [renewError, setRenewError] = useState("");

  const baseUrl = familyId
    ? `/api/expatriate/${expatId}/family/${familyId}/permits`
    : `/api/expatriate/${expatId}/permits`;

  const availableTypes = permitTypes.filter(t => !permits.some(p => p.permitTypeId === t.id));

  function openAdd() {
    setForm({ ...EMPTY_PERMIT, permitTypeId: availableTypes[0]?.id || "" });
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

  function openRenew(p) {
    setRenewForm({ number: "", issuedDate: "", expiryDate: "" });
    setRenewError("");
    setRenewModal(p);
  }

  async function handleRenew(e) {
    e.preventDefault();
    setRenewSaving(true);
    setRenewError("");
    try {
      const res = await fetch(`${baseUrl}/${renewModal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(renewForm),
      });
      const data = await res.json();
      if (!res.ok) { setRenewError(data.error || "Gagal menyimpan"); return; }
      setRenewModal(null);
      onRefresh();
    } finally {
      setRenewSaving(false);
    }
  }

  function setF(k, v) { setForm(f => ({ ...f, [k]: v })); }

  const selectedType = permitTypes.find(t => t.id === form.permitTypeId);
  const showExpiry = selectedType?.hasExpiry ?? true;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <SectionHeader icon={FileText} label="Perizinan" />
        {availableTypes.length > 0 && (
          <button onClick={openAdd}
            className="flex items-center gap-1 text-xs text-orange-700 hover:text-orange-900 font-medium">
            <Plus size={13} /> Tambah
          </button>
        )}
      </div>

      {permits.length === 0 ? (
        <p className="text-sm text-gray-400 italic">Belum ada data perizinan</p>
      ) : (
        <div className="space-y-2">
          {[...permits]
            .sort((a, b) => (a.permitType?.order ?? 99) - (b.permitType?.order ?? 99))
            .map(p => {
            const isEPO = p.permitType?.isEPO;
            const isOneTime = p.permitType?.isOneTime;
            const hasExp = p.permitType?.hasExpiry;
            const days = p.expiryDate ? daysLeft(p.expiryDate) : null;
            const borderColor = isEPO ? "border-l-red-400" :
              isOneTime ? "border-l-blue-400" :
              days === null ? "border-l-gray-300" :
              days < 0 ? "border-l-red-400" :
              days <= 30 ? "border-l-orange-400" :
              days <= 90 ? "border-l-yellow-400" : "border-l-green-400";
            const bgColor = isEPO ? "bg-red-50/60" :
              isOneTime ? "bg-blue-50/30" :
              days === null ? "bg-gray-50" :
              days < 0 ? "bg-red-50/60" :
              days <= 30 ? "bg-orange-50/50" :
              days <= 90 ? "bg-yellow-50/40" : "bg-white";
            const countdownCls = isOneTime ? "bg-blue-100 text-blue-600" :
              days === null ? "" :
              days < 0 ? "bg-red-100 text-red-700" :
              days <= 30 ? "bg-orange-100 text-orange-700" :
              days <= 90 ? "bg-yellow-100 text-yellow-700" : "bg-green-100 text-green-700";
            const expiryTextCls = isOneTime ? "text-blue-600" :
              days === null ? "text-gray-600" :
              days < 0 ? "text-red-600 font-semibold" :
              days <= 30 ? "text-orange-600 font-semibold" :
              days <= 90 ? "text-yellow-700 font-semibold" : "text-green-700";
            const nameBadgeCls = isEPO ? "bg-red-100 text-red-700" :
              isOneTime ? "bg-blue-100 text-blue-700" :
              days === null ? "bg-gray-100 text-gray-600" :
              days < 0 ? "bg-red-100 text-red-700" :
              days <= 30 ? "bg-orange-100 text-orange-700" :
              days <= 90 ? "bg-yellow-100 text-yellow-700" : "bg-green-100 text-green-700";

            return (
              <div key={p.id}
                className={`flex items-center gap-3 rounded-xl border border-gray-100 border-l-4 ${borderColor} ${bgColor} px-4 py-2 group`}>

                {/* Type + Number — wider */}
                <div className="shrink-0 w-60">
                  <span className={`inline-block text-[11px] font-bold px-2 py-0.5 rounded-md mb-0.5 ${nameBadgeCls}`}>
                    {p.permitType?.name ?? "—"}
                  </span>
                  <p className="text-[11px] font-mono text-gray-400 truncate" title={p.number}>{p.number}</p>
                </div>

                {/* Dates — single compact line */}
                <div className="flex-1 flex items-center gap-2 text-xs text-gray-600 min-w-0">
                  <span className="font-medium whitespace-nowrap">{fmtDate(p.issuedDate)}</span>
                  {p.expiryDate && (
                    <>
                      <span className="text-gray-300">→</span>
                      <span className={`whitespace-nowrap ${expiryTextCls}`}>{fmtDate(p.expiryDate)}</span>
                    </>
                  )}
                  {!p.expiryDate && !hasExp && (
                    <span className="text-[10px] bg-blue-50 text-blue-500 px-1.5 py-0.5 rounded-full">sekali terbit</span>
                  )}
                </div>

                {/* Countdown + actions */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {days !== null && (
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md whitespace-nowrap ${countdownCls}`}>
                      {days < 0 ? `${Math.abs(days)}h lalu` : `${days}h lagi`}
                    </span>
                  )}
                  <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition">
                    <button onClick={() => openRenew(p)} title="Perpanjang izin"
                      className={`p-1.5 rounded-lg hover:bg-blue-50 text-blue-500 ${(!hasExp || isOneTime) ? "invisible pointer-events-none" : ""}`}>
                      <RotateCcw size={12} />
                    </button>
                    <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg hover:bg-orange-100 text-orange-600">
                      <Pencil size={12} />
                    </button>
                    <button onClick={() => handleDelete(p)} className="p-1.5 rounded-lg hover:bg-red-100 text-red-500">
                      <Trash2 size={12} />
                    </button>
                  </div>
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
            ) : modal === "add" && availableTypes.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-sm text-gray-500">Semua jenis izin sudah ditambahkan.</p>
              </div>
            ) : (
            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Jenis</label>
                <select value={form.permitTypeId} onChange={e => setF("permitTypeId", e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                  required>
                  <option value="">— Pilih jenis izin —</option>
                  {(modal === "add" ? availableTypes : permitTypes).map(t => (
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

      {/* ── Modal Perpanjang ── */}
      {renewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <RotateCcw size={16} className="text-blue-500" />
                <h3 className="font-bold text-orange-950">Perpanjang Izin</h3>
              </div>
              <button onClick={() => setRenewModal(null)}><X size={18} className="text-gray-400" /></button>
            </div>

            {/* Info izin lama */}
            <div className="bg-gray-50 border border-gray-100 rounded-lg px-3 py-2.5 mb-4 text-xs">
              <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">Izin saat ini</p>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-gray-700">{renewModal.permitType?.name}</span>
                <span className="font-mono text-gray-500">{renewModal.number}</span>
                {renewModal.expiryDate && (
                  <span className={`px-1.5 py-0.5 rounded-full font-medium ${expiryColor(renewModal.expiryDate)}`}>
                    s/d {fmtDate(renewModal.expiryDate)}
                  </span>
                )}
              </div>
            </div>

            <form onSubmit={handleRenew} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nomor Baru</label>
                <input value={renewForm.number} onChange={e => setRenewForm(f => ({ ...f, number: e.target.value }))} required
                  placeholder={renewModal.number}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Issued Date</label>
                  <input type="date" value={renewForm.issuedDate} onChange={e => setRenewForm(f => ({ ...f, issuedDate: e.target.value }))} required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>
                  <input type="date" value={renewForm.expiryDate} onChange={e => setRenewForm(f => ({ ...f, expiryDate: e.target.value }))} required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
              </div>
              {renewError && <p className="text-sm text-red-500">{renewError}</p>}
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setRenewModal(null)}
                  className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-2 text-sm hover:bg-gray-50 transition">
                  Batal
                </button>
                <button type="submit" disabled={renewSaving}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2 text-sm transition disabled:opacity-60 flex items-center justify-center gap-1.5">
                  <RotateCcw size={13} />
                  {renewSaving ? "Menyimpan..." : "Perpanjang"}
                </button>
              </div>
            </form>
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
  const urgency = memberUrgency(member);
  const { borderL } = URGENCY_STYLE[urgency];
  const initials = member.name.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join("").toUpperCase();

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
    <div className={`border border-gray-200 rounded-xl overflow-hidden ${borderL}`}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-orange-50/50 transition"
      >
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-bold text-xs ${
            member.gender === "Female" ? "bg-pink-100 text-pink-600" : "bg-blue-100 text-blue-600"
          }`}>
            {initials || "?"}
          </div>
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
          <div>
            <div className="flex items-center justify-between mb-3">
              <SectionHeader icon={User} label="Data Pribadi" />
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
        <div className="inline-flex items-center gap-2 bg-orange-950 text-orange-200 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest">
          <Users size={11} />
          Keluarga
          {families.length > 0 && (
            <span className="bg-orange-800 text-orange-200 px-1.5 py-0.5 rounded-full text-[9px]">{families.length}</span>
          )}
        </div>
        <button onClick={() => { setForm(EMPTY_FAMILY); setError(""); setModal(true); }}
          className="flex items-center gap-1.5 text-sm text-orange-700 hover:text-orange-900 font-medium">
          <Plus size={14} /> Tambah
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

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-400">
      <div className="w-8 h-8 border-2 border-orange-300 border-t-orange-600 rounded-full animate-spin" />
      <span className="text-sm">Memuat data...</span>
    </div>
  );
  if (!expat) return <div className="text-center py-20 text-gray-400">Data tidak ditemukan</div>;

  const urgency = expatUrgency(expat);
  const { borderL, avatarBg, avatarText } = URGENCY_STYLE[urgency];
  const initials = expat.name.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join("").toUpperCase();
  const epo = expat.permits?.some(p => p.permitType?.isEPO);
  const familyCount = expat.families?.length ?? 0;

  const izinKerjaPermit = (expat.permits ?? [])
    .filter(p => p.permitType?.linkedToWorkPermit)
    .sort((a, b) => (a.permitType?.order ?? 99) - (b.permitType?.order ?? 99))[0];
  const warningPermits = (expat.permits ?? []).filter(p => {
    if (p.permitType?.isEPO) return false;
    if (p.permitType?.linkedToWorkPermit) return false;
    if (izinKerjaPermit && p.id === izinKerjaPermit.id) return false;
    if (!p.permitType?.hasExpiry || !p.expiryDate) return false;
    return daysLeft(p.expiryDate) <= 90;
  });

  return (
    <div className="bg-orange-50/30 min-h-screen">
      <div className="max-w-5xl mx-auto px-4 py-6">

        {/* Back */}
        <button onClick={() => router.push("/expatriate")}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-orange-700 mb-4 transition">
          <ArrowLeft size={16} /> Kembali ke daftar
        </button>

        {/* ── Hero Card ── */}
        <div className={`bg-white border border-gray-200 rounded-xl overflow-hidden mb-6 ${borderL}`}>
          <div className="flex items-stretch">
            {/* Avatar */}
            <div className={`flex items-center justify-center w-20 shrink-0 ${avatarBg}`}>
              <div className={`w-12 h-12 rounded-full bg-white/30 flex items-center justify-center font-bold text-base ${avatarText}`}>
                {initials || "?"}
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0 px-5 py-4">
              {/* Row 1: name + badges + actions */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-gray-900 text-lg leading-tight">{expat.name}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    expat.gender === "Male" ? "bg-blue-100 text-blue-600" : "bg-pink-100 text-pink-600"
                  }`}>
                    {expat.gender}
                  </span>
                  {epo && (
                    <span className="text-[10px] font-bold bg-red-100 text-red-600 px-2 py-0.5 rounded-full">EPO</span>
                  )}
                  {expat.renewalNo != null && (
                    <span className="text-[10px] font-semibold bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                      Perp. ke-{expat.renewalNo}
                    </span>
                  )}
                </div>
                <div className="flex gap-2 shrink-0">
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

              {/* Row 2: position, dept, arrival, family */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-gray-500 mt-1.5">
                <span className="flex items-center gap-1">
                  <Briefcase size={11} className="text-gray-400" />
                  <span className="text-gray-700 font-medium">{expat.position}</span>
                </span>
                <span className="text-gray-300">·</span>
                <span>{expat.department}</span>
                <span className="text-gray-300">·</span>
                <span className="flex items-center gap-1">
                  <CalendarDays size={11} className="text-gray-400" />
                  Tiba {fmtDate(expat.arrivalDate)}
                </span>
                {familyCount > 0 && (
                  <>
                    <span className="text-gray-300">·</span>
                    <span className="flex items-center gap-1">
                      <Users size={11} className="text-gray-400" />
                      {familyCount} keluarga
                    </span>
                  </>
                )}
              </div>

              {/* Row 3: permit pills */}
              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                <PermitPill label="Passport" date={expat.passportExpiryDate} />
                {izinKerjaPermit && (
                  <PermitPill
                    label={izinKerjaPermit.permitType?.name}
                    date={izinKerjaPermit.expiryDate}
                    hasExpiry={izinKerjaPermit.permitType?.hasExpiry}
                    issuedDate={izinKerjaPermit.issuedDate}
                    alwaysShow
                  />
                )}
                {warningPermits.map(p => (
                  <PermitPill key={p.id}
                    label={p.permitType?.name}
                    date={p.expiryDate}
                    hasExpiry={p.permitType?.hasExpiry}
                    issuedDate={p.issuedDate}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Left col: personal info + permits */}
          <div className="col-span-2 space-y-6">
            {/* Personal Info */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <SectionHeader icon={User} label="Data Pribadi" />
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

              <div className="mt-5 pt-4 border-t">
                <SectionHeader icon={FileText} label="Passport" />
                <div className="grid grid-cols-3 gap-4">
                  <Field label="Nomor Passport" value={editing ? form.passportNo : expat.passportNo} onChange={v => setF("passportNo", v)} editing={editing} />
                  <Field label="Issued Date" value={editing ? form.passportIssuedDate : fmtDate(expat.passportIssuedDate)} onChange={v => setF("passportIssuedDate", v)} type="date" editing={editing} />
                  <Field label="Expiry Date" value={editing ? form.passportExpiryDate : fmtDate(expat.passportExpiryDate)} onChange={v => setF("passportExpiryDate", v)} type="date" editing={editing} />
                </div>
              </div>

              <div className="mt-5 pt-4 border-t">
                <SectionHeader icon={MapPin} label="Alamat" />
                <div className="grid grid-cols-1 gap-4">
                  <Field label="Present Address" value={editing ? form.presentAddress : expat.presentAddress} onChange={v => setF("presentAddress", v)} editing={editing} textarea />
                  <Field label="Permanent Address" value={editing ? form.permanentAddress : expat.permanentAddress} onChange={v => setF("permanentAddress", v)} editing={editing} textarea />
                </div>
              </div>
            </div>

            {/* Permits */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="inline-flex items-center gap-2 bg-orange-950 text-orange-200 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest">
                  <Globe size={11} />
                  Perizinan Expatriate
                </div>
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
    </div>
  );
}
