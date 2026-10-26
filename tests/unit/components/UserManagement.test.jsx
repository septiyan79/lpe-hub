// @vitest-environment jsdom
// tests/unit/components/UserManagement.test.jsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import UserManagement from "@/components/admin/UserManagement";

const MOCK_USERS = [
  {
    id: "user-admin",
    name: "Admin Utama",
    email: "admin@lpe.com",
    role: "admin",
    createdAt: "2026-01-01T00:00:00.000Z",
    deletedAt: null,
  },
  {
    id: "user-emp",
    name: "Budi Santoso",
    email: "budi@lpe.com",
    role: "employee",
    createdAt: "2026-01-10T00:00:00.000Z",
    deletedAt: null,
  },
  {
    id: "user-inactive",
    name: "User Lama",
    email: "lama@lpe.com",
    role: "employee",
    createdAt: "2025-01-01T00:00:00.000Z",
    deletedAt: "2025-12-01T00:00:00.000Z",
  },
];

describe("UserManagement Component (components/admin/UserManagement.jsx)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(MOCK_USERS),
    });
  });

  it("harus merender tabel pengguna dan badge 'Saya' untuk current user", async () => {
    render(<UserManagement currentUserId="user-admin" />);

    expect(screen.getByText("Memuat data...")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Admin Utama")).toBeInTheDocument();
      expect(screen.getByText("Budi Santoso")).toBeInTheDocument();
      expect(screen.getByText("Saya")).toBeInTheDocument();
    });
  });

  it("harus menyembunyikan user nonaktif secara default dan menampilkannya saat checkbox dicentang", async () => {
    render(<UserManagement currentUserId="user-admin" />);

    await waitFor(() => {
      expect(screen.getByText("Budi Santoso")).toBeInTheDocument();
    });

    // Default: User Lama (nonaktif) tidak muncul
    expect(screen.queryByText("User Lama")).not.toBeInTheDocument();

    // Centang checkbox
    const checkbox = screen.getByLabelText(/tampilkan user nonaktif/i);
    fireEvent.click(checkbox);

    expect(screen.getByText("User Lama")).toBeInTheDocument();
    expect(screen.getByText("Nonaktif")).toBeInTheDocument();
  });

  it("TIDAK boleh menampilkan tombol hapus pada baris current user (proteksi self-delete)", async () => {
    render(<UserManagement currentUserId="user-admin" />);

    await waitFor(() => {
      expect(screen.getByText("Admin Utama")).toBeInTheDocument();
    });

    // Tombol nonaktifkan hanya ada untuk Budi, tidak untuk user-admin
    const deleteButtons = screen.getAllByTitle("Nonaktifkan");
    expect(deleteButtons).toHaveLength(1);
  });

  it("harus membuka modal tambah user, submit data baru, dan menutup modal", async () => {
    render(<UserManagement currentUserId="user-admin" />);

    await waitFor(() => {
      expect(screen.getByText("Admin Utama")).toBeInTheDocument();
    });

    const addBtn = screen.getByRole("button", { name: /tambah user/i });
    fireEvent.click(addBtn);

    expect(screen.getByRole("heading", { name: "Tambah User" })).toBeInTheDocument();

    // Isi formulir
    fireEvent.change(screen.getByPlaceholderText("Nama lengkap"), { target: { value: "Siti Rahma" } });
    fireEvent.change(screen.getByPlaceholderText("email@domain.com"), { target: { value: "siti@lpe.com" } });
    fireEvent.change(screen.getByPlaceholderText("Password"), { target: { value: "secret123" } });

    // Mock response POST sukses
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: vi.fn().mockResolvedValueOnce({ id: "user-new", name: "Siti Rahma" }),
    });

    const submitBtn = screen.getByRole("button", { name: "Tambah" });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Siti Rahma",
          email: "siti@lpe.com",
          password: "secret123",
          role: "employee",
        }),
      });
      // Modal tertutup
      expect(screen.queryByRole("heading", { name: "Tambah User" })).not.toBeInTheDocument();
    });
  });

  it("harus menampilkan pesan error jika penambahan user gagal", async () => {
    render(<UserManagement currentUserId="user-admin" />);

    await waitFor(() => {
      expect(screen.getByText("Admin Utama")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /tambah user/i }));

    fireEvent.change(screen.getByPlaceholderText("Nama lengkap"), { target: { value: "Siti Rahma" } });
    fireEvent.change(screen.getByPlaceholderText("email@domain.com"), { target: { value: "siti@lpe.com" } });
    fireEvent.change(screen.getByPlaceholderText("Password"), { target: { value: "secret123" } });

    // Mock response error dari server
    global.fetch.mockResolvedValueOnce({
      ok: false,
      json: vi.fn().mockResolvedValueOnce({ error: "Email sudah terdaftar" }),
    });

    fireEvent.click(screen.getByRole("button", { name: "Tambah" }));

    await waitFor(() => {
      expect(screen.getByText("Email sudah terdaftar")).toBeInTheDocument();
    });
  });

  it("harus membuka modal edit user, mengubah role/nama, dan mengirimkan PATCH", async () => {
    render(<UserManagement currentUserId="user-admin" />);

    await waitFor(() => {
      expect(screen.getByText("Budi Santoso")).toBeInTheDocument();
    });

    const editButtons = screen.getAllByTitle("Edit");
    // Klik edit pada baris kedua (Budi)
    fireEvent.click(editButtons[1]);

    expect(screen.getByRole("heading", { name: "Edit User" })).toBeInTheDocument();

    const nameInput = screen.getByPlaceholderText("Nama lengkap");
    expect(nameInput.value).toBe("Budi Santoso");

    fireEvent.change(nameInput, { target: { value: "Budi Santoso S.T." } });

    // Mock response PATCH
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: vi.fn().mockResolvedValueOnce({ id: "user-emp", name: "Budi Santoso S.T." }),
    });

    const saveBtn = screen.getByRole("button", { name: "Simpan" });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/admin/users/user-emp", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Budi Santoso S.T.",
          email: "budi@lpe.com",
          role: "employee",
        }),
      });
      expect(screen.queryByRole("heading", { name: "Edit User" })).not.toBeInTheDocument();
    });
  });

  it("harus membuka dialog konfirmasi dan mengirimkan DELETE untuk menonaktifkan user", async () => {
    render(<UserManagement currentUserId="user-admin" />);

    await waitFor(() => {
      expect(screen.getByText("Budi Santoso")).toBeInTheDocument();
    });

    const deleteBtn = screen.getByTitle("Nonaktifkan");
    fireEvent.click(deleteBtn);

    expect(screen.getByRole("heading", { name: "Nonaktifkan User?" })).toBeInTheDocument();

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: vi.fn().mockResolvedValueOnce({ ok: true }),
    });

    const confirmBtn = screen.getByRole("button", { name: "Ya, Nonaktifkan" });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/admin/users/user-emp", {
        method: "DELETE",
      });
      expect(screen.queryByRole("heading", { name: "Nonaktifkan User?" })).not.toBeInTheDocument();
    });
  });
});