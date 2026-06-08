"use client";

import { useState, useEffect, use, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Globe, ArrowLeft, Pencil, Trash2, X, Plus,
  User, FileText, Users, Save,
  Briefcase, CalendarDays, MapPin, RotateCcw, History,
  ImageIcon, Paperclip, Upload,
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
      .filter(p => p.status !== "replaced" && p.expiryDate && p.permitType?.hasExpiry && !p.permitType?.isEPO && !p.permitType?.isOneTime)
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
      .filter(p => p.status !== "replaced" && p.expiryDate && p.permitType?.hasExpiry && !p.permitType?.isEPO && !p.permitType?.isOneTime)
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

// ─── File Upload Slot ─────────────────────────────────────────────────────────

function FileUploadSlot({ label, url, accept, uploadUrl, onUploaded, onDeleted, compact = false }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef(null);
  const isImage = accept.includes("image");

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(uploadUrl, { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Gagal upload"); return; }
      onUploaded(isImage ? data.photoUrl : (data.passportScanUrl ?? data.scanUrl));
    } catch {
      setError("Gagal upload");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function handleDelete() {
    if (!confirm("Hapus file ini?")) return;
    const res = await fetch(uploadUrl, { method: "DELETE" });
    if (res.ok) onDeleted();
  }

  if (compact) {
    return (
      <div className="flex items-center gap-0.5">
        <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={handleFile} />
        {url ? (
          <>
            <a href={url} target="_blank" title="Lihat scan"
              className="p-1.5 rounded-lg text-green-600 hover:bg-green-50 transition" rel="noreferrer">
              <Paperclip size={12} />
            </a>
            <button onClick={handleDelete} title="Hapus scan"
              className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 transition">
              <X size={11} />
            </button>
          </>
        ) : (
          <button onClick={() => inputRef.current?.click()} disabled={uploading}
            title={`Upload scan (PDF)`}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition disabled:opacity-50">
            {uploading ? <span className="text-[9px]">...</span> : <Upload size={12} />}
          </button>
        )}
      </div>
    );
  }

  return (
    <div>
      <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={handleFile} />
      {url ? (
        <div className="flex flex-col gap-1.5">
          {isImage ? (
            <a href={url} target="_blank" rel="noreferrer">
              <img src={url} alt={label} className="w-24 h-28 object-cover rounded-lg border border-gray-200 hover:opacity-90 transition" />
            </a>
          ) : (
            <a href={url} target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:underline">
              <Paperclip size={13} />
              Lihat PDF
            </a>
          )}
          <div className="flex gap-2">
            <button onClick={() => inputRef.current?.click()} disabled={uploading}
              className="text-xs text-gray-500 hover:text-gray-700 underline disabled:opacity-50">
              {uploading ? "Mengupload..." : "Ganti"}
            </button>
            <button onClick={handleDelete} className="text-xs text-red-500 hover:text-red-700">Hapus</button>
          </div>
        </div>
      ) : (
        <button onClick={() => inputRef.current?.click()} disabled={uploading}
          className="flex flex-col items-center justify-center gap-1.5 w-full border-2 border-dashed border-gray-200 rounded-xl py-4 text-gray-400 hover:border-orange-300 hover:text-orange-400 transition disabled:opacity-50">
          {uploading
            ? <span className="text-xs">Mengupload...</span>
            : <><Upload size={18} /><span className="text-xs">Upload {label}</span></>
          }
        </button>
      )}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

// ─── Permit Section ───────────────────────────────────────────────────────────

function PermitSection({ permits, expatId, familyId, permitTypes, onRefresh, personName }) {
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY_PERMIT);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [renewModal, setRenewModal] = useState(null);
  const [renewForm, setRenewForm] = useState({ number: "", issuedDate: "", expiryDate: "" });
  const [renewSaving, setRenewSaving] = useState(false);
  const [renewError, setRenewError] = useState("");

  const [archiveModal, setArchiveModal] = useState(null); // { permitTypeId, name }

  const baseUrl = familyId
    ? `/api/expatriate/${expatId}/family/${familyId}/permits`
    : `/api/expatriate/${expatId}/permits`;

  const activePermits = permits.filter(p => p.status !== "replaced");
  const replacedPermits = permits.filter(p => p.status === "replaced");

  const availableTypes = permitTypes.filter(t => !activePermits.some(p => p.permitTypeId === t.id));

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
      const res = await fetch(`${baseUrl}/${renewModal.id}/renew`, {
        method: "POST",
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

      {activePermits.length === 0 && replacedPermits.length === 0 ? (
        <p className="text-sm text-gray-400 italic">Belum ada data perizinan</p>
      ) : (
        <div className="space-y-2">
          {[...activePermits]
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

                {/* Type + Number */}
                <div className="shrink-0 w-60">
                  <span className={`inline-block text-[11px] font-bold px-2 py-0.5 rounded-md mb-0.5 ${nameBadgeCls}`}>
                    {p.permitType?.name ?? "—"}
                  </span>
                  <p className="text-[11px] font-mono text-gray-400 truncate" title={p.number}>{p.number}</p>
                </div>

                {/* Dates */}
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
                  <FileUploadSlot
                    compact
                    label="Scan"
                    url={p.scanUrl}
                    accept="application/pdf"
                    uploadUrl={`${baseUrl}/${p.id}/scan`}
                    onUploaded={() => onRefresh()}
                    onDeleted={() => onRefresh()}
                  />
                  {(() => {
                    const historyCount = replacedPermits.filter(r => r.permitTypeId === p.permitTypeId).length;
                    return (
                      <button
                        onClick={() => historyCount > 0 && setArchiveModal({ permitTypeId: p.permitTypeId, name: p.permitType?.name ?? "—" })}
                        title={historyCount > 0 ? `Lihat ${historyCount} riwayat perpanjangan` : undefined}
                        className={`flex items-center gap-0.5 px-1.5 py-1 rounded-lg text-gray-500 transition ${
                          historyCount > 0 ? "bg-gray-100 hover:bg-gray-200 cursor-pointer" : "invisible pointer-events-none"
                        }`}
                      >
                        <History size={11} />
                        <span className="text-[10px] font-bold">{historyCount}</span>
                      </button>
                    );
                  })()}
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

      {/* ── Modal Riwayat Perpanjangan ── */}
      {archiveModal && (() => {
        const items = [...replacedPermits]
          .filter(r => r.permitTypeId === archiveModal.permitTypeId)
          .sort((a, b) => new Date(b.issuedDate) - new Date(a.issuedDate));
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <History size={16} className="text-gray-500" />
                  <div>
                    <h3 className="font-bold text-orange-950 leading-tight">Riwayat Perpanjangan</h3>
                    <p className="text-[11px] text-gray-400 mt-0.5">{archiveModal.name}</p>
                  </div>
                </div>
                <button onClick={() => setArchiveModal(null)}><X size={18} className="text-gray-400" /></button>
              </div>

              <div className="space-y-2">
                {items.map(r => (
                  <div key={r.id} className="flex items-center gap-3 rounded-xl border border-gray-100 border-l-4 border-l-gray-200 bg-gray-50 px-4 py-2.5 group">
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-mono text-gray-500 truncate" title={r.number}>{r.number}</p>
                      <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-0.5">
                        <span>{fmtDate(r.issuedDate)}</span>
                        {r.expiryDate && (
                          <>
                            <span className="text-gray-300">→</span>
                            <span>{fmtDate(r.expiryDate)}</span>
                          </>
                        )}
                      </div>
                    </div>
                    {r.scanUrl && (
                      <a href={r.scanUrl} target="_blank" rel="noreferrer"
                        className="flex items-center gap-1 text-[11px] text-blue-500 hover:underline shrink-0">
                        <Paperclip size={11} /> Scan
                      </a>
                    )}
                    <button
                      onClick={async () => {
                        if (!confirm(`Hapus riwayat ${r.number}?`)) return;
                        await fetch(`${baseUrl}/${r.id}`, { method: "DELETE" });
                        onRefresh();
                        setArchiveModal(null);
                      }}
                      title="Hapus riwayat"
                      className="p-1.5 rounded-lg hover:bg-red-100 text-red-400 opacity-0 group-hover:opacity-100 transition shrink-0"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>

              <button onClick={() => setArchiveModal(null)}
                className="mt-4 w-full border border-gray-300 text-gray-600 rounded-lg py-2 text-sm hover:bg-gray-50 transition">
                Tutup
              </button>
            </div>
          </div>
        );
      })()}

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
                <div>
                  <h3 className="font-bold text-orange-950 leading-tight">Perpanjang Izin</h3>
                  {personName && (
                    <p className="text-[11px] text-gray-400 mt-0.5">{personName}</p>
                  )}
                </div>
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

// ─── Family Detail Panel ──────────────────────────────────────────────────────

function FamilyDetailPanel({ member, expatId, familyPermitTypes, onRefresh, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

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
    <div className="space-y-5">
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

      <div className="pt-3 border-t">
        <SectionHeader icon={ImageIcon} label="Dokumen" />
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-500 mb-2">Pas Foto</p>
            <FileUploadSlot
              label="Pas Foto"
              url={member.photoUrl}
              accept="image/jpeg,image/png"
              uploadUrl={`/api/expatriate/${expatId}/family/${member.id}/photo`}
              onUploaded={() => onRefresh()}
              onDeleted={() => onRefresh()}
            />
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-2">Scan Paspor</p>
            <FileUploadSlot
              label="Scan Paspor"
              url={member.passportScanUrl}
              accept="application/pdf"
              uploadUrl={`/api/expatriate/${expatId}/family/${member.id}/passport-scan`}
              onUploaded={() => onRefresh()}
              onDeleted={() => onRefresh()}
            />
          </div>
        </div>
      </div>

      <div className="pt-4 border-t">
        <PermitSection
          permits={member.permits ?? []}
          expatId={expatId}
          familyId={member.id}
          permitTypes={familyPermitTypes}
          onRefresh={onRefresh}
          personName={member.name}
        />
      </div>
    </div>
  );
}

// ─── Family Section ───────────────────────────────────────────────────────────

function FamilySection({ families, expatId, familyPermitTypes, onRefresh }) {
  const [selectedId, setSelectedId] = useState(families[0]?.id ?? null);
  const [addModal, setAddModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FAMILY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (selectedId && !families.some(f => f.id === selectedId)) {
      setSelectedId(families[0]?.id ?? null);
    }
    if (!selectedId && families.length > 0) {
      setSelectedId(families[0].id);
    }
  }, [families]);

  const selectedMember = families.find(f => f.id === selectedId);

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
      setAddModal(false);
      onRefresh();
      if (data.id) setSelectedId(data.id);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(member) {
    if (!confirm(`Hapus data ${member.name}? Semua perizinan keluarga ini juga akan dihapus.`)) return;
    await fetch(`/api/expatriate/${expatId}/family/${member.id}`, { method: "DELETE" });
    onRefresh();
  }

  const URGENCY_DOT = {
    expired: "bg-red-400", critical: "bg-orange-400",
    warning: "bg-yellow-400", ok: "bg-green-400", none: "",
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="flex" style={{ minHeight: 420 }}>

        {/* ── Kiri: list keluarga ── */}
        <div className="w-56 shrink-0 border-r border-gray-100 flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50/60">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Keluarga {families.length > 0 && `(${families.length})`}
            </span>
            <button onClick={() => { setForm(EMPTY_FAMILY); setError(""); setAddModal(true); }}
              title="Tambah keluarga"
              className="p-1 rounded-lg hover:bg-orange-50 text-orange-600 transition">
              <Plus size={14} />
            </button>
          </div>

          {families.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-10 px-4 text-center">
              <Users size={28} className="text-gray-200 mb-2" />
              <p className="text-xs text-gray-400">Belum ada anggota keluarga</p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
              {families.map(m => {
                const urgency = memberUrgency(m);
                const dotCls = URGENCY_DOT[urgency];
                const hasEPO = m.permits?.some(p => p.permitType?.isEPO);
                const initials = m.name.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join("").toUpperCase();
                const isSelected = selectedId === m.id;
                return (
                  <button key={m.id} onClick={() => setSelectedId(m.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left border-l-4 transition ${
                      isSelected ? "bg-orange-50 border-l-orange-400" : "border-l-transparent hover:bg-gray-50"
                    }`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-bold text-xs ${
                      m.gender === "Female" ? "bg-pink-100 text-pink-600" : "bg-blue-100 text-blue-600"
                    }`}>
                      {initials || "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className={`text-sm font-medium truncate ${isSelected ? "text-orange-900" : "text-gray-800"}`}>
                          {m.name}
                        </p>
                        {hasEPO && (
                          <span className="text-[9px] font-bold bg-red-100 text-red-600 px-1 py-0.5 rounded shrink-0">EPO</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400">{m.familyStatus}</p>
                    </div>
                    {dotCls && <span className={`w-2 h-2 rounded-full shrink-0 ${dotCls}`} />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Kanan: detail panel ── */}
        <div className="flex-1 min-w-0 p-5 overflow-y-auto">
          {!selectedMember ? (
            <div className="flex flex-col items-center justify-center h-full py-16 text-center text-gray-400">
              <Users size={36} className="text-gray-200 mb-3" />
              <p className="text-sm">Pilih anggota keluarga untuk melihat detail</p>
            </div>
          ) : (
            <>
              {/* Header nama anggota */}
              <div className="flex items-center gap-3 mb-5 pb-4 border-b border-gray-100">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 font-bold text-sm ${
                  selectedMember.gender === "Female" ? "bg-pink-100 text-pink-600" : "bg-blue-100 text-blue-600"
                }`}>
                  {selectedMember.name.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join("").toUpperCase() || "?"}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-gray-900 text-base leading-tight">{selectedMember.name}</h3>
                    {selectedMember.permits?.some(p => p.permitType?.isEPO) && (
                      <span className="text-[10px] font-bold bg-red-100 text-red-600 px-1.5 py-0.5 rounded">EPO</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{selectedMember.familyStatus} · {selectedMember.gender}</p>
                </div>
              </div>
              <FamilyDetailPanel
                key={selectedMember.id}
                member={selectedMember}
                expatId={expatId}
                familyPermitTypes={familyPermitTypes}
                onRefresh={onRefresh}
                onDelete={handleDelete}
              />
            </>
          )}
        </div>
      </div>

      {addModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 my-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-orange-950">Tambah Anggota Keluarga</h3>
              <button onClick={() => setAddModal(false)}><X size={18} className="text-gray-400" /></button>
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
                <button type="button" onClick={() => setAddModal(false)}
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
  const [tab, setTab] = useState("data");
  const photoInputRef = useRef(null);
  const passportInputRef = useRef(null);

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

  async function handlePhotoUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(`/api/expatriate/${id}/photo`, { method: "POST", body: fd });
    if (res.ok) { const d = await res.json(); setExpat(ex => ({ ...ex, photoUrl: d.photoUrl })); }
    e.target.value = "";
  }

  async function handlePhotoDelete() {
    if (!confirm("Hapus foto?")) return;
    await fetch(`/api/expatriate/${id}/photo`, { method: "DELETE" });
    setExpat(ex => ({ ...ex, photoUrl: null }));
  }

  async function handlePassportScanUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(`/api/expatriate/${id}/passport-scan`, { method: "POST", body: fd });
    if (res.ok) { const d = await res.json(); setExpat(ex => ({ ...ex, passportScanUrl: d.passportScanUrl })); }
    e.target.value = "";
  }

  async function handlePassportScanDelete() {
    if (!confirm("Hapus scan paspor?")) return;
    await fetch(`/api/expatriate/${id}/passport-scan`, { method: "DELETE" });
    setExpat(ex => ({ ...ex, passportScanUrl: null }));
  }

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
    .filter(p => p.status !== "replaced" && p.permitType?.linkedToWorkPermit)
    .sort((a, b) => (a.permitType?.order ?? 99) - (b.permitType?.order ?? 99))[0];
  const warningPermits = (expat.permits ?? []).filter(p => {
    if (p.status === "replaced") return false;
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
            {/* Avatar / Foto */}
            <div className={`flex items-center justify-center w-20 shrink-0 ${avatarBg} relative group overflow-hidden cursor-pointer`}
              onClick={() => photoInputRef.current?.click()}>
              <input ref={photoInputRef} type="file" accept="image/jpeg,image/png" className="hidden" onChange={handlePhotoUpload} />
              {/* Inisial selalu tampil sebagai fallback */}
              <div className={`w-12 h-12 rounded-full bg-white/30 flex items-center justify-center font-bold text-base ${avatarText}`}>
                {initials || "?"}
              </div>
              {/* Foto ditumpuk di atas; onError menyembunyikannya jika file tidak ada */}
              {expat.photoUrl && (
                <img src={expat.photoUrl} alt={expat.name}
                  className="absolute inset-0 w-full h-full object-cover"
                  onError={e => { e.currentTarget.style.display = "none"; }} />
              )}
              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center pointer-events-none">
                <ImageIcon size={18} className="text-white" />
              </div>
              {expat.photoUrl && (
                <button onClick={e => { e.stopPropagation(); handlePhotoDelete(); }}
                  className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition flex items-center justify-center z-10">
                  <X size={10} />
                </button>
              )}
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
                <div className="flex gap-2 shrink-0 items-center">
                  {/* Passport scan icon */}
                  <input ref={passportInputRef} type="file" accept="application/pdf" className="hidden" onChange={handlePassportScanUpload} />
                  {expat.passportScanUrl ? (
                    <div className="flex items-center gap-0.5">
                      <a href={expat.passportScanUrl} target="_blank" rel="noreferrer"
                        title="Lihat scan paspor"
                        className="flex items-center border border-gray-300 text-gray-700 text-sm p-1.5 rounded-lg hover:bg-gray-50 transition">
                        <Paperclip size={14} />
                      </a>
                      <button onClick={handlePassportScanDelete} title="Hapus scan paspor"
                        className="flex items-center border border-gray-200 text-gray-400 text-sm p-1.5 rounded-lg hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition">
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => passportInputRef.current?.click()}
                      title="Upload scan paspor"
                      className="flex items-center border border-dashed border-gray-300 text-gray-400 text-sm p-1.5 rounded-lg hover:border-gray-400 hover:text-gray-600 transition">
                      <Paperclip size={14} />
                    </button>
                  )}
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

        {/* ── Tabs ── */}
        <div className="flex border-b border-gray-200 mb-5 bg-white rounded-t-xl shadow-sm overflow-hidden">
          {[
            { key: "data",    label: "Data Pribadi",         icon: User  },
            { key: "permits", label: "Perizinan Expatriate", icon: Globe },
            { key: "family",  label: "Keluarga",             icon: Users, count: familyCount },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-6 py-3.5 text-sm font-medium border-b-2 transition-colors ${
                tab === t.key
                  ? "border-orange-600 text-orange-700"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}>
              <t.icon size={15} />
              {t.label}
              {t.count > 0 && (
                <span className="ml-0.5 text-[10px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full font-bold">
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Tab: Data Pribadi ── */}
        {tab === "data" && (
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
                    <input type="number" min="1" value={form.renewalNo} onChange={e => setF("renewalNo", e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
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
                {editing ? (
                  <Field label="Nomor Passport" value={form.passportNo} onChange={v => setF("passportNo", v)} editing />
                ) : (
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Nomor Passport</p>
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm text-gray-800 font-medium">{expat.passportNo || "-"}</p>
                      {expat.passportScanUrl && (
                        <a href={expat.passportScanUrl} target="_blank" rel="noreferrer"
                          title="Lihat scan paspor" className="text-blue-500 hover:text-blue-700 shrink-0">
                          <Paperclip size={13} />
                        </a>
                      )}
                    </div>
                  </div>
                )}
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
        )}

        {/* ── Tab: Perizinan Expatriate ── */}
        {tab === "permits" && (
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <PermitSection
              permits={expat.permits ?? []}
              expatId={id}
              permitTypes={expatPermitTypes}
              onRefresh={fetchData}
            />
          </div>
        )}

        {/* ── Tab: Keluarga ── */}
        {tab === "family" && (
          <FamilySection
            families={expat.families ?? []}
            expatId={id}
            familyPermitTypes={familyPermitTypes}
            onRefresh={fetchData}
          />
        )}

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
