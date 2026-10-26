// @vitest-environment jsdom
// tests/unit/components/Navbar.test.jsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import Navbar from "@/components/Navbar";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  usePathname: vi.fn(() => "/"),
}));

// Mock next-auth/react
vi.mock("next-auth/react", () => ({
  signOut: vi.fn(),
}));

import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

describe("Navbar Component (components/Navbar.jsx)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("harus merender link navigasi reguler untuk semua user", () => {
    const user = { name: "Budi Santoso", role: "employee" };
    render(<Navbar user={user} />);

    expect(screen.getByText("LPE Portal")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /home/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /activity notes/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /todo list/i })).toBeInTheDocument();
  });

  it("harus merender link 'Kelola User' dan menu 'Expatriate' untuk role admin", () => {
    const user = { name: "Admin Utama", role: "admin" };
    render(<Navbar user={user} />);

    expect(screen.getByRole("link", { name: /kelola user/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /expatriate/i })).toBeInTheDocument();
    expect(screen.getByText("Admin")).toBeInTheDocument();
  });

  it("harus merender menu 'Expatriate' tetapi TIDAK merender 'Kelola User' untuk role expatriate_admin", () => {
    const user = { name: "Expat Officer", role: "expatriate_admin" };
    render(<Navbar user={user} />);

    expect(screen.queryByRole("link", { name: /kelola user/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /expatriate/i })).toBeInTheDocument();
    expect(screen.getByText("Expat Admin")).toBeInTheDocument();
  });

  it("TIDAK boleh merender 'Kelola User' maupun menu 'Expatriate' untuk role employee biasa", () => {
    const user = { name: "Staf Biasa", role: "employee" };
    render(<Navbar user={user} />);

    expect(screen.queryByRole("link", { name: /kelola user/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /expatriate/i })).not.toBeInTheDocument();
    expect(screen.getByText("Profil")).toBeInTheDocument();
  });

  it("harus menandai link yang sedang aktif sesuai rute pathname", () => {
    usePathname.mockReturnValueOnce("/notes");

    const user = { name: "Budi", role: "employee" };
    render(<Navbar user={user} />);

    const notesLink = screen.getByRole("link", { name: /activity notes/i });
    expect(notesLink.className).toContain("bg-orange-800");

    const homeLink = screen.getByRole("link", { name: /home/i });
    expect(homeLink.className).not.toContain("bg-orange-800");
  });

  it("harus memanggil signOut dengan callbackUrl /login saat tombol Keluar diklik", () => {
    const user = { name: "Budi", role: "employee" };
    render(<Navbar user={user} />);

    const logoutButton = screen.getByRole("button", { name: /keluar/i });
    fireEvent.click(logoutButton);

    expect(signOut).toHaveBeenCalledTimes(1);
    expect(signOut).toHaveBeenCalledWith({ callbackUrl: "/login" });
  });
});