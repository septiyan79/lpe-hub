import { useState, useEffect } from "react";
import { FaChevronDown, FaChevronUp } from 'react-icons/fa';
import NotesItem from "../components/notesPart/NotesItem";

export default function Notes() {
    const [notes, setNotes] = useState([]);
    const [inputTitle, setInputTitle] = useState("");
    const [inputDesc, setInputDesc] = useState("");

    //cek ada data apa egak (render hanya sekali)
    //kalo ada data set ke state notes
    useEffect(() => {
        const saved = JSON.parse(localStorage.getItem("notes"));
        if (saved && Array.isArray(saved)) {
            const normalized = saved.map((n) => ({
                ...n,
                progress: Array.isArray(n.progress) ? n.progress : []
            }));
            setNotes(normalized);
        }
    }, []);

    // STRUKTUR
    // {
    //     id: "123",
    //     title: "Belajar React",
    //     desc: "useState & useEffect",
    //     done: false,
    //     progress: [
    //       id: Date.now().toString(),
    //       act,
    //       tglAct,
    //       status: "Plan", "on Process", "Done",
    //       feedback,
    //       tglFeedback,
    //     ] // ⬅️ WAJIB ADA
    // }

    //simpan data ke localStorage (tergantung pada perubahan [notes])
    useEffect(() => {
        if (notes.length > 0) {
            localStorage.setItem("notes", JSON.stringify(notes));
        }
    }, [notes]);

    function addNotes() {
        const title = inputTitle.trim();
        const desc = inputDesc.trim();

        if (!title) return;
        if (!desc) return;

        const newNotes = { id: Date.now().toString(), title, desc, done: false };
        setNotes((st) => [newNotes, ...st]);

        setInputTitle("");
        setInputDesc("");
    }

    function addProgress(noteId, progressData) {
        setNotes((prev) => 
            prev.map((note) =>
                note.id === noteId
                ? {...note, progress: [...note.progress, progressData]}
                : note
            )
        );
    }

    // ADD NOTES TOGGLES HANDLE ================================================
    const [tbhOpen, setTbhOpen] = useState(false);
    function toggleTbh() {
        setTbhOpen(!tbhOpen);
    }
    // END ADD NOTES TOGGLES HANDLE ============================================

    // PROGRESS TOGGLES HANDLE =================================================
    const [openNoteId, setOpenNoteId] = useState(null);
    function togglePrgs(noteId) {
        setOpenNoteId((prev) => 
            prev === noteId ? null : noteId
        );
    }
    // END PROGRESSTOGGLES HANDLE ==============================================

    return (
        <div className="max-w-3xl mx-auto p-4">
            <h1 className="text-2xl text-amber-50 font-semibold mb-4">Activity Notes App</h1>

            {/* FORM TAMBAH */}
            <div className="bg-cyan-50 text-cyan-800 p-6 rounded-lg shadow-md mb-6">
                <div className="flex justify-between items-center cursor-pointer" onClick={toggleTbh}>
                    <h2 className="text-xl font-semibold">Add a New Note</h2>
                    <span className="text-2xl">
                        {tbhOpen ? <FaChevronUp /> : <FaChevronDown />}
                    </span>
                </div>

                <div className={`transition-all duration-300 ease-in-out overflow-hidden ${tbhOpen ? 'max-h-screen' : 'max-h-0'}`}>
                    <label className="block text-cyan-800 mt-4 mb-1">Title</label>
                    <input
                        className="w-full border border-cyan-700 text-cyan-800 rounded p-2 mb-3"
                        placeholder="Write a title..."
                        value={inputTitle}
                        onChange={(ev) => setInputTitle(ev.target.value)}
                    />

                    <label className="block text-cyan-800 mb-1">Note</label>
                    <textarea
                        placeholder="Write a Description..."
                        className="w-full border border-cyan-700 text-cyan-800 rounded p-2 mb-3"
                        rows={4}
                        value={inputDesc}
                        onChange={(ev) => setInputDesc(ev.target.value)}
                    />

                    <button
                        type="submit"
                        className="bg-cyan-800 hover:bg-cyan-600 text-white px-4 py-2 rounded"
                        onClick={() => addNotes()}
                    >
                        Tambah
                    </button>
                </div>
            </div>


            {/* Notes List */}
            <div className="space-y-3">
                {notes.map((note) => (
                    <NotesItem
                        key={note.id}
                        note={note}
                        isOpen={openNoteId === note.id}
                        togglePrgs={togglePrgs}
                        onAddProgress={addProgress}
                    />
                ))}


            </div >
        </div >

    );
}