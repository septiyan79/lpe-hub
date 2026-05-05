"use client";

import { useState } from "react";
import { Plus, CheckCircle, MessageSquare, Trash } from "lucide-react";

const STATUS_CYCLE = ["Plan", "On Process", "Done"];
const STATUS_COLOR = {
  Plan: "bg-slate-100 text-slate-500",
  "On Process": "bg-orange-100 text-orange-600",
  Done: "bg-green-100 text-green-600",
};

export default function NotesProgress({ noteId, progress, setProgress }) {
  const [inputAct, setInputAct] = useState("");
  const [inputTglAct, setInputTglAct] = useState("");
  const [inputFeedback, setInputFeedback] = useState({});
  const [editingProgress, setEditingProgress] = useState(null); // { progressId, field }
  const [draftProgress, setDraftProgress] = useState({});

  // ADD PROGRESS
  async function handleSubmitProgress(e) {
    e.preventDefault();
    const act = inputAct.trim();
    const tglAct = inputTglAct.trim();
    if (!act || !tglAct) return;

    const res = await fetch(`/api/notes/${noteId}/progress`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ act, tglAct, status: "Plan" }),
    });
    const newProg = await res.json();
    setProgress((prev) => [...prev, { ...newProg, feedbacks: [] }]);
    setInputAct("");
    setInputTglAct("");
  }

  // DELETE PROGRESS
  async function deleteProgress(progressId) {
    if (!confirm("Are you sure you want to delete this progress?")) return;
    await fetch(`/api/notes/${noteId}/progress/${progressId}`, { method: "DELETE" });
    setProgress((prev) => prev.filter((p) => p.id !== progressId));
  }

  // EDIT PROGRESS FIELD (act / tglAct)
  function startEditProgress(progressId, field, value) {
    setEditingProgress({ progressId, field });
    setDraftProgress((prev) => ({ ...prev, [progressId]: value }));
  }

  async function saveEditProgress(progressId, field) {
    const value = draftProgress[progressId];
    if (!value?.toString().trim()) return;

    const res = await fetch(`/api/notes/${noteId}/progress/${progressId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
    const updated = await res.json();
    setProgress((prev) =>
      prev.map((p) => (p.id === progressId ? { ...updated, feedbacks: p.feedbacks } : p))
    );
    setEditingProgress(null);
    setDraftProgress((prev) => {
      const copy = { ...prev };
      delete copy[progressId];
      return copy;
    });
  }

  // CYCLE STATUS
  async function cycleStatus(prgs) {
    const nextIndex = (STATUS_CYCLE.indexOf(prgs.status) + 1) % STATUS_CYCLE.length;
    const newStatus = STATUS_CYCLE[nextIndex];
    const res = await fetch(`/api/notes/${noteId}/progress/${prgs.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    const updated = await res.json();
    setProgress((prev) =>
      prev.map((p) => (p.id === prgs.id ? { ...updated, feedbacks: p.feedbacks } : p))
    );
  }

  // ADD FEEDBACK
  async function handleSubmitFeedback(e, progressId) {
    e.preventDefault();
    const data = inputFeedback[progressId];
    if (!data?.feedback || !data?.tglFeedback) return;

    const res = await fetch(`/api/notes/${noteId}/progress/${progressId}/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: data.feedback, tglFeedback: data.tglFeedback }),
    });
    const fb = await res.json();
    setProgress((prev) =>
      prev.map((p) =>
        p.id === progressId ? { ...p, feedbacks: [...p.feedbacks, fb] } : p
      )
    );
    setInputFeedback((prev) => {
      const copy = { ...prev };
      delete copy[progressId];
      return copy;
    });
  }

  // DELETE FEEDBACK
  async function deleteFeedback(progressId, feedbackId) {
    if (!confirm("Are you sure you want to delete this feedback?")) return;
    await fetch(`/api/notes/${noteId}/progress/${progressId}/feedback/${feedbackId}`, {
      method: "DELETE",
    });
    setProgress((prev) =>
      prev.map((p) =>
        p.id === progressId
          ? { ...p, feedbacks: p.feedbacks.filter((f) => f.id !== feedbackId) }
          : p
      )
    );
  }

  return (
    <>
      {progress.map((prgs) => (
        <div
          key={prgs.id}
          className="bg-white p-5 rounded-4xl shadow-sm hover:shadow-md transition-shadow group border border-transparent hover:border-orange-100"
        >
          {/* Progress Header Row */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex flex-1 items-center gap-2">
              <div className="p-0.5 bg-orange-50 text-orange-500 rounded-xl group-hover:bg-orange-500 group-hover:text-white transition-colors shrink-0">
                <CheckCircle size={16} />
              </div>

              {editingProgress?.progressId === prgs.id && editingProgress.field === "act" ? (
                <input
                  className="font-bold text-slate-800 text-sm leading-none outline-none border-b border-orange-400 w-[90%]"
                  value={draftProgress[prgs.id] ?? ""}
                  onChange={(ev) =>
                    setDraftProgress((prev) => ({ ...prev, [prgs.id]: ev.target.value }))
                  }
                  onBlur={() => saveEditProgress(prgs.id, "act")}
                  autoFocus
                />
              ) : (
                <>
                  <h4
                    className="font-bold text-slate-800 text-sm leading-none cursor-pointer hover:text-orange-500 transition"
                    onClick={() => startEditProgress(prgs.id, "act", prgs.act)}
                  >
                    {prgs.act}
                  </h4>
                  <button
                    className="text-red-400 hover:text-red-600 ml-1 transition"
                    onClick={() => deleteProgress(prgs.id)}
                  >
                    <Trash size={14} />
                  </button>
                </>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {/* Status badge — click to cycle */}
              <button
                onClick={() => cycleStatus(prgs)}
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full transition ${STATUS_COLOR[prgs.status] || "bg-slate-100 text-slate-500"}`}
              >
                {prgs.status}
              </button>

              {/* Date */}
              {editingProgress?.progressId === prgs.id && editingProgress.field === "tglAct" ? (
                <input
                  type="date"
                  autoFocus
                  value={draftProgress[prgs.id] ?? ""}
                  onChange={(ev) =>
                    setDraftProgress((prev) => ({ ...prev, [prgs.id]: ev.target.value }))
                  }
                  onBlur={() => saveEditProgress(prgs.id, "tglAct")}
                  className="text-[10px] text-slate-600 font-medium italic outline-none"
                />
              ) : (
                <span
                  className="text-[10px] text-slate-600 font-medium italic cursor-pointer hover:text-orange-500 transition"
                  onClick={() =>
                    startEditProgress(
                      prgs.id,
                      "tglAct",
                      prgs.tglAct ? prgs.tglAct.slice(0, 10) : ""
                    )
                  }
                >
                  {prgs.tglAct
                    ? new Date(prgs.tglAct).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })
                    : "—"}
                </span>
              )}
            </div>
          </div>

          {/* Feedbacks */}
          {prgs.feedbacks?.length > 0 && (
            <div className="space-y-2 mb-2">
              {prgs.feedbacks.map((fb) => (
                <div
                  key={fb.id}
                  className="bg-slate-50 p-3 rounded-2xl text-[11px] text-slate-500 relative"
                >
                  <MessageSquare
                    size={30}
                    className="absolute top-2 right-0.5 transform -translate-y-1/2 text-orange-200 group-hover:text-orange-500"
                  />
                  <span className="font-semibold text-slate-700 block mb-1">
                    Feedback
                    <small className="ml-1 text-orange-500">
                      {fb.tglFeedback
                        ? new Date(fb.tglFeedback).toLocaleDateString("en-GB", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })
                        : ""}
                    </small>
                    <button
                      className="text-red-400 text-[10px] font-bold ml-2 hover:text-red-600 bg-red-100 rounded-2xl p-1 transition"
                      onClick={() => deleteFeedback(prgs.id, fb.id)}
                    >
                      <Trash size={12} />
                    </button>
                  </span>
                  <p>{fb.text}</p>
                </div>
              ))}
            </div>
          )}

          {/* Add Feedback Form */}
          <div className="bg-slate-50 hover:bg-orange-50 hover:text-orange-500 p-2 rounded-2xl text-[11px] text-slate-500 group/fb">
            <form onSubmit={(e) => handleSubmitFeedback(e, prgs.id)}>
              <div className="flex flex-col md:flex-row gap-1 mb-1">
                <input
                  className="w-full md:w-[80%] focus:outline-none group-hover/fb:text-orange-500 bg-transparent"
                  placeholder="input feedback disini..."
                  value={inputFeedback[prgs.id]?.feedback || ""}
                  onChange={(e) =>
                    setInputFeedback((prev) => ({
                      ...prev,
                      [prgs.id]: { ...prev[prgs.id], feedback: e.target.value },
                    }))
                  }
                />
                <input
                  className="w-full md:w-[20%] focus:outline-none bg-transparent"
                  type="date"
                  value={inputFeedback[prgs.id]?.tglFeedback || ""}
                  onChange={(e) =>
                    setInputFeedback((prev) => ({
                      ...prev,
                      [prgs.id]: { ...prev[prgs.id], tglFeedback: e.target.value },
                    }))
                  }
                />
                <button
                  type="submit"
                  className="text-xs text-orange-500 font-semibold mt-1 disabled:opacity-30"
                  disabled={
                    !inputFeedback[prgs.id]?.feedback || !inputFeedback[prgs.id]?.tglFeedback
                  }
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      ))}

      {/* Add Progress Form */}
      <form onSubmit={handleSubmitProgress}>
        <div className="flex flex-col md:flex-row gap-2 mb-2 group">
          <input
            className="w-full md:w-[60%]
                       border-2 border-dashed border-slate-200 rounded-4xl p-4
                       hover:bg-white transition-all cursor-pointer
                       text-slate-400 text-xs
                       group-hover:text-orange-500 group-hover:border-orange-300
                       focus:bg-white focus:text-orange-500 focus:border-orange-300
                       focus:outline-none"
            placeholder="Input the progress here ..."
            value={inputAct}
            onChange={(e) => setInputAct(e.target.value)}
          />
          <input
            className="w-full md:w-[25%]
                       border-2 border-dashed border-slate-200 rounded-4xl p-4
                       hover:bg-white transition-all cursor-pointer
                       text-slate-400 text-xs
                       group-hover:text-orange-500 group-hover:border-orange-300
                       focus:bg-white focus:text-orange-500 focus:border-orange-300
                       focus:outline-none"
            type="date"
            value={inputTglAct}
            onChange={(e) => setInputTglAct(e.target.value)}
          />
          <div
            className="w-full md:w-[15%] flex items-center justify-center
                       border-2 border-dashed border-slate-200 rounded-4xl p-4
                       group-hover:bg-orange-100 group-hover:border-orange-500 transition-all cursor-pointer"
          >
            <button
              type="submit"
              className="flex items-center gap-2 text-slate-400 font-bold text-xs group-hover:text-orange-500"
            >
              <Plus size={16} />
              Add
            </button>
          </div>
        </div>
      </form>
    </>
  );
}
