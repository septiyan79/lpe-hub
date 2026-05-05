"use client";

import { useState, useEffect, useRef } from "react";
import { Plus, Zap } from "lucide-react";
import NotesItem from "@/components/notes/NotesItem";
import { useAutoResizeTextarea } from "@/hooks/useAutoResizeTextarea";

export default function NotesPage() {
  const [secondFormOpened, setSecondFormOpened] = useState(false);
  const formRef = useRef(null);

  const [openNoteId, setOpenNoteId] = useState(null);
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inputTitle, setInputTitle] = useState("");
  const [inputDesc, setInputDesc] = useState("");

  const textareaRef = useAutoResizeTextarea(inputDesc);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (formRef.current && !formRef.current.contains(event.target)) {
        setSecondFormOpened(false);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  useEffect(() => {
    fetch("/api/notes")
      .then((r) => r.json())
      .then((data) => {
        setNotes(data);
        setLoading(false);
      });
  }, []);

  function togglePrgs(noteId) {
    setOpenNoteId((prev) => (prev === noteId ? null : noteId));
  }

  async function addNote(e) {
    e.preventDefault();
    const title = inputTitle.trim();
    const desc = inputDesc.trim();
    if (!title || !desc) return;

    const res = await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, desc }),
    });
    const newNote = await res.json();
    setNotes((prev) => [newNote, ...prev]);
    setInputTitle("");
    setInputDesc("");
    setSecondFormOpened(false);
  }

  return (
    <div className="text-slate-800">

      {/* Glassmorphism Header + Form */}
      <div
        className="flex flex-col md:flex-row items-center justify-between mb-10
                   bg-white/40 backdrop-blur-md p-4 rounded-3xl
                   border border-white/60 shadow-sm"
      >
        <div className="flex items-center gap-4 px-4 w-full md:w-auto">
          <div className="bg-orange-500 p-2 rounded-2xl shadow-lg shadow-orange-200 text-white">
            <Zap size={20} fill="white" />
          </div>
          <h1 className="text-xl font-black tracking-tight uppercase">Activity Notes</h1>
        </div>

        <form onSubmit={addNote} ref={formRef}>
          <div className="flex items-stretch gap-2 w-full md:w-[500px] mt-4 md:mt-0 group">
            <div className="flex flex-col w-full gap-2">
              <input
                type="text"
                placeholder="Start a new list activity..."
                className="w-full bg-white border-none rounded-2xl py-3 px-6 shadow-inner focus:ring-2 focus:ring-orange-200 outline-none text-sm"
                onClick={() => setSecondFormOpened(true)}
                value={inputTitle}
                onChange={(ev) => setInputTitle(ev.target.value)}
              />
              <div
                className={`${
                  secondFormOpened ? "max-h-[200px] opacity-100" : "max-h-0 opacity-0"
                } transition-all duration-300 ease-in-out overflow-hidden`}
              >
                <textarea
                  ref={textareaRef}
                  placeholder="Description here..."
                  className="w-full bg-white border-none rounded-2xl py-3 px-6 shadow-inner focus:ring-2 focus:ring-orange-200 outline-none text-sm resize-none overflow-hidden"
                  value={inputDesc}
                  onChange={(ev) => setInputDesc(ev.target.value)}
                  rows={1}
                />
              </div>
            </div>

            <button
              type="submit"
              className={`rounded-2xl shadow-sm hover:shadow-md
                         group-hover:bg-orange-500 hover:text-white
                         transition-all duration-300 ease-in-out
                         text-white px-4 flex items-center justify-center
                         ${secondFormOpened ? "bg-orange-500 h-24" : "bg-orange-300 h-12"}`}
            >
              <Plus size={24} />
            </button>
          </div>
        </form>
      </div>

      {/* Notes List */}
      {loading ? (
        <p className="text-center text-slate-400 py-16 text-sm">Memuat...</p>
      ) : notes.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Zap size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Belum ada catatan. Buat catatan pertama kamu!</p>
        </div>
      ) : (
        <div className="space-y-6">
          {notes.map((note) => (
            <NotesItem
              key={note.id}
              note={note}
              isOpen={openNoteId === note.id}
              togglePrgs={togglePrgs}
              onDeleted={(id) => setNotes((prev) => prev.filter((n) => n.id !== id))}
            />
          ))}
        </div>
      )}
    </div>
  );
}
