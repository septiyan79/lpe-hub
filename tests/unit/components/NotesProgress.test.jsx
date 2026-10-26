// @vitest-environment jsdom
// tests/unit/components/NotesProgress.test.jsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import NotesProgress from "@/components/notes/NotesProgress";

const MOCK_PROGRESS = [
  {
    id: "prog-1",
    act: "Pengajuan Berkas",
    tglAct: "2026-03-01T00:00:00.000Z",
    status: "Plan",
    feedbacks: [
      {
        id: "fb-1",
        text: "Dokumen paspor kurang jelas",
        tglFeedback: "2026-03-02T00:00:00.000Z",
      },
    ],
  },
];

describe("NotesProgress Component (components/notes/NotesProgress.jsx)", () => {
  let setProgressMock;

  beforeEach(() => {
    vi.clearAllMocks();
    setProgressMock = vi.fn();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({}),
    });
  });

  it("harus merender daftar progress item, status badge, dan feedback yang ada", () => {
    render(<NotesProgress noteId="note-1" progress={MOCK_PROGRESS} setProgress={setProgressMock} />);

    expect(screen.getByText("Pengajuan Berkas")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Plan" })).toBeInTheDocument();
    expect(screen.getByText("Dokumen paspor kurang jelas")).toBeInTheDocument();
  });

  it("harus menambahkan progress baru saat form di-submit", async () => {
    const newCreatedProg = {
      id: "prog-2",
      act: "Wawancara",
      tglAct: "2026-03-05",
      status: "Plan",
    };
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: vi.fn().mockResolvedValueOnce(newCreatedProg),
    });

    render(<NotesProgress noteId="note-1" progress={MOCK_PROGRESS} setProgress={setProgressMock} />);

    const actInput = screen.getByPlaceholderText("Input the progress here ...");
    const addProgressForm = actInput.closest("form");
    const tglInput = addProgressForm.querySelector('input[type="date"]');
    const submitBtn = screen.getByRole("button", { name: /add/i });

    fireEvent.change(actInput, { target: { value: "Wawancara" } });
    fireEvent.change(tglInput, { target: { value: "2026-03-05" } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/notes/note-1/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ act: "Wawancara", tglAct: "2026-03-05", status: "Plan" }),
      });
      expect(setProgressMock).toHaveBeenCalled();
    });
  });

  it("harus melakukan siklus status saat tombol status diklik (Plan -> On Process)", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: vi.fn().mockResolvedValueOnce({ id: "prog-1", status: "On Process" }),
    });

    render(<NotesProgress noteId="note-1" progress={MOCK_PROGRESS} setProgress={setProgressMock} />);

    const statusBadge = screen.getByRole("button", { name: "Plan" });
    fireEvent.click(statusBadge);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/notes/note-1/progress/prog-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "On Process" }),
      });
      expect(setProgressMock).toHaveBeenCalled();
    });
  });

  it("harus menghapus progress item saat user mengonfirmasi dialog konfirmasi", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);

    render(<NotesProgress noteId="note-1" progress={MOCK_PROGRESS} setProgress={setProgressMock} />);

    // Tombol trash pertama adalah tombol hapus progress
    const buttons = screen.getAllByRole("button");
    const deleteProgBtn = buttons.find((btn) => btn.className.includes("text-red-400") && !btn.className.includes("text-[10px]"));
    fireEvent.click(deleteProgBtn);

    expect(window.confirm).toHaveBeenCalledWith("Are you sure you want to delete this progress?");
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/notes/note-1/progress/prog-1", {
        method: "DELETE",
      });
      expect(setProgressMock).toHaveBeenCalled();
    });
  });

  it("harus menambahkan feedback baru saat form feedback di-submit", async () => {
    const createdFeedback = { id: "fb-new", text: "Siapkan foto copy", tglFeedback: "2026-03-03" };
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: vi.fn().mockResolvedValueOnce(createdFeedback),
    });

    render(<NotesProgress noteId="note-1" progress={MOCK_PROGRESS} setProgress={setProgressMock} />);

    const feedbackInput = screen.getByPlaceholderText("input feedback disini...");
    const saveFeedbackBtn = screen.getByRole("button", { name: /save/i });

    // Cari date input untuk feedback (di dalam form feedback)
    const formFeedback = feedbackInput.closest("form");
    const dateInput = formFeedback.querySelector('input[type="date"]');

    fireEvent.change(feedbackInput, { target: { value: "Siapkan foto copy" } });
    fireEvent.change(dateInput, { target: { value: "2026-03-03" } });

    expect(saveFeedbackBtn).not.toBeDisabled();
    fireEvent.click(saveFeedbackBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/notes/note-1/progress/prog-1/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: "Siapkan foto copy", tglFeedback: "2026-03-03" }),
      });
      expect(setProgressMock).toHaveBeenCalled();
    });
  });

  it("harus menghapus feedback saat tombol hapus feedback diklik dan dikonfirmasi", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);

    render(<NotesProgress noteId="note-1" progress={MOCK_PROGRESS} setProgress={setProgressMock} />);

    // Tombol trash feedback memiliki class text-[10px]
    const buttons = screen.getAllByRole("button");
    const deleteFeedbackBtn = buttons.find((btn) => btn.className.includes("text-[10px]") && btn.className.includes("bg-red-100"));
    fireEvent.click(deleteFeedbackBtn);

    expect(window.confirm).toHaveBeenCalledWith("Are you sure you want to delete this feedback?");
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/notes/note-1/progress/prog-1/feedback/fb-1", {
        method: "DELETE",
      });
      expect(setProgressMock).toHaveBeenCalled();
    });
  });
});
