// @vitest-environment jsdom
// tests/unit/components/NotesItem.test.jsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import NotesItem from "@/components/notes/NotesItem";

// Mock child component NotesProgress
vi.mock("@/components/notes/NotesProgress", () => ({
  default: () => <div data-testid="mock-notes-progress">Mock Notes Progress</div>,
}));

// Mock hook useAutoResizeTextarea
vi.mock("@/hooks/useAutoResizeTextarea", () => ({
  useAutoResizeTextarea: () => ({ current: null }),
}));

const MOCK_NOTE = {
  id: "note-1",
  title: "Perbaikan Visa",
  desc: "Menghubungi konsulat untuk perpanjangan visa",
  done: false,
  progress: [],
};

describe("NotesItem Component (components/notes/NotesItem.jsx)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({}),
    });
  });

  it("harus merender judul, deskripsi, dan status 'On Going' dengan benar", () => {
    render(<NotesItem note={MOCK_NOTE} isOpen={false} togglePrgs={vi.fn()} onDeleted={vi.fn()} />);

    expect(screen.getByText("Perbaikan Visa")).toBeInTheDocument();
    expect(screen.getByText("Menghubungi konsulat untuk perpanjangan visa")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /on going/i })).toBeInTheDocument();
  });

  it("harus merender status 'Done' dan fallback 'No description' saat data sesuai", () => {
    const noteDone = { ...MOCK_NOTE, desc: null, done: true };
    render(<NotesItem note={noteDone} isOpen={false} togglePrgs={vi.fn()} onDeleted={vi.fn()} />);

    expect(screen.getByRole("button", { name: /done/i })).toBeInTheDocument();
    expect(screen.getByText("No description")).toBeInTheDocument();
  });

  it("harus melakukan toggle status done saat tombol status diklik", async () => {
    render(<NotesItem note={MOCK_NOTE} isOpen={false} togglePrgs={vi.fn()} onDeleted={vi.fn()} />);

    const statusBtn = screen.getByRole("button", { name: /on going/i });
    fireEvent.click(statusBtn);

    expect(global.fetch).toHaveBeenCalledWith("/api/notes/note-1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done: true }),
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /done/i })).toBeInTheDocument();
    });
  });

  it("harus mendukung inline edit judul saat judul diklik dan di-blur", async () => {
    render(<NotesItem note={MOCK_NOTE} isOpen={false} togglePrgs={vi.fn()} onDeleted={vi.fn()} />);

    // Klik judul untuk masuk mode edit
    const titleElement = screen.getByText("Perbaikan Visa");
    fireEvent.click(titleElement);

    // Sekarang textarea muncul
    const textarea = screen.getByRole("textbox");
    expect(textarea).toBeInTheDocument();
    expect(textarea.value).toBe("Perbaikan Visa");

    // Ubah nilai dan trigger onBlur
    fireEvent.change(textarea, { target: { value: "Perbaikan Visa Updated" } });
    fireEvent.blur(textarea);

    expect(global.fetch).toHaveBeenCalledWith("/api/notes/note-1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Perbaikan Visa Updated" }),
    });

    await waitFor(() => {
      expect(screen.getByText("Perbaikan Visa Updated")).toBeInTheDocument();
    });
  });

  it("harus memanggil API DELETE dan trigger onDeleted saat penghapusan dikonfirmasi", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const onDeletedMock = vi.fn();

    render(<NotesItem note={MOCK_NOTE} isOpen={false} togglePrgs={vi.fn()} onDeleted={onDeletedMock} />);

    // Tombol trash
    const deleteButton = screen.getByRole("button", { name: "" });
    fireEvent.click(deleteButton);

    expect(window.confirm).toHaveBeenCalled();
    expect(global.fetch).toHaveBeenCalledWith("/api/notes/note-1", { method: "DELETE" });

    await waitFor(() => {
      expect(onDeletedMock).toHaveBeenCalledWith("note-1");
    });
  });

  it("TIDAK boleh memanggil API DELETE jika user membatalkan konfirmasi dialog", () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    const onDeletedMock = vi.fn();

    render(<NotesItem note={MOCK_NOTE} isOpen={false} togglePrgs={vi.fn()} onDeleted={onDeletedMock} />);

    const deleteButton = screen.getByRole("button", { name: "" });
    fireEvent.click(deleteButton);

    expect(window.confirm).toHaveBeenCalled();
    expect(global.fetch).not.toHaveBeenCalled();
    expect(onDeletedMock).not.toHaveBeenCalled();
  });

  it("harus memanggil togglePrgs saat header progress diklik", () => {
    const togglePrgsMock = vi.fn();
    render(<NotesItem note={MOCK_NOTE} isOpen={true} togglePrgs={togglePrgsMock} onDeleted={vi.fn()} />);

    const progressHeader = screen.getByText("Progress Logs");
    fireEvent.click(progressHeader);

    expect(togglePrgsMock).toHaveBeenCalledWith("note-1");
  });
});