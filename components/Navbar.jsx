"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { LayoutList, BookOpen, Home, LogOut, ShieldCheck } from "lucide-react";

const navLinks = [
  { href: "/", label: "Home", icon: Home },
  { href: "/notes", label: "Activity Notes", icon: BookOpen },
  { href: "/todolist", label: "Todo List", icon: LayoutList },
];

const adminLinks = [
  { href: "/admin/users", label: "Kelola User", icon: ShieldCheck },
];

export default function Navbar({ user }) {
  const pathname = usePathname();
  const isAdmin = user?.role === "admin";

  const allLinks = isAdmin ? [...navLinks, ...adminLinks] : navLinks;

  return (
    <nav className="sticky top-0 z-50 bg-orange-950 text-white shadow-md">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <span className="font-bold text-orange-200 text-xl tracking-wide">LPE Portal</span>
          <div className="hidden md:flex items-center gap-1">
            {allLinks.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                  pathname === href || (href !== "/" && pathname.startsWith(href))
                    ? "bg-orange-800"
                    : "hover:bg-orange-900"
                }`}
              >
                <Icon size={15} />
                {label}
              </Link>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex flex-col items-end">
            <span className="text-sm text-orange-200">{user?.name}</span>
            {isAdmin && (
              <span className="text-xs text-orange-400 flex items-center gap-0.5">
                <ShieldCheck size={11} /> Admin
              </span>
            )}
          </div>
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
