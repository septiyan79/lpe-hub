"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { LayoutList, BookOpen, Home, LogOut } from "lucide-react";

const navLinks = [
  { href: "/", label: "Home", icon: Home },
  { href: "/todolist", label: "Todo List", icon: LayoutList },
  { href: "/notes", label: "Activity Notes", icon: BookOpen },
];

export default function Navbar({ user }) {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-50 bg-orange-950 text-white shadow-md">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <span className="font-bold text-lg tracking-wide">LPE HUB</span>
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                  pathname === href ? "bg-orange-800" : "hover:bg-orange-900"
                }`}
              >
                <Icon size={15} />
                {label}
              </Link>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm text-orange-200 hidden md:block">{user?.name}</span>
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
