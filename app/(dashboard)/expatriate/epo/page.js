"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, LogOut, Search, CalendarDays, Briefcase, Users } from "lucide-react";

function fmtDate(d) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

export default function EPOPage() {
  const router = useRouter();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/expatriate")
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        setList(data.filter(e => e.permits?.some(p => p.permitType?.isEPO)));
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = list.filter(e =>
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    e.department.toLowerCase().includes(search.toLowerCase()) ||
    e.position.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">

      {/* ── Sticky Header ── */}
      <div className="sticky top-[52px] z-30 bg-orange-50 -mt-14 pt-14 pb-3 flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/expatriate")}
            className="p-1.5 rounded-lg hover:bg-orange-100 text-orange-700 transition">
            <ArrowLeft size={18} />
          </button>
          <LogOut size={20} className="text-red-500" />
          <div>
            <h1 className="text-lg font-bold text-orange-950 leading-tight">Daftar Expatriate Keluar</h1>
            <p className="text-xs text-gray-500">Expatriate dengan Exit Permit Only (EPO)</p>
          </div>
          {!loading && (
            <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">
              {filtered.length} orang
            </span>
          )}
        </div>
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cari nama, jabatan, dept..."
            className="pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 w-60"
          />
        </div>
      </div>

      {/* ── Content ── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-400">
          <div className="w-8 h-8 border-2 border-orange-300 border-t-orange-600 rounded-full animate-spin" />
          <span className="text-sm">Memuat data...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-400">
          <LogOut size={40} className="text-gray-200" />
          <p className="text-sm">
            {search ? "Tidak ada hasil untuk pencarian ini" : "Tidak ada expatriate dengan EPO"}
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-red-950 text-red-200 text-[10px] font-bold uppercase tracking-widest">
                <th className="w-10 px-4 py-2.5 text-center">#</th>
                <th className="px-4 py-2.5 text-left border-l border-red-800">Nama</th>
                <th className="px-4 py-2.5 text-left border-l border-red-800">Jabatan</th>
                <th className="px-4 py-2.5 text-left border-l border-red-800">Departemen</th>
                <th className="px-4 py-2.5 text-left border-l border-red-800">Tgl Tiba</th>
                <th className="px-4 py-2.5 text-left border-l border-red-800">No. EPO</th>
                <th className="px-4 py-2.5 text-left border-l border-red-800">Tgl EPO</th>
                <th className="px-4 py-2.5 text-center border-l border-red-800">Keluarga</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((expat, i) => {
                const epoPermit = expat.permits?.find(p => p.permitType?.isEPO);
                const familyCount = expat._count?.families ?? 0;
                return (
                  <tr key={expat.id} onClick={() => router.push(`/expatriate/${expat.id}`)}
                    className="bg-white hover:bg-red-50/40 transition-colors cursor-pointer group">
                    <td className="px-4 py-3.5 text-center text-xs text-gray-400 font-medium">{i + 1}</td>

                    <td className="px-4 py-3.5 border-l border-gray-100">
                      <div className="font-semibold text-gray-900">{expat.name}</div>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                        expat.gender === "Male" ? "bg-blue-100 text-blue-600" : "bg-pink-100 text-pink-600"
                      }`}>
                        {expat.gender}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 border-l border-gray-100 text-sm text-gray-700">
                      <div className="flex items-center gap-1">
                        <Briefcase size={11} className="text-gray-400 shrink-0" />
                        <span className="truncate max-w-[150px]" title={expat.position}>{expat.position}</span>
                      </div>
                    </td>

                    <td className="px-4 py-3.5 border-l border-gray-100 text-sm text-gray-500">
                      {expat.department}
                    </td>

                    <td className="px-4 py-3.5 border-l border-gray-100 text-sm text-gray-500 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <CalendarDays size={11} className="text-gray-400" />
                        {fmtDate(expat.arrivalDate)}
                      </div>
                    </td>

                    <td className="px-4 py-3.5 border-l border-gray-100">
                      {epoPermit?.number
                        ? <span className="text-[11px] font-mono text-red-700 bg-red-50 px-1.5 py-0.5 rounded">
                            {epoPermit.number}
                          </span>
                        : <span className="text-gray-300">—</span>
                      }
                    </td>

                    <td className="px-4 py-3.5 border-l border-gray-100 text-sm text-gray-500 whitespace-nowrap">
                      {epoPermit?.issuedDate
                        ? fmtDate(epoPermit.issuedDate)
                        : <span className="text-gray-300">—</span>
                      }
                    </td>

                    <td className="px-4 py-3.5 border-l border-gray-100 text-center">
                      {familyCount > 0
                        ? <span className="inline-flex items-center gap-1 text-xs font-semibold text-gray-600">
                            <Users size={11} className="text-gray-400" />
                            {familyCount}
                          </span>
                        : <span className="text-gray-300">—</span>
                      }
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 border-t-2 border-gray-200">
                <td colSpan={8} className="px-4 py-2.5 text-xs text-gray-400 font-medium">
                  Total: {filtered.length} expatriate keluar
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
