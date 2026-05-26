"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Globe, UserPlus, X, Search, Users, Briefcase,
  ChevronRight, CalendarDays, LayoutList, Table2, FileDown, LogOut,
} from "lucide-react";
import * as XLSX from "xlsx";

const FIXED_EXPORT_COLS = [
  { key: "no",                  label: "No",               group: "Identitas"  },
  { key: "name",                label: "Nama",             group: "Identitas"  },
  { key: "gender",              label: "Gender",           group: "Identitas"  },
  { key: "birthPlace",          label: "Tempat Lahir",     group: "Identitas"  },
  { key: "birthDate",           label: "Tanggal Lahir",    group: "Identitas"  },
  { key: "position",            label: "Jabatan",          group: "Pekerjaan"  },
  { key: "department",          label: "Departemen",       group: "Pekerjaan"  },
  { key: "arrivalDate",         label: "Tgl Tiba",         group: "Pekerjaan"  },
  { key: "renewalNo",           label: "Perpanjangan ke-", group: "Pekerjaan"  },
  { key: "passportNo",          label: "No. Passport",     group: "Passport"   },
  { key: "passportIssuedDate",  label: "Passport Issued",  group: "Passport"   },
  { key: "passportExpiryDate",  label: "Passport Expiry",  group: "Passport"   },
  { key: "familyCount",         label: "Jumlah Keluarga",  group: "Status"     },
  { key: "epo",                 label: "EPO",              group: "Status"     },
];

function getExportValue(expat, key, i) {
  switch (key) {
    case "no":                  return i + 1;
    case "name":                return expat.name;
    case "gender":              return expat.gender;
    case "birthPlace":          return expat.birthPlace || "";
    case "birthDate":           return expat.birthDate ? fmtDate(expat.birthDate) : "";
    case "position":            return expat.position;
    case "department":          return expat.department;
    case "arrivalDate":         return expat.arrivalDate ? fmtDate(expat.arrivalDate) : "";
    case "renewalNo":           return expat.renewalNo != null ? expat.renewalNo : "";
    case "passportNo":          return expat.passportNo || "";
    case "passportIssuedDate":  return expat.passportIssuedDate ? fmtDate(expat.passportIssuedDate) : "";
    case "passportExpiryDate":  return expat.passportExpiryDate ? fmtDate(expat.passportExpiryDate) : "";
    case "familyCount":         return expat._count?.families ?? 0;
    case "epo": {
      const epo = expat.permits?.find(p => p.permitType?.isEPO);
      return epo ? (epo.expiryDate ? fmtDate(epo.expiryDate) : "Ya") : "";
    }
    default: return "";
  }
}

const EMPTY_FORM = {
  name: "", birthPlace: "", birthDate: "", gender: "Male",
  passportNo: "", passportIssuedDate: "", passportExpiryDate: "",
  position: "", department: "", presentAddress: "", permanentAddress: "", arrivalDate: "",
};

function fmtDate(d) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtShort(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "2-digit" });
}

function daysLeft(date) {
  return Math.floor((new Date(date) - new Date()) / (1000 * 60 * 60 * 24));
}

function expiryBadge(date) {
  if (!date) return null;
  const diff = daysLeft(date);
  if (diff < 0) return "bg-red-100 text-red-700";
  if (diff <= 30) return "bg-orange-100 text-orange-700";
  if (diff <= 90) return "bg-yellow-100 text-yellow-700";
  return "bg-green-100 text-green-700";
}

const hasEPO = (expat) => expat.permits?.some(p => p.permitType?.isEPO);
const permitByName = (permits, name) => permits?.find(p => p.permitType?.name === name);

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ExpatriatePage() {
  const router = useRouter();
  const [list, setList] = useState([]);
  const [permitTypes, setPermitTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [view, setView] = useState("list");
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [fetchError, setFetchError] = useState("");
  const [exportModal, setExportModal] = useState(false);

  async function fetchList() {
    setLoading(true);
    setFetchError("");
    try {
      const [expatRes, typeRes] = await Promise.all([
        fetch("/api/expatriate"),
        fetch("/api/expatriate/permit-types"),
      ]);
      if (expatRes.ok) setList(await expatRes.json());
      else {
        const data = await expatRes.json().catch(() => ({}));
        setFetchError(`Error ${expatRes.status}: ${data.error || expatRes.statusText}`);
      }
      if (typeRes.ok) setPermitTypes(await typeRes.json());
    } catch (e) {
      setFetchError(String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchList(); }, []);

  const filtered = list.filter(e =>
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    e.department.toLowerCase().includes(search.toLowerCase()) ||
    e.position.toLowerCase().includes(search.toLowerCase())
  );

  function openAdd() { setForm(EMPTY_FORM); setError(""); setModal(true); }
  function closeModal() { setModal(false); setError(""); }

  async function handleAdd(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/expatriate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Gagal menambah data"); return; }
      closeModal();
      router.push(`/expatriate/${data.id}`);
    } finally {
      setSaving(false);
    }
  }

  function setF(k, v) { setForm(f => ({ ...f, [k]: v })); }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="sticky top-[52px] z-30 bg-orange-50 -mt-14 pt-14 pb-3 flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Globe size={22} className="text-orange-700" />
          <h1 className="text-xl font-bold text-orange-950">Expatriate</h1>
          {!loading && (
            <span className="ml-1 text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">
              {filtered.length} data
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cari nama, jabatan, dept..."
              className="pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 w-60"
            />
          </div>
          <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
            <button onClick={() => setView("list")} title="Tampilan list"
              className={`p-2 transition ${view === "list" ? "bg-orange-700 text-white" : "text-gray-500 hover:bg-gray-100"}`}>
              <LayoutList size={16} />
            </button>
            <button onClick={() => setView("table")} title="Tampilan tabel"
              className={`p-2 transition ${view === "table" ? "bg-orange-700 text-white" : "text-gray-500 hover:bg-gray-100"}`}>
              <Table2 size={16} />
            </button>
          </div>
          <button onClick={() => router.push("/expatriate/epo")}
            className="flex items-center gap-1.5 border border-red-300 text-red-600 hover:bg-red-50 text-sm px-4 py-2 rounded-lg transition">
            <LogOut size={15} />
            Daftar Keluar
          </button>
          <button onClick={() => setExportModal(true)} disabled={filtered.length === 0}
            className="flex items-center gap-1.5 border border-green-600 text-green-700 hover:bg-green-50 disabled:opacity-40 text-sm px-4 py-2 rounded-lg transition">
            <FileDown size={15} />
            Export Excel
          </button>
          <button onClick={openAdd}
            className="flex items-center gap-1.5 bg-orange-700 hover:bg-orange-800 text-white text-sm px-4 py-2 rounded-lg transition">
            <UserPlus size={15} />
            Tambah Expatriate
          </button>
        </div>
      </div>

      {fetchError && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          <strong>Gagal memuat data:</strong> {fetchError}
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-400">
          <div className="w-8 h-8 border-2 border-orange-300 border-t-orange-600 rounded-full animate-spin" />
          <span className="text-sm">Memuat data...</span>
        </div>
      ) : filtered.length === 0 && !fetchError ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-400">
          <Globe size={40} className="text-gray-200" />
          <p className="text-sm">{search ? "Tidak ada hasil untuk pencarian ini" : "Belum ada data expatriate"}</p>
        </div>
      ) : view === "list" ? (
        /* ── LIST VIEW ── */
        <div className="grid gap-3">
          {filtered.map((expat, i) => {
            // Izin kerja: permit dengan linkedToWorkPermit=true, urutan terkecil (Pengesahan RPTKA)
            const izinKerjaPermit = (expat.permits ?? [])
              .filter(p => p.status !== "replaced" && p.permitType?.linkedToWorkPermit)
              .sort((a, b) => (a.permitType?.order ?? 99) - (b.permitType?.order ?? 99))[0];
            // Extra warning badges: independent permits (not linked, not EPO) expiring ≤ 90 hari
            const warningPermits = (expat.permits ?? []).filter(p => {
              if (p.status === "replaced") return false;
              if (p.permitType?.isEPO) return false;
              if (p.permitType?.linkedToWorkPermit) return false;
              if (izinKerjaPermit && p.id === izinKerjaPermit.id) return false;
              if (!p.permitType?.hasExpiry || !p.expiryDate) return false;
              if (p.permitType?.isOneTime && daysLeft(p.expiryDate) < 0) return false;
              return daysLeft(p.expiryDate) <= 90;
            });
            const urgency = listUrgency(expat);
            const { borderL, avatarBg, avatarText, hoverBorder } = LIST_URGENCY[urgency];
            const initials = expat.name.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join("").toUpperCase();
            const familyCount = expat._count?.families ?? 0;
            const epo = hasEPO(expat);

            return (
              <button key={expat.id} onClick={() => router.push(`/expatriate/${expat.id}`)}
                className={`w-full text-left bg-white border border-gray-200 ${borderL} rounded-xl overflow-hidden hover:shadow-md ${hoverBorder} transition-all duration-200 group`}>
                <div className="flex items-stretch">

                  {/* Avatar */}
                  <div className={`flex items-center justify-center w-16 shrink-0 ${avatarBg}`}>
                    <div className={`w-10 h-10 rounded-full bg-white/25 flex items-center justify-center font-bold text-sm ${avatarText}`}>
                      {initials || "?"}
                    </div>
                  </div>

                  {/* Main content */}
                  <div className="flex-1 min-w-0 px-5 py-3.5">
                    {/* Row 1: name + badges */}
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-semibold text-gray-900 text-[15px] leading-snug">{expat.name}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        expat.gender === "Male" ? "bg-blue-100 text-blue-600" : "bg-pink-100 text-pink-600"
                      }`}>
                        {expat.gender === "Male" ? "Male" : "Female"}
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

                    {/* Row 2: position, dept, arrival, family */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 text-xs text-gray-500">
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

                    {/* Row 3: permit status pills */}
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      {/* Default 1: Passport */}
                      <PermitPill label="Passport" date={expat.passportExpiryDate} />
                      {/* Default 2: Izin Kerja (RPTKA → ITAS → fallback) */}
                      {izinKerjaPermit && (
                        <PermitPill
                          label={izinKerjaPermit.permitType?.name}
                          date={izinKerjaPermit.expiryDate}
                          hasExpiry={izinKerjaPermit.permitType?.hasExpiry}
                          issuedDate={izinKerjaPermit.issuedDate}
                          alwaysShow
                        />
                      )}
                      {/* Extra: permit lain yang ≤ 90 hari / expired */}
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

                  {/* Right: number + chevron */}
                  <div className="flex flex-col items-center justify-center gap-1 px-4 shrink-0">
                    <span className="text-xs text-gray-300 font-medium">#{String(i + 1).padStart(2, "0")}</span>
                    <ChevronRight size={18} className="text-gray-300 group-hover:text-orange-500 transition-colors" />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        /* ── TABLE VIEW ── */
        <TableView data={filtered} permitTypes={permitTypes} onRowClick={id => router.push(`/expatriate/${id}`)} />
      )}

      {/* Modal Tambah */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-6 my-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-lg text-orange-950">Tambah Expatriate</h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <form onSubmit={handleAdd} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Nama Lengkap" value={form.name} onChange={v => setF("name", v)} required span2 />
                <Field label="Tempat Lahir" value={form.birthPlace} onChange={v => setF("birthPlace", v)} required />
                <Field label="Tanggal Lahir" value={form.birthDate} onChange={v => setF("birthDate", v)} type="date" required />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                  <select value={form.gender} onChange={e => setF("gender", e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
              </div>
              <div className="border-t pt-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Passport</p>
                <div className="grid grid-cols-3 gap-4">
                  <Field label="Nomor Passport" value={form.passportNo} onChange={v => setF("passportNo", v)} required />
                  <Field label="Issued Date" value={form.passportIssuedDate} onChange={v => setF("passportIssuedDate", v)} type="date" required />
                  <Field label="Expiry Date" value={form.passportExpiryDate} onChange={v => setF("passportExpiryDate", v)} type="date" required />
                </div>
              </div>
              <div className="border-t pt-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Pekerjaan & Alamat</p>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Jabatan" value={form.position} onChange={v => setF("position", v)} required />
                  <Field label="Department" value={form.department} onChange={v => setF("department", v)} required />
                  <Field label="Present Address" value={form.presentAddress} onChange={v => setF("presentAddress", v)} required span2 textarea />
                  <Field label="Permanent Address" value={form.permanentAddress} onChange={v => setF("permanentAddress", v)} required span2 textarea />
                  <Field label="Arrival Date" value={form.arrivalDate} onChange={v => setF("arrivalDate", v)} type="date" required />
                </div>
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={closeModal}
                  className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-2 text-sm hover:bg-gray-50 transition">Batal</button>
                <button type="submit" disabled={saving}
                  className="flex-1 bg-orange-700 hover:bg-orange-800 text-white rounded-lg py-2 text-sm transition disabled:opacity-60">
                  {saving ? "Menyimpan..." : "Simpan & Buka Detail"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {exportModal && (
        <ExportModal
          data={filtered}
          permitTypes={permitTypes}
          onClose={() => setExportModal(false)}
        />
      )}
    </div>
  );
}

function Field({ label, value, onChange, type = "text", required, span2, textarea }) {
  const cls = `w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400`;
  return (
    <div className={span2 ? "col-span-2" : ""}>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {textarea
        ? <textarea value={value} onChange={e => onChange(e.target.value)} rows={2} className={cls} required={required} />
        : <input type={type} value={value} onChange={e => onChange(e.target.value)} className={cls} required={required} />
      }
    </div>
  );
}

// ─── Export Modal ─────────────────────────────────────────────────────────────

const FIXED_GROUPS = [...new Set(FIXED_EXPORT_COLS.map(c => c.group))];

function ExportModal({ data, permitTypes, onClose }) {
  const nonEpoPermits = permitTypes
    .filter(t => !t.isEPO)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const [selFixed, setSelFixed] = useState(new Set(FIXED_EXPORT_COLS.map(c => c.key)));
  const [selPermits, setSelPermits] = useState(new Set(nonEpoPermits.map(t => t.id)));

  function toggleFixed(key) {
    setSelFixed(prev => { const s = new Set(prev); s.has(key) ? s.delete(key) : s.add(key); return s; });
  }
  function togglePermit(id) {
    setSelPermits(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  }
  function toggleGroup(group) {
    const keys = FIXED_EXPORT_COLS.filter(c => c.group === group).map(c => c.key);
    const allOn = keys.every(k => selFixed.has(k));
    setSelFixed(prev => {
      const s = new Set(prev);
      keys.forEach(k => allOn ? s.delete(k) : s.add(k));
      return s;
    });
  }
  function selectAll() {
    setSelFixed(new Set(FIXED_EXPORT_COLS.map(c => c.key)));
    setSelPermits(new Set(nonEpoPermits.map(t => t.id)));
  }
  function deselectAll() { setSelFixed(new Set()); setSelPermits(new Set()); }

  const totalCols = selFixed.size + selPermits.size * 2;

  function handleExport() {
    const selectedFixed = FIXED_EXPORT_COLS.filter(c => selFixed.has(c.key));
    const selectedPermits = nonEpoPermits.filter(t => selPermits.has(t.id));

    const headers = [
      ...selectedFixed.map(c => c.label),
      ...selectedPermits.flatMap(t => {
        const name = t.name.replace(/\s*\([^)]+\)\s*/g, " ").trim();
        return [name, `${name} - No.`];
      }),
    ];

    const rows = data.map((expat, i) => [
      ...selectedFixed.map(c => getExportValue(expat, c.key, i)),
      ...selectedPermits.flatMap(t => {
        const p = expat.permits?.find(x => x.permitTypeId === t.id);
        if (!p) return ["", ""];
        const dateVal = t.hasExpiry
          ? (p.expiryDate ? fmtDate(p.expiryDate) : "")
          : (p.issuedDate ? fmtDate(p.issuedDate) : "");
        return [dateVal, p.number || ""];
      }),
    ]);

    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    ws["!cols"] = headers.map((h, ci) => ({
      wch: Math.max(h.length + 2, ...rows.map(r => String(r[ci] ?? "").length + 1)),
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Expatriate");
    XLSX.writeFile(wb, `expatriate_${new Date().toISOString().slice(0, 10)}.xlsx`);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
          <div>
            <h2 className="font-bold text-lg text-orange-950">Export ke Excel</h2>
            <p className="text-xs text-gray-400 mt-0.5">{data.length} data · {totalCols} kolom dipilih</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        {/* Select all / none */}
        <div className="flex items-center gap-3 px-6 pb-3 border-b">
          <button onClick={selectAll} className="text-xs font-medium text-orange-700 hover:underline">Pilih Semua</button>
          <span className="text-gray-200">|</span>
          <button onClick={deselectAll} className="text-xs text-gray-400 hover:underline">Hapus Semua</button>
        </div>

        {/* Column list */}
        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-5">
          {FIXED_GROUPS.map(group => {
            const cols = FIXED_EXPORT_COLS.filter(c => c.group === group);
            const allOn = cols.every(c => selFixed.has(c.key));
            return (
              <div key={group}>
                <div className="flex items-center gap-2 mb-2">
                  <button onClick={() => toggleGroup(group)}
                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded transition ${
                      allOn ? "bg-orange-100 text-orange-700" : "bg-gray-100 text-gray-400"
                    }`}>
                    {group}
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-y-2 gap-x-4 pl-1">
                  {cols.map(col => (
                    <label key={col.key} className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={selFixed.has(col.key)} onChange={() => toggleFixed(col.key)}
                        className="rounded accent-orange-600" />
                      <span className={`text-sm ${selFixed.has(col.key) ? "text-gray-800" : "text-gray-400"}`}>
                        {col.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            );
          })}

          {nonEpoPermits.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <button onClick={() => {
                  const allOn = nonEpoPermits.every(t => selPermits.has(t.id));
                  setSelPermits(allOn ? new Set() : new Set(nonEpoPermits.map(t => t.id)));
                }} className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded transition ${
                  nonEpoPermits.every(t => selPermits.has(t.id)) ? "bg-orange-100 text-orange-700" : "bg-gray-100 text-gray-400"
                }`}>
                  Perizinan
                </button>
                <span className="text-[10px] text-gray-400">2 kolom per izin (tanggal + nomor)</span>
              </div>
              <div className="grid grid-cols-2 gap-y-2 gap-x-4 pl-1">
                {nonEpoPermits.map(t => (
                  <label key={t.id} className="flex items-center gap-2 cursor-pointer" title={t.name}>
                    <input type="checkbox" checked={selPermits.has(t.id)} onChange={() => togglePermit(t.id)}
                      className="rounded accent-orange-600" />
                    <span className={`text-sm truncate ${selPermits.has(t.id) ? "text-gray-800" : "text-gray-400"}`}>
                      {t.name.replace(/\s*\([^)]+\)\s*/g, " ").trim()}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t">
          <button onClick={onClose}
            className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-2 text-sm hover:bg-gray-50 transition">
            Batal
          </button>
          <button onClick={handleExport} disabled={totalCols === 0}
            className="flex-1 bg-green-700 hover:bg-green-800 disabled:opacity-40 text-white rounded-lg py-2 text-sm transition flex items-center justify-center gap-2">
            <FileDown size={15} />
            Export ({totalCols} kolom)
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── List View Helpers ────────────────────────────────────────────────────────

function listUrgency(expat) {
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

const LIST_URGENCY = {
  expired:  { borderL: "border-l-4 border-l-red-300",    avatarBg: "bg-red-100",    avatarText: "text-red-500",    hoverBorder: "hover:border-red-400"    },
  critical: { borderL: "border-l-4 border-l-orange-300", avatarBg: "bg-orange-100", avatarText: "text-orange-500", hoverBorder: "hover:border-orange-400" },
  warning:  { borderL: "border-l-4 border-l-yellow-300", avatarBg: "bg-yellow-100", avatarText: "text-yellow-600", hoverBorder: "hover:border-yellow-400" },
  ok:       { borderL: "border-l-4 border-l-green-300",  avatarBg: "bg-green-100",  avatarText: "text-green-600",  hoverBorder: "hover:border-green-400"  },
  none:     { borderL: "border-l-4 border-l-gray-200",   avatarBg: "bg-gray-100",   avatarText: "text-gray-400",   hoverBorder: "hover:border-gray-300"   },
};

function PermitPill({ label, date, hasExpiry = true, isOneTime = false, issuedDate, alwaysShow = false }) {
  let colorCls = "bg-gray-100 text-gray-400";

  if (!hasExpiry) {
    if (issuedDate) colorCls = "bg-blue-100 text-blue-600";
    else if (!alwaysShow) return null;
  } else if (date) {
    const diff = daysLeft(date);
    if (diff < 0)        colorCls = isOneTime ? "bg-gray-100 text-gray-400" : "bg-red-100 text-red-600";
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

// ─── Table View ───────────────────────────────────────────────────────────────

function ExpiryBadge({ date, hasExpiry = true, isOneTime = false, issuedDate, number }) {
  // isOneTime: show number in blue only, never show expiry date
  if (isOneTime) {
    if (!number) return <span className="text-gray-300 text-xs">—</span>;
    return (
      <span className="text-[10px] font-mono text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded max-w-[110px] truncate block" title={number}>
        {number}
      </span>
    );
  }

  const numEl = number
    ? <div className="text-[10px] text-gray-400 mt-0.5 max-w-[100px] truncate" title={number}>{number}</div>
    : null;

  if (!hasExpiry) {
    if (!issuedDate) return <span className="text-gray-300 text-xs">—</span>;
    return (
      <div className="leading-tight">
        <span className="text-[11px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-medium inline-block">
          {fmtShort(issuedDate)}
        </span>
        <div className="text-[10px] text-blue-400 mt-0.5">sekali terbit</div>
        {numEl}
      </div>
    );
  }

  if (!date) return <span className="text-gray-300 text-xs">—</span>;

  const days = daysLeft(date);

  if (days < 0) {
    return (
      <div className="leading-tight">
        <span className="text-[11px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-semibold inline-block">
          {fmtShort(date)}
        </span>
        <div className="text-[10px] text-red-500 mt-0.5 font-medium">{Math.abs(days)}h lalu</div>
        {numEl}
      </div>
    );
  }

  if (days <= 30) return (
    <div className="leading-tight">
      <span className="text-[11px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded font-medium inline-block">
        {fmtShort(date)}
      </span>
      <div className="text-[10px] text-orange-500 mt-0.5">{days}h lagi</div>
      {numEl}
    </div>
  );

  if (days <= 90) return (
    <div className="leading-tight">
      <span className="text-[11px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded font-medium inline-block">
        {fmtShort(date)}
      </span>
      <div className="text-[10px] text-yellow-600 mt-0.5">{days}h lagi</div>
      {numEl}
    </div>
  );

  return (
    <div className="leading-tight">
      <span className="text-[11px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium inline-block">
        {fmtShort(date)}
      </span>
      {numEl}
    </div>
  );
}

function rowUrgency(expat) {
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

const URGENCY = {
  expired:  { bg: "bg-red-50",       hover: "hover:bg-red-100/70",    border: "border-l-[3px] border-l-red-500",    stickyBg: "bg-red-50",    stickyHover: "group-hover:bg-red-100"    },
  critical: { bg: "bg-orange-50/50", hover: "hover:bg-orange-100/60", border: "border-l-[3px] border-l-orange-400", stickyBg: "bg-orange-50", stickyHover: "group-hover:bg-orange-100" },
  warning:  { bg: "bg-yellow-50/40", hover: "hover:bg-yellow-100/50", border: "border-l-[3px] border-l-yellow-400", stickyBg: "bg-yellow-50", stickyHover: "group-hover:bg-yellow-100" },
  ok:       { bg: "bg-white",        hover: "hover:bg-orange-50/40",  border: "border-l-[3px] border-l-transparent", stickyBg: "bg-white",    stickyHover: "group-hover:bg-orange-50"  },
  none:     { bg: "bg-white",        hover: "hover:bg-orange-50/40",  border: "border-l-[3px] border-l-transparent", stickyBg: "bg-white",    stickyHover: "group-hover:bg-orange-50"  },
};

function shortPermitName(name) {
  return name.replace(/\s*\([^)]+\)\s*/g, " ").trim();
}

const LEGEND = [
  { color: "bg-red-400",    label: "Expired / hampir expired" },
  { color: "bg-orange-400", label: "≤ 30 hari" },
  { color: "bg-yellow-400", label: "≤ 90 hari" },
  { color: "bg-green-500",  label: "Aman" },
  { color: "bg-blue-400",   label: "Sekali terbit" },
];

function LinkedNumberCell({ permit }) {
  const diff = permit.expiryDate ? daysLeft(permit.expiryDate) : null;
  let bg = "bg-gray-100 text-gray-600";
  if (diff !== null) {
    if (diff < 0)        bg = "bg-red-100 text-red-700";
    else if (diff <= 30) bg = "bg-orange-100 text-orange-700";
    else if (diff <= 90) bg = "bg-yellow-100 text-yellow-700";
    else                 bg = "bg-green-50 text-green-700";
  }
  return (
    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded block max-w-[110px] truncate ${bg}`}
      title={permit.number}>
      {permit.number || "✓"}
    </span>
  );
}

function TableView({ data, permitTypes, onRowClick }) {
  // All non-EPO permit types as columns, sorted by order — always show all columns
  const permitCols = permitTypes
    .filter(t => !t.isEPO)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.name.localeCompare(b.name));

  // Primary work permit = linkedToWorkPermit with lowest order (Pengesahan RPTKA)
  const mainWorkPermitId = permitCols.find(c => c.linkedToWorkPermit)?.id;

  return (
    <div className="space-y-3">
      {/* Legend + summary */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
          <span className="font-semibold text-gray-600">Keterangan warna:</span>
          {LEGEND.map(({ color, label }) => (
            <span key={label} className="flex items-center gap-1.5">
              <span className={`w-2.5 h-2.5 rounded-full ${color} shrink-0`} />
              {label}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-3 text-xs">
          {[
            { label: "Expired",   count: data.filter(e => rowUrgency(e) === "expired").length,  color: "text-red-600 bg-red-50 border-red-200" },
            { label: "Kritis",    count: data.filter(e => rowUrgency(e) === "critical").length,  color: "text-orange-600 bg-orange-50 border-orange-200" },
            { label: "Perhatian", count: data.filter(e => rowUrgency(e) === "warning").length,   color: "text-yellow-700 bg-yellow-50 border-yellow-200" },
          ].map(({ label, count, color }) => count > 0 && (
            <span key={label} className={`px-2.5 py-1 rounded-full border font-semibold ${color}`}>
              {count} {label}
            </span>
          ))}
        </div>
      </div>

      <div className="overflow-auto rounded-xl border border-gray-200 shadow-sm max-h-[calc(100vh-13rem)]">
        <table className="w-full text-sm border-separate" style={{ borderSpacing: 0 }}>
          <thead className="sticky top-0 z-20">
            {/* ── Group headers ── */}
            <tr className="bg-orange-950 text-orange-200 text-[10px] font-bold uppercase tracking-widest">
              <th className="sticky left-0 z-20 w-10 px-3 py-2 bg-orange-950 shadow-[1px_0_0_0_#9a3412]" style={{ width: '40px', minWidth: '40px', maxWidth: '40px' }} />
              <th colSpan={2} className="px-4 py-2 text-left border-l border-orange-800">Identitas</th>
              <th colSpan={2} className="px-4 py-2 text-left border-l border-orange-800">Pekerjaan</th>
              <th colSpan={2} className="px-4 py-2 text-left border-l border-orange-800">Kedatangan</th>
              <th colSpan={1} className="px-4 py-2 text-left border-l border-orange-800">Passport</th>
              {permitCols.length > 0 && (
                <th colSpan={permitCols.length} className="px-4 py-2 text-left border-l border-orange-800">Perizinan</th>
              )}
              <th colSpan={1} className="px-4 py-2 text-left border-l border-orange-800">Status</th>
            </tr>
            {/* ── Column headers ── */}
            <tr className="bg-orange-50 border-b-2 border-orange-200 text-[11px] font-semibold text-orange-900 whitespace-nowrap">
              <th className="sticky left-0 z-20 w-10 px-3 py-2.5 text-center text-gray-500 bg-orange-50" style={{ width: '40px', minWidth: '40px', maxWidth: '40px' }}>#</th>
              <th className="sticky left-10 z-20 px-3 py-2.5 text-left min-w-[170px] bg-orange-50 shadow-[1px_0_0_0_#fed7aa]">Nama</th>
              <th className="px-3 py-2.5 text-center">Gender</th>
              <th className="px-3 py-2.5 text-left border-l border-orange-100 min-w-[130px]">Jabatan</th>
              <th className="px-3 py-2.5 text-left min-w-[120px]">Dept.</th>
              <th className="px-3 py-2.5 text-left border-l border-orange-100">Arrival</th>
              <th className="px-3 py-2.5 text-center">Perp.</th>
              <th className="px-3 py-2.5 text-left border-l border-orange-100">Passport Exp.</th>
              {permitCols.map((col, idx) => (
                <th key={col.id} title={col.name}
                  className={`px-3 py-2.5 text-left ${idx === 0 ? "border-l border-orange-100" : ""}`}>
                  {shortPermitName(col.name)}
                </th>
              ))}
              <th className="px-3 py-2.5 text-center border-l border-orange-100">Keluarga</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100">
            {data.map((expat, i) => {
              const epoPermit = expat.permits?.find(p => p.permitType?.isEPO);
              const urgency = rowUrgency(expat);
              const { bg, hover, border, stickyBg, stickyHover } = URGENCY[urgency];

              return (
                <tr key={expat.id} onClick={() => onRowClick(expat.id)}
                  className={`group cursor-pointer transition ${bg} ${hover}`}>

                  <td className={`sticky left-0 z-10 px-3 py-3 text-center text-gray-400 text-xs font-medium w-10 transition ${stickyBg} ${stickyHover} ${border}`} style={{ width: '40px', minWidth: '40px', maxWidth: '40px' }}>
                    {i + 1}
                  </td>

                  <td className={`sticky left-10 z-10 px-3 py-3 min-w-[170px] shadow-[1px_0_0_0_#e5e7eb] transition ${stickyBg} ${stickyHover}`}>
                    <div className="font-semibold text-gray-900 text-[13px] leading-snug">{expat.name}</div>
                    {epoPermit && (
                      <span className="mt-0.5 inline-block text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-semibold leading-none">
                        EPO
                      </span>
                    )}
                  </td>

                  <td className="px-3 py-3 text-center">
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                      expat.gender === "Male" ? "bg-blue-100 text-blue-700" : "bg-pink-100 text-pink-700"
                    }`}>
                      {expat.gender === "Male" ? "M" : "F"}
                    </span>
                  </td>

                  <td className="px-3 py-3 border-l border-gray-100">
                    <div className="text-gray-800 text-[12px] font-medium max-w-[140px] truncate leading-snug" title={expat.position}>
                      {expat.position}
                    </div>
                  </td>

                  <td className="px-3 py-3">
                    <div className="text-gray-500 text-[12px] max-w-[130px] truncate" title={expat.department}>
                      {expat.department}
                    </div>
                  </td>

                  <td className="px-3 py-3 border-l border-gray-100 whitespace-nowrap">
                    <div className="text-gray-600 text-xs">{fmtShort(expat.arrivalDate)}</div>
                  </td>

                  <td className="px-3 py-3 text-center">
                    {expat.renewalNo != null
                      ? <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-orange-100 text-orange-700 text-xs font-bold">
                          {expat.renewalNo}
                        </span>
                      : <span className="text-gray-300 text-xs">—</span>
                    }
                  </td>

                  <td className="px-3 py-3 border-l border-gray-100">
                    <ExpiryBadge date={expat.passportExpiryDate} number={expat.passportNo} />
                  </td>

                  {/* Permit columns — match by permitTypeId */}
                  {permitCols.map((col, idx) => {
                    const p = expat.permits?.find(x => x.permitTypeId === col.id);
                    const isLinkedNonPrimary = col.linkedToWorkPermit && col.id !== mainWorkPermitId;
                    const isNumberOnly = isLinkedNonPrimary || shortPermitName(col.name) === "HPK";
                    return (
                      <td key={col.id} className={`px-3 py-3 ${idx === 0 ? "border-l border-gray-100" : ""}`}>
                        {isNumberOnly
                          ? p
                            ? <LinkedNumberCell permit={p} />
                            : <span className="text-gray-200 text-xs">—</span>
                          : p
                            ? <ExpiryBadge
                                date={p.expiryDate}
                                hasExpiry={p.permitType?.hasExpiry}
                                isOneTime={p.permitType?.isOneTime}
                                issuedDate={p.issuedDate}
                                number={p.number}
                              />
                            : <span className="text-gray-200 text-xs">—</span>
                        }
                      </td>
                    );
                  })}

                  <td className="px-3 py-3 text-center border-l border-gray-100">
                    {(expat._count?.families ?? 0) > 0
                      ? <span className="inline-flex items-center gap-1 text-xs font-semibold text-gray-700">
                          <Users size={12} className="text-gray-400" />
                          {expat._count.families}
                        </span>
                      : <span className="text-gray-300 text-xs">—</span>
                    }
                  </td>
                </tr>
              );
            })}
          </tbody>

          {/* Summary footer */}
          <tfoot>
            <tr className="bg-gray-50 border-t-2 border-gray-200 text-xs text-gray-400">
              <td colSpan={3} className="px-3 py-2 font-medium text-gray-500">
                Total: {data.length} expatriate
              </td>
              <td colSpan={4} />
              <td className="px-3 py-2" />
              {permitCols.map(col => (
                <td key={col.id} className="px-3 py-2 text-center">
                  {data.filter(e => e.permits?.some(p => p.permitTypeId === col.id)).length}
                </td>
              ))}
              <td className="px-3 py-2 text-center">
                {data.reduce((sum, e) => sum + (e._count?.families ?? 0), 0)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
