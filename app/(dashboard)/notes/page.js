"use client";

import { useState, useEffect, useRef } from "react";
import { Plus, Trash2, Pencil, Check, X, ChevronDown, ChevronUp, BookOpen, MessageSquare, Save } from "lucide-react";

const STATUS_OPTIONS = ["Plan", "On Process", "Done"];
const STATUS_COLOR = {
  Plan: "bg-gray-100 text-gray-600",
  "On Process": "bg-blue-100 text-blue-700",
  Done: "bg-green-100 text-green-700",
};

function useAutoResize(value) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) {
      ref.current.style.height = "auto";
      ref.current.style.height = ref.current.scrollHeight + "px";
    }
  }, [value]);
  return ref;
}

function FeedbackSection({ noteId, progressId, feedbacks, onFeedbackAdded, onFeedbackDeleted }) {
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const textRef = useAutoResize(text);

  async function addFeedback() {
    if (!text.trim()) return;
    const res = await fetch(`/api/notes/${noteId}/progress/${progressId}/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: text.trim(), tglFeedback: new Date().toISOString() }),
    });
    const fb = await res.json();
    onFeedbackAdded(progressId, fb);
    setText("");
  }

  async function deleteFeedback(feedbackId) {
    await fetch(`/api/notes/${noteId}/progress/${progressId}/feedback/${feedbackId}`, { method: "DELETE" });
    onFeedbackDeleted(progressId, feedbackId);
  }

  return (
    <div className="mt-2 ml-1">
      <button onClick={() => setOpen((v) => !v)} className="flex items-center gap-1 text-xs text-gray-500 hover:text-orange-700 transition">
        <MessageSquare size={13} />
        Feedback ({feedbacks.length})
        {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
      </button>
      {open && (
        <div className="mt-2 space-y-2 pl-2 border-l-2 border-orange-100">
          {feedbacks.map((fb) => (
            <div key={fb.id} className="flex items-start gap-2 text-xs text-gray-600">
              <span className="flex-1">{fb.text}</span>
              <button onClick={() => deleteFeedback(fb.id)} className="text-gray-300 hover:text-red-400 transition shrink-0"><X size={12} /></button>
            </div>
          ))}
          <div className="flex gap-2 pt-1">
            <textarea ref={textRef} value={text} onChange={(e) => setText(e.target.value)} placeholder="Tulis feedback..." rows={1} className="flex-1 text-xs border border-gray-200 rounded-lg px-2 py-1.5 resize-none focus:outline-none focus:ring-1 focus:ring-orange-300" />
            <button onClick={addFeedback} className="text-orange-700 hover:text-orange-900 transition shrink-0 pt-1"><Save size={14} /></button>
          </div>
        </div>
      )}
    </div>
  );
}

function ProgressItem({ noteId, item, onUpdated, onDeleted, onFeedbackAdded, onFeedbackDeleted }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ act: item.act, tglAct: item.tglAct?.slice(0, 10) || "", status: item.status });
  const actRef = useAutoResize(form.act);

  async function save() {
    const res = await fetch(`/api/notes/${noteId}/progress/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, tglAct: form.tglAct || null }),
    });
    const updated = await res.json();
    onUpdated(item.id, updated);
    setEditing(false);
  }

  async function del() {
    if (!confirm("Hapus progress ini?")) return;
    await fetch(`/api/notes/${noteId}/progress/${item.id}`, { method: "DELETE" });
    onDeleted(item.id);
  }

  return (
    <div className="bg-gray-50 rounded-xl p-3 space-y-2">
      {editing ? (
        <div className="space-y-2">
          <textarea ref={actRef} value={form.act} onChange={(e) => setForm({ ...form, act: e.target.value })} rows={1} className="w-full text-sm border border-orange-300 rounded-lg px-3 py-1.5 resize-none focus:outline-none focus:ring-2 focus:ring-orange-400" />
          <div className="flex gap-2">
            <input type="date" value={form.tglAct} onChange={(e) => setForm({ ...form, tglAct: e.target.value })} className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-orange-300" />
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-orange-300">
              {STATUS_OPTIONS.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <button onClick={save} className="flex items-center gap-1 text-xs text-green-600 hover:text-green-800 transition"><Check size={13} /> Simpan</button>
            <button onClick={() => setEditing(false)} className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition"><X size={13} /> Batal</button>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-2">
          <div className="flex-1 space-y-1">
            <p className="text-sm text-gray-700">{item.act}</p>
            <div className="flex items-center gap-2">
              {item.tglAct && <span className="text-xs text-gray-400">{new Date(item.tglAct).toLocaleDateString("id-ID")}</span>}
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[item.status]}`}>{item.status}</span>
            </div>
          </div>
          <div className="flex gap-1 shrink-0">
            <button onClick={() => setEditing(true)} className="p-1 text-gray-400 hover:text-orange-600 transition"><Pencil size={13} /></button>
            <button onClick={del} className="p-1 text-gray-400 hover:text-red-500 transition"><Trash2 size={13} /></button>
          </div>
        </div>
      )}
      <FeedbackSection noteId={noteId} progressId={item.id} feedbacks={item.feedbacks} onFeedbackAdded={onFeedbackAdded} onFeedbackDeleted={onFeedbackDeleted} />
    </div>
  );
}

function NoteCard({ note, onUpdated, onDeleted }) {
  const [open, setOpen] = useState(false);
  const [editTitle, setEditTitle] = useState(false);
  const [titleVal, setTitleVal] = useState(note.title);
  const [descVal, setDescVal] = useState(note.desc || "");
  const [showAddProgress, setShowAddProgress] = useState(false);
  const [progForm, setProgForm] = useState({ act: "", tglAct: "", status: "Plan" });
  const [progress, setProgress] = useState(note.progress || []);
  const descRef = useAutoResize(descVal);
  const actRef = useAutoResize(progForm.act);

  async function saveTitle() {
    const res = await fetch(`/api/notes/${note.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: titleVal, desc: descVal }),
    });
    const updated = await res.json();
    onUpdated(updated);
    setEditTitle(false);
  }

  async function deleteNote() {
    if (!confirm(`Hapus catatan "${note.title}"?`)) return;
    await fetch(`/api/notes/${note.id}`, { method: "DELETE" });
    onDeleted(note.id);
  }

  async function addProgress() {
    if (!progForm.act.trim()) return;
    const res = await fetch(`/api/notes/${note.id}/progress`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...progForm, tglAct: progForm.tglAct || null }),
    });
    const newProg = await res.json();
    setProgress((prev) => [...prev, newProg]);
    setProgForm({ act: "", tglAct: "", status: "Plan" });
    setShowAddProgress(false);
  }

  function handleProgressUpdated(id, updated) {
    setProgress((prev) => prev.map((p) => (p.id === id ? { ...updated, feedbacks: p.feedbacks } : p)));
  }

  function handleFeedbackAdded(progressId, fb) {
    setProgress((prev) => prev.map((p) => p.id === progressId ? { ...p, feedbacks: [...p.feedbacks, fb] } : p));
  }

  function handleFeedbackDeleted(progressId, feedbackId) {
    setProgress((prev) => prev.map((p) => p.id === progressId ? { ...p, feedbacks: p.feedbacks.filter((f) => f.id !== feedbackId) } : p));
  }

  const doneCount = progress.filter((p) => p.status === "Done").length;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-orange-100 overflow-hidden">
      <div className="px-5 py-4 flex items-start gap-3">
        <div className="flex-1 space-y-1">
          {editTitle ? (
            <div className="space-y-2">
              <input value={titleVal} onChange={(e) => setTitleVal(e.target.value)} className="w-full text-sm font-semibold border border-orange-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-orange-400" />
              <textarea ref={descRef} value={descVal} onChange={(e) => setDescVal(e.target.value)} placeholder="Deskripsi (opsional)..." rows={2} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 resize-none focus:outline-none focus:ring-1 focus:ring-orange-300" />
              <div className="flex gap-2">
                <button onClick={saveTitle} className="flex items-center gap-1 text-xs text-green-600 hover:text-green-800 transition"><Check size={13} /> Simpan</button>
                <button onClick={() => setEditTitle(false)} className="flex items-center gap-1 text-xs text-gray-400 transition"><X size={13} /> Batal</button>
              </div>
            </div>
          ) : (
            <>
              <h3 className="font-semibold text-orange-950">{note.title}</h3>
              {note.desc && <p className="text-sm text-gray-500">{note.desc}</p>}
              <p className="text-xs text-gray-400">{doneCount}/{progress.length} progres selesai</p>
            </>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {!editTitle && <button onClick={() => setEditTitle(true)} className="p-1.5 text-gray-400 hover:text-orange-600 transition"><Pencil size={15} /></button>}
          <button onClick={deleteNote} className="p-1.5 text-gray-400 hover:text-red-500 transition"><Trash2 size={15} /></button>
          <button onClick={() => setOpen((v) => !v)} className="p-1.5 text-gray-400 hover:text-orange-600 transition">{open ? <ChevronUp size={15} /> : <ChevronDown size={15} />}</button>
        </div>
      </div>

      {open && (
        <div className="px-5 pb-5 space-y-3 border-t border-gray-50 pt-3">
          {progress.map((p) => (
            <ProgressItem key={p.id} noteId={note.id} item={p} onUpdated={handleProgressUpdated} onDeleted={(id) => setProgress((prev) => prev.filter((x) => x.id !== id))} onFeedbackAdded={handleFeedbackAdded} onFeedbackDeleted={handleFeedbackDeleted} />
          ))}
          {showAddProgress ? (
            <div className="bg-orange-50 rounded-xl p-3 space-y-2">
              <textarea ref={actRef} value={progForm.act} onChange={(e) => setProgForm({ ...progForm, act: e.target.value })} placeholder="Nama aktivitas..." rows={2} className="w-full text-sm border border-orange-200 rounded-lg px-3 py-1.5 resize-none focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white" />
              <div className="flex gap-2">
                <input type="date" value={progForm.tglAct} onChange={(e) => setProgForm({ ...progForm, tglAct: e.target.value })} className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none" />
                <select value={progForm.status} onChange={(e) => setProgForm({ ...progForm, status: e.target.value })} className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none">
                  {STATUS_OPTIONS.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="flex gap-2">
                <button onClick={addProgress} className="flex items-center gap-1 text-xs bg-orange-950 text-white px-3 py-1.5 rounded-lg hover:bg-orange-800 transition"><Plus size={13} /> Tambah</button>
                <button onClick={() => setShowAddProgress(false)} className="text-xs text-gray-400 hover:text-gray-600 transition">Batal</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowAddProgress(true)} className="flex items-center gap-1.5 text-sm text-orange-700 hover:text-orange-900 transition"><Plus size={15} /> Tambah Progress</button>
          )}
        </div>
      )}
    </div>
  );
}

export default function NotesPage() {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", desc: "" });
  const descRef = useAutoResize(form.desc);

  useEffect(() => {
    fetch("/api/notes")
      .then((r) => r.json())
      .then((data) => { setNotes(data); setLoading(false); });
  }, []);

  async function addNote() {
    if (!form.title.trim()) return;
    const res = await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const newNote = await res.json();
    setNotes((prev) => [newNote, ...prev]);
    setForm({ title: "", desc: "" });
    setShowForm(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen size={22} className="text-orange-950" />
          <h1 className="text-xl font-bold text-orange-950">Activity Notes</h1>
        </div>
        <button onClick={() => setShowForm((v) => !v)} className="flex items-center gap-1.5 bg-orange-950 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-orange-800 transition">
          {showForm ? <X size={15} /> : <Plus size={15} />}
          {showForm ? "Batal" : "Catatan Baru"}
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl shadow-sm border border-orange-200 p-5 space-y-3">
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} onKeyDown={(e) => e.key === "Enter" && addNote()} placeholder="Judul catatan..." className="w-full text-sm font-medium border border-gray-300 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-400" />
          <textarea ref={descRef} value={form.desc} onChange={(e) => setForm({ ...form, desc: e.target.value })} placeholder="Deskripsi (opsional)..." rows={2} className="w-full text-sm border border-gray-200 rounded-xl px-4 py-2.5 resize-none focus:outline-none focus:ring-1 focus:ring-orange-300" />
          <button onClick={addNote} className="flex items-center gap-1.5 bg-orange-950 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-orange-800 transition"><Plus size={15} /> Simpan Catatan</button>
        </div>
      )}

      {loading ? (
        <p className="text-center text-gray-400 py-16 text-sm">Memuat...</p>
      ) : notes.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <BookOpen size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Belum ada catatan. Buat catatan pertama kamu!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <NoteCard key={note.id} note={note} onUpdated={(updated) => setNotes((prev) => prev.map((n) => (n.id === updated.id ? { ...updated, progress: n.progress } : n)))} onDeleted={(id) => setNotes((prev) => prev.filter((n) => n.id !== id))} />
          ))}
        </div>
      )}
    </div>
  );
}
