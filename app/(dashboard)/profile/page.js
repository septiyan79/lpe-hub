"use client";

import { useSession } from "next-auth/react";
import { useState } from "react";
import { User, Lock, CheckCircle, AlertCircle } from "lucide-react";

function Alert({ type, message }) {
  if (!message) return null;
  const isError = type === "error";
  return (
    <div
      className={`flex items-center gap-2 text-sm px-4 py-2.5 rounded-lg ${
        isError
          ? "bg-red-50 text-red-700 border border-red-200"
          : "bg-green-50 text-green-700 border border-green-200"
      }`}
    >
      {isError ? <AlertCircle size={15} /> : <CheckCircle size={15} />}
      {message}
    </div>
  );
}

export default function ProfilePage() {
  const { data: session, update } = useSession();

  const [name, setName] = useState("");
  const [nameStatus, setNameStatus] = useState({ type: "", message: "" });
  const [nameLoading, setNameLoading] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passStatus, setPassStatus] = useState({ type: "", message: "" });
  const [passLoading, setPassLoading] = useState(false);

  async function handleNameSubmit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setNameLoading(true);
    setNameStatus({ type: "", message: "" });

    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) {
        setNameStatus({ type: "error", message: data.error });
      } else {
        await update({ name: data.name });
        setName("");
        setNameStatus({ type: "success", message: "Nama berhasil diperbarui" });
      }
    } catch {
      setNameStatus({ type: "error", message: "Terjadi kesalahan, coba lagi" });
    } finally {
      setNameLoading(false);
    }
  }

  async function handlePasswordSubmit(e) {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) return;
    if (newPassword !== confirmPassword) {
      setPassStatus({ type: "error", message: "Konfirmasi password tidak cocok" });
      return;
    }
    setPassLoading(true);
    setPassStatus({ type: "", message: "" });

    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPassStatus({ type: "error", message: data.error });
      } else {
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setPassStatus({ type: "success", message: "Password berhasil diperbarui" });
      }
    } catch {
      setPassStatus({ type: "error", message: "Terjadi kesalahan, coba lagi" });
    } finally {
      setPassLoading(false);
    }
  }

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-2xl font-bold text-orange-950">Profil Saya</h1>

      {/* Info akun */}
      <div className="bg-white rounded-xl border border-orange-100 shadow-sm p-5 space-y-3">
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Nama</p>
          <p className="font-medium text-gray-800">{session?.user?.name}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Email</p>
          <p className="font-medium text-gray-800">{session?.user?.email}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Role</p>
          <p className="font-medium text-gray-800 capitalize">{session?.user?.role}</p>
        </div>
      </div>

      {/* Ubah Nama */}
      <div className="bg-white rounded-xl border border-orange-100 shadow-sm p-5">
        <h2 className="flex items-center gap-2 font-semibold text-orange-950 mb-4">
          <User size={17} /> Ubah Nama
        </h2>
        <form onSubmit={handleNameSubmit} className="space-y-3">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={`Nama saat ini: ${session?.user?.name ?? ""}`}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
          <Alert type={nameStatus.type} message={nameStatus.message} />
          <button
            type="submit"
            disabled={!name.trim() || nameLoading}
            className="px-4 py-2 bg-orange-950 text-white text-sm rounded-lg hover:bg-orange-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {nameLoading ? "Menyimpan..." : "Simpan Nama"}
          </button>
        </form>
      </div>

      {/* Ubah Password */}
      <div className="bg-white rounded-xl border border-orange-100 shadow-sm p-5">
        <h2 className="flex items-center gap-2 font-semibold text-orange-950 mb-4">
          <Lock size={17} /> Ubah Password
        </h2>
        <form onSubmit={handlePasswordSubmit} className="space-y-3">
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="Password saat ini"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Password baru (min. 6 karakter)"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Konfirmasi password baru"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
          <Alert type={passStatus.type} message={passStatus.message} />
          <button
            type="submit"
            disabled={!currentPassword || !newPassword || !confirmPassword || passLoading}
            className="px-4 py-2 bg-orange-950 text-white text-sm rounded-lg hover:bg-orange-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {passLoading ? "Menyimpan..." : "Simpan Password"}
          </button>
        </form>
      </div>
    </div>
  );
}
