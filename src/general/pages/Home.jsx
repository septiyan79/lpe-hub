import React from 'react';
import { LayoutGrid, ClipboardList, Clock, Sparkles } from 'lucide-react'; // Opsional jika pakai lucide-react

function Home() {
  return (
    <div className='max-w-7xl mx-auto p-6 md:p-8 space-y-8'>
      
      {/* SECTION 1: WELCOME BANNER */}
      <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl p-8 text-white shadow-lg shadow-orange-100">
        <div className="md:flex justify-between items-center">
          <div className="max-w-2xl">
            <h1 className="text-3xl font-extrabold mb-2">Selamat Datang 👋</h1>
            <p className="text-orange-100 leading-relaxed">
              Ini adalah asisten digital pribadi Anda. Semua data tersimpan aman secara lokal untuk membantu Anda tetap produktif setiap hari tanpa hambatan.
            </p>
          </div>
          <div className="hidden md:block">
             <Sparkles size={64} className="text-orange-300 opacity-50" />
          </div>
        </div>
      </div>

      {/* SECTION 2: STATS / RINGKASAN */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><ClipboardList size={20}/></div>
            <span className="text-sm font-medium text-slate-500">Tugas Aktif</span>
          </div>
          <p className="text-2xl font-bold text-slate-800">12</p>
        </div>
        
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-100 text-green-600 rounded-lg"><Clock size={20}/></div>
            <span className="text-sm font-medium text-slate-500">Jam Produktif</span>
          </div>
          <p className="text-2xl font-bold text-slate-800">5.4 Jam</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-100 text-purple-600 rounded-lg"><LayoutGrid size={20}/></div>
            <span className="text-sm font-medium text-slate-500">Kapasitas Storage</span>
          </div>
          <p className="text-2xl font-bold text-slate-800">85% Tersedia</p>
        </div>
      </div>

      {/* SECTION 3: MAIN CONTENT AREA (GRID 2 COLUMN) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Kolom Kiri - Agenda/Tugas (Lebar) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <h3 className="font-bold text-slate-800">Aktivitas Terkini</h3>
              <button className="text-sm text-orange-600 font-semibold hover:underline">Lihat Semua</button>
            </div>
            <div className="p-6 text-center py-12">
              <p className="text-slate-400 text-sm">Belum ada aktivitas yang tercatat hari ini.</p>
            </div>
          </div>
        </div>

        {/* Kolom Kanan - Info & Local Storage (Sempit) */}
        <div className="space-y-6">
          {/* Info Local Storage */}
          <div className="bg-blue-50 border border-blue-100 p-5 rounded-xl">
            <div className="flex items-center gap-2 text-blue-800 font-bold mb-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>
              <span className="text-sm">Privasi & Data</span>
            </div>
            <p className="text-xs text-blue-700 leading-relaxed">
              Aplikasi ini menggunakan <b>Local Storage</b>. Data Anda tersimpan 100% di browser ini secara privat dan tidak dikirim ke server luar.
            </p>
            <div className="mt-4 pt-4 border-t border-blue-200">
               <button className="text-xs font-bold text-blue-600 hover:text-blue-800 uppercase tracking-wider">Pelajari Selengkapnya</button>
            </div>
          </div>

          {/* Tips Produktivitas */}
          <div className="bg-slate-800 p-5 rounded-xl text-white">
            <h4 className="text-sm font-bold mb-2 text-orange-400 italic">Tips Hari Ini</h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              "Fokus pada satu tugas besar di pagi hari sebelum memeriksa pesan masuk untuk hasil kerja yang lebih maksimal."
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}

export default Home;