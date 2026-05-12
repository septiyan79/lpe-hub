"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Globe, UserPlus, X, Search, Users, Briefcase,
  ChevronRight, CalendarDays, LayoutList, Table2,
} from "lucide-react";

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
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [view, setView] = useState("list");
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [fetchError, setFetchError] = useState("");

  async function fetchList() {
    setLoading(true);
    setFetchError("");
    try {
      const res = await fetch("/api/expatriate");
      if (res.ok) {
        setList(await res.json());
      } else {
        const data = await res.json().catch(() => ({}));
        setFetchError(`Error ${res.status}: ${data.error || res.statusText}`);
      }
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
      <div className="flex items-center justify-between mb-6">
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
        <div className="text-center py-16 text-gray-400">Memuat data...</div>
      ) : filtered.length === 0 && !fetchError ? (
        <div className="text-center py-16 text-gray-400">
          {search ? "Tidak ada hasil untuk pencarian ini" : "Belum ada data expatriate"}
        </div>
      ) : view === "list" ? (
        /* ── LIST VIEW ── */
        <div className="grid gap-3">
          {filtered.map(expat => {
            const rptka = permitByName(expat.permits, "RPTKA")?.expiryDate;
            const itas = permitByName(expat.permits, "ITAS")?.expiryDate;
            return (
              <button key={expat.id} onClick={() => router.push(`/expatriate/${expat.id}`)}
                className="w-full text-left bg-white border border-gray-200 rounded-xl px-5 py-4 hover:border-orange-300 hover:shadow-sm transition group">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1.5">
                      <span className="font-semibold text-gray-900 text-base">{expat.name}</span>
                      {hasEPO(expat) && (
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">EPO</span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-gray-500">
                      <span className="flex items-center gap-1"><Briefcase size={13} /> {expat.position} — {expat.department}</span>
                      <span className="flex items-center gap-1"><CalendarDays size={13} /> Tiba {fmtDate(expat.arrivalDate)}</span>
                      <span className="flex items-center gap-1"><Users size={13} /> {expat._count?.families ?? 0} keluarga</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 ml-4 shrink-0">
                    {rptka && (
                      <div className="text-right">
                        <div className="text-xs text-gray-400 mb-0.5">RPTKA exp.</div>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${expiryBadge(rptka)}`}>{fmtDate(rptka)}</span>
                      </div>
                    )}
                    {itas && (
                      <div className="text-right">
                        <div className="text-xs text-gray-400 mb-0.5">ITAS exp.</div>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${expiryBadge(itas)}`}>{fmtDate(itas)}</span>
                      </div>
                    )}
                    <ChevronRight size={18} className="text-gray-300 group-hover:text-orange-500 transition" />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        /* ── TABLE VIEW ── */
        <TableView data={filtered} onRowClick={id => router.push(`/expatriate/${id}`)} />
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

// ─── Table View ───────────────────────────────────────────────────────────────

function ExpiryBadge({ date, hasExpiry = true, issuedDate, number }) {
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

  if (days < 0) return (
    <div className="leading-tight">
      <span className="text-[11px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-semibold inline-block">
        {fmtShort(date)}
      </span>
      <div className="text-[10px] text-red-500 mt-0.5 font-medium">{Math.abs(days)}h lalu</div>
      {numEl}
    </div>
  );

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
      .filter(p => p.expiryDate && p.permitType?.hasExpiry && !p.permitType?.isEPO)
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
  expired: { bg: "bg-red-50",       hover: "hover:bg-red-100/70",    border: "border-l-[3px] border-l-red-500"    },
  critical: { bg: "bg-orange-50/50", hover: "hover:bg-orange-100/60", border: "border-l-[3px] border-l-orange-400" },
  warning:  { bg: "bg-yellow-50/40", hover: "hover:bg-yellow-100/50", border: "border-l-[3px] border-l-yellow-400" },
  ok:       { bg: "bg-white",        hover: "hover:bg-orange-50/40",  border: "border-l-[3px] border-l-transparent" },
  none:     { bg: "bg-white",        hover: "hover:bg-orange-50/40",  border: "border-l-[3px] border-l-transparent" },
};

const TABLE_PERMIT_COLS = [
  "HPK", "RPTKA", "eVisa", "ITAS", "SKTT", "TTKOA",
  "SKLK-Karawang", "TTP-Karawang", "Keberadaan-Karawang",
];

const LEGEND = [
  { color: "bg-red-400",    label: "Expired / hampir expired" },
  { color: "bg-orange-400", label: "≤ 30 hari" },
  { color: "bg-yellow-400", label: "≤ 90 hari" },
  { color: "bg-green-500",  label: "Aman" },
  { color: "bg-blue-400",   label: "Sekali terbit" },
];

function TableView({ data, onRowClick }) {
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
            { label: "Expired", count: data.filter(e => rowUrgency(e) === "expired").length, color: "text-red-600 bg-red-50 border-red-200" },
            { label: "Kritis",  count: data.filter(e => rowUrgency(e) === "critical").length, color: "text-orange-600 bg-orange-50 border-orange-200" },
            { label: "Perhatian", count: data.filter(e => rowUrgency(e) === "warning").length, color: "text-yellow-700 bg-yellow-50 border-yellow-200" },
          ].map(({ label, count, color }) => count > 0 && (
            <span key={label} className={`px-2.5 py-1 rounded-full border font-semibold ${color}`}>
              {count} {label}
            </span>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
        <table className="w-full text-sm border-collapse">
          <thead className="sticky top-0 z-20">
            {/* ── Group headers ── */}
            <tr className="bg-orange-950 text-orange-200 text-[10px] font-bold uppercase tracking-widest">
              <th className="w-10 px-3 py-2" />
              <th colSpan={2} className="px-4 py-2 text-left border-l border-orange-800">Identitas</th>
              <th colSpan={2} className="px-4 py-2 text-left border-l border-orange-800">Pekerjaan</th>
              <th colSpan={2} className="px-4 py-2 text-left border-l border-orange-800">Kedatangan</th>
              <th colSpan={1} className="px-4 py-2 text-left border-l border-orange-800">Passport</th>
              <th colSpan={TABLE_PERMIT_COLS.length} className="px-4 py-2 text-left border-l border-orange-800">
                Perizinan
              </th>
              <th colSpan={2} className="px-4 py-2 text-left border-l border-orange-800">Status</th>
            </tr>
            {/* ── Column headers ── */}
            <tr className="bg-orange-50 border-b-2 border-orange-200 text-[11px] font-semibold text-orange-900 whitespace-nowrap">
              <th className="w-10 px-3 py-2.5 text-center text-gray-500">#</th>
              <th className="px-3 py-2.5 text-left border-l border-orange-100 min-w-[170px]">Nama</th>
              <th className="px-3 py-2.5 text-center">Gender</th>
              <th className="px-3 py-2.5 text-left border-l border-orange-100 min-w-[130px]">Jabatan</th>
              <th className="px-3 py-2.5 text-left min-w-[120px]">Dept.</th>
              <th className="px-3 py-2.5 text-left border-l border-orange-100">Arrival</th>
              <th className="px-3 py-2.5 text-center">Perp.</th>
              <th className="px-3 py-2.5 text-left border-l border-orange-100">Passport Exp.</th>
              {TABLE_PERMIT_COLS.map((name, idx) => (
                <th key={name} className={`px-3 py-2.5 text-left ${idx === 0 ? "border-l border-orange-100" : ""}`}>
                  {name}
                </th>
              ))}
              <th className="px-3 py-2.5 text-center border-l border-orange-100">Keluarga</th>
              <th className="px-3 py-2.5 text-center">EPO</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100">
            {data.map((expat, i) => {
              const epoPermit = expat.permits?.find(p => p.permitType?.isEPO);
              const urgency = rowUrgency(expat);
              const { bg, hover, border } = URGENCY[urgency];

              return (
                <tr key={expat.id} onClick={() => onRowClick(expat.id)}
                  className={`cursor-pointer transition ${bg} ${hover} ${border}`}>

                  {/* No */}
                  <td className="px-3 py-3 text-center text-gray-400 text-xs font-medium w-10">
                    {i + 1}
                  </td>

                  {/* Nama */}
                  <td className="px-3 py-3 border-l border-gray-100 min-w-[170px]">
                    <div className="font-semibold text-gray-900 text-[13px] leading-snug">{expat.name}</div>
                    {epoPermit && (
                      <span className="mt-0.5 inline-block text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-semibold leading-none">
                        EPO
                      </span>
                    )}
                  </td>

                  {/* Gender */}
                  <td className="px-3 py-3 text-center">
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                      expat.gender === "Male" ? "bg-blue-100 text-blue-700" : "bg-pink-100 text-pink-700"
                    }`}>
                      {expat.gender === "Male" ? "M" : "F"}
                    </span>
                  </td>

                  {/* Jabatan */}
                  <td className="px-3 py-3 border-l border-gray-100">
                    <div className="text-gray-800 text-[12px] font-medium max-w-[140px] truncate leading-snug" title={expat.position}>
                      {expat.position}
                    </div>
                  </td>

                  {/* Department */}
                  <td className="px-3 py-3">
                    <div className="text-gray-500 text-[12px] max-w-[130px] truncate" title={expat.department}>
                      {expat.department}
                    </div>
                  </td>

                  {/* Arrival */}
                  <td className="px-3 py-3 border-l border-gray-100 whitespace-nowrap">
                    <div className="text-gray-600 text-xs">{fmtShort(expat.arrivalDate)}</div>
                  </td>

                  {/* Perpanjangan ke- */}
                  <td className="px-3 py-3 text-center">
                    {expat.renewalNo != null
                      ? <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-orange-100 text-orange-700 text-xs font-bold">
                          {expat.renewalNo}
                        </span>
                      : <span className="text-gray-300 text-xs">—</span>
                    }
                  </td>

                  {/* Passport Expiry */}
                  <td className="px-3 py-3 border-l border-gray-100">
                    <ExpiryBadge date={expat.passportExpiryDate} number={expat.passportNo} />
                  </td>

                  {/* Permit columns */}
                  {TABLE_PERMIT_COLS.map((name, idx) => {
                    const p = expat.permits?.find(x => x.permitType?.name === name);
                    return (
                      <td key={name} className={`px-3 py-3 ${idx === 0 ? "border-l border-gray-100" : ""}`}>
                        {p
                          ? <ExpiryBadge
                              date={p.expiryDate}
                              hasExpiry={p.permitType?.hasExpiry}
                              issuedDate={p.issuedDate}
                              number={p.number}
                            />
                          : <span className="text-gray-200 text-xs">—</span>
                        }
                      </td>
                    );
                  })}

                  {/* Keluarga */}
                  <td className="px-3 py-3 text-center border-l border-gray-100">
                    {(expat._count?.families ?? 0) > 0
                      ? <span className="inline-flex items-center gap-1 text-xs font-semibold text-gray-700">
                          <Users size={12} className="text-gray-400" />
                          {expat._count.families}
                        </span>
                      : <span className="text-gray-300 text-xs">—</span>
                    }
                  </td>

                  {/* EPO */}
                  <td className="px-3 py-3 text-center">
                    {epoPermit
                      ? <div className="leading-tight">
                          <span className="text-[11px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-semibold inline-block">
                            {fmtShort(epoPermit.expiryDate || epoPermit.issuedDate)}
                          </span>
                          {epoPermit.number && (
                            <div className="text-[10px] text-gray-400 mt-0.5 max-w-[90px] truncate mx-auto" title={epoPermit.number}>
                              {epoPermit.number}
                            </div>
                          )}
                        </div>
                      : <span className="text-gray-200 text-xs">—</span>
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
              {TABLE_PERMIT_COLS.map(name => (
                <td key={name} className="px-3 py-2 text-center">
                  <span className="text-gray-400">
                    {data.filter(e => e.permits?.some(p => p.permitType?.name === name)).length}
                  </span>
                </td>
              ))}
              <td className="px-3 py-2 text-center text-gray-400">
                {data.reduce((sum, e) => sum + (e._count?.families ?? 0), 0)}
              </td>
              <td className="px-3 py-2 text-center text-gray-400">
                {data.filter(e => e.permits?.some(p => p.permitType?.isEPO)).length}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
