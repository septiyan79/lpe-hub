import { auth } from "@/lib/auth";
import { Sparkles } from "lucide-react";

export default async function HomePage() {
  const session = await auth();

  return (
    <div className="space-y-6">
      <div className="bg-orange-950 text-white rounded-2xl p-6 flex items-center gap-4">
        <Sparkles size={32} className="text-orange-300 shrink-0" />
        <div>
          <h1 className="text-xl font-bold">Selamat datang, {session?.user?.name}!</h1>
          <p className="text-orange-200 text-sm mt-1">
            LPE HUB — Portal aktivitas karyawan internal
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-orange-100">
          <p className="text-sm text-gray-500">Role</p>
          <p className="text-lg font-semibold text-orange-950 capitalize mt-1">
            {session?.user?.role}
          </p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-orange-100">
          <p className="text-sm text-gray-500">Email</p>
          <p className="text-lg font-semibold text-orange-950 mt-1">
            {session?.user?.email}
          </p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-orange-100">
          <p className="text-sm text-gray-500">Status</p>
          <p className="text-lg font-semibold text-green-600 mt-1">Aktif</p>
        </div>
      </div>

      <div className="bg-white rounded-xl p-5 shadow-sm border border-orange-100">
        <h2 className="font-semibold text-orange-950 mb-3">Menu Tersedia</h2>
        <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
          <li>Todo List — kelola tugas harian</li>
          <li>Activity Notes — catat aktivitas dan progres pekerjaan</li>
        </ul>
      </div>
    </div>
  );
}
