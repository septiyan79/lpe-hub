"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutList, BookOpen, Home, LogOut, ShieldCheck,
  UserCircle, Globe, Settings, ChevronDown,
} from "lucide-react";

const navLinks = [
  { href: "/", label: "Home", icon: Home },
  { href: "/notes", label: "Activity Notes", icon: BookOpen },
  { href: "/todolist", label: "Todo List", icon: LayoutList },
];

const adminLinks = [
  { href: "/admin/users", label: "Kelola User", icon: ShieldCheck },
];

const expatSubLinks = [
  { href: "/expatriate", label: "Daftar Expat", icon: Globe, exact: true },
  { href: "/expatriate/permit-types", label: "Jenis Izin", icon: Settings, exact: false },
];

export default function Navbar({ user }) {
  const pathname = usePathname();
  const isAdmin = user?.role === "admin";
  const canManageExpat = user?.role === "admin" || user?.role === "expatriate_admin";

  const isActive = (href, exact = false) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");

  return (
    <nav className="sticky top-0 z-50 bg-orange-950 text-white shadow-md">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <span className="font-bold text-orange-200 text-xl tracking-wide">LPE Portal</span>

          <div className="hidden md:flex items-center gap-1">
            {/* Regular nav links */}
            {navLinks.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                  href === "/" ? pathname === "/" : pathname.startsWith(href)
                    ? "bg-orange-800"
                    : "hover:bg-orange-900"
                }`}
              >
                <Icon size={15} />
                {label}
              </Link>
            ))}

            {/* Admin links */}
            {isAdmin && adminLinks.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                  pathname.startsWith(href) ? "bg-orange-800" : "hover:bg-orange-900"
                }`}
              >
                <Icon size={15} />
                {label}
              </Link>
            ))}

            {/* Expatriate dropdown */}
            {canManageExpat && (
              <div className="relative group">
                <button
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                    pathname.startsWith("/expatriate") ? "bg-orange-800" : "hover:bg-orange-900"
                  }`}
                >
                  <Globe size={15} />
                  Expatriate
                  <ChevronDown size={13} className="ml-0.5 transition-transform duration-200 group-hover:rotate-180" />
                </button>

                {/* Dropdown panel */}
                <div className="absolute left-0 top-full pt-1.5 hidden group-hover:block z-50">
                  <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden min-w-[170px]">
                    {expatSubLinks.map(({ href, label, icon: Icon, exact }) => (
                      <Link
                        key={href}
                        href={href}
                        className={`flex items-center gap-2.5 px-4 py-2.5 text-sm transition ${
                          isActive(href, exact)
                            ? "bg-orange-50 text-orange-700 font-semibold"
                            : "text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        <Icon size={14} className={isActive(href, exact) ? "text-orange-600" : "text-gray-400"} />
                        {label}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/profile"
            className="hidden md:flex flex-col items-end hover:opacity-80 transition"
          >
            <span className="text-sm text-orange-200">{user?.name}</span>
            {isAdmin ? (
              <span className="text-xs text-orange-400 flex items-center gap-0.5">
                <ShieldCheck size={11} /> Admin
              </span>
            ) : user?.role === "expatriate_admin" ? (
              <span className="text-xs text-blue-400 flex items-center gap-0.5">
                <Globe size={11} /> Expat Admin
              </span>
            ) : (
              <span className="text-xs text-orange-400 flex items-center gap-0.5">
                <UserCircle size={11} /> Profil
              </span>
            )}
          </Link>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg hover:bg-orange-900 transition"
          >
            <LogOut size={15} />
            <span className="hidden md:inline">Keluar</span>
          </button>
        </div>
      </div>
    </nav>
  );
}
