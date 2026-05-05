"use client";

import { useState } from "react";
import { LayoutList, Trash } from "lucide-react";
import NotesProgress from "./NotesProgress";
import { useAutoResizeTextarea } from "@/hooks/useAutoResizeTextarea";

export default function NotesItem({ note, isOpen, togglePrgs, onDeleted }) {
  const [title, setTitle] = useState(note.title);
  const [desc, setDesc] = useState(note.desc || "");
  const [done, setDone] = useState(note.done);
  const [progress, setProgress] = useState(note.progress || []);
  const [editingField, setEditingField] = useState(null); // null | 'title' | 'desc'
  const [draftValue, setDraftValue] = useState("");

  const textareaRef = useAutoResizeTextarea(draftValue);

  function startEdit(field, value) {
    setEditingField(field);
    setDraftValue(value);
  }

  async function saveEdit() {
    if (!editingField) return;
    const value = draftValue.trim();
    if (!value) return;

    await fetch(`/api/notes/${note.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [editingField]: value }),
    });

    if (editingField === "title") setTitle(value);
    if (editingField === "desc") setDesc(value);
    setEditingField(null);
    setDraftValue("");
  }

  async function toggleDone() {
    const newDone = !done;
    await fetch(`/api/notes/${note.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done: newDone }),
    });
    setDone(newDone);
  }

  async function deleteNote() {
    if (!confirm("Are you sure you want to delete this note? All its progress & feedback will be deleted.")) return;
    await fetch(`/api/notes/${note.id}`, { method: "DELETE" });
    onDeleted(note.id);
  }

  return (
    <div className="flex flex-col lg:flex-row bg-white rounded-[2.5rem] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-white relative">

      {/* Left Side */}
      <div
        className={`transition-all duration-300 ease-in-out ${
          isOpen ? "lg:w-1/3" : "w-full"
        } p-6 lg:p-8 border-r border-slate-50`}
      >
        <div className="flex justify-between items-center gap-2 mb-4">
          <div className="flex items-center gap-2">
            <span className="h-1 w-10 bg-orange-500 rounded-full"></span>
            <button
              onClick={toggleDone}
              className={`inline-flex items-center px-3 py-1 rounded-2xl text-xs font-bold transition-all duration-300 hover:opacity-80 cursor-pointer ${
                done ? "bg-green-500 text-white" : "bg-orange-500 text-orange-50"
              }`}
            >
              {done ? "Done" : "On Going"}
            </button>
          </div>

          <LayoutList
            size={30}
            className={`text-orange-500 transition-all duration-300 absolute right-8 top-10 z-10 transform -translate-y-1/2 cursor-pointer ${
              !isOpen ? "opacity-100 translate-x-0" : "opacity-20 translate-x-1"
            }`}
            onClick={() => togglePrgs(note.id)}
          />
        </div>

        {/* Title */}
        {editingField === "title" ? (
          <textarea
            ref={textareaRef}
            autoFocus
            value={draftValue}
            onChange={(ev) => setDraftValue(ev.target.value)}
            onBlur={saveEdit}
            rows={1}
            className="text-2xl font-bold w-full outline-none border-b border-orange-500 bg-transparent mb-3 resize-none overflow-hidden"
            spellCheck={false}
          />
        ) : (
          <h2
            className="text-2xl font-bold leading-tight mb-3 text-slate-900 cursor-pointer hover:text-orange-500 transition"
            onClick={() => startEdit("title", title)}
            title="Click to edit title"
          >
            {title}
          </h2>
        )}

        {/* Desc */}
        {editingField === "desc" ? (
          <textarea
            ref={textareaRef}
            autoFocus
            value={draftValue}
            onChange={(ev) => setDraftValue(ev.target.value)}
            onBlur={saveEdit}
            rows={1}
            className="text-slate-400 text-sm mb-1 leading-snug w-full outline-none border-b border-orange-500 bg-transparent resize-none overflow-hidden"
            spellCheck={false}
          />
        ) : (
          <p
            className="text-slate-400 text-sm mb-1 leading-snug cursor-pointer hover:text-orange-400 transition"
            onClick={() => startEdit("desc", desc)}
            title="Click to edit description"
          >
            {desc || <span className="italic opacity-50">No description</span>}
          </p>
        )}

        <button
          className="text-red-400 hover:text-red-600 mt-3 transition"
          onClick={deleteNote}
        >
          <Trash size={18} />
        </button>
      </div>

      {/* Right Side */}
      <div
        className={`flex-1 bg-slate-50/50 p-6 lg:p-8 transition-all duration-300 ease-in-out ${
          isOpen
            ? "max-h-[2000px] opacity-100"
            : "max-h-0 opacity-0 overflow-hidden"
        }`}
      >
        <div className="flex items-center mb-6">
          <h3
            className={`font-bold text-sm flex items-center gap-2 cursor-pointer transition-all duration-300 ${
              isOpen ? "opacity-100 translate-x-0" : "opacity-0 translate-x-4"
            }`}
            onClick={() => togglePrgs(note.id)}
          >
            <LayoutList size={16} className="text-orange-500" />
            <span>Progress Logs</span>
          </h3>
        </div>

        <div className="grid grid-cols-1 gap-2">
          <NotesProgress noteId={note.id} progress={progress} setProgress={setProgress} />
        </div>
      </div>
    </div>
  );
}
