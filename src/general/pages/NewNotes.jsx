import { useState, useEffect, useRef } from "react";
import NotesItem from "../components/newNotes/NotesItem";
import { Plus, Zap } from 'lucide-react';
import { useAutoResizeTextarea } from "../../hooks/useAutoResizeTextarea";

const NewNotes = () => {
  //TOGGLE FORM TAMBAH =================================================================
  const [secondFormOpened, setSecondFormOpened] = useState(false);
  const formRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      //artinya: ""jika (form dirender/ada && klik diluar form)""
      if (formRef.current && !formRef.current.contains(event.target)) {
        setSecondFormOpened(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);
  //END TOGGLE FORM TAMBAH ===============================================================

  // TOGGLE PROGRESS CONTENT =================================================
  const [openNoteId, setOpenNoteId] = useState(null);
  function togglePrgs(noteId) {
    setOpenNoteId((prev) =>
      prev === noteId ? null : noteId
    );
  }
  // END TOGGLE PROGRESS CONTENT ==============================================

  // USETATES ===============================================================================================
  const [notes, setNotes] = useState([]);
  const [inputTitle, setInputTitle] = useState("");
  const [inputDesc, setInputDesc] = useState("");
  // END USETATES ============================================================================================

  //LIST OF NOTES ============================================================================================
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

  // STRUKTUR DATA DI LOCAL STORAGE ⬅️==============================
  // const notes = [
  //   {
  //     id: "123",
  //     title: "Belajar React",
  //     desc: "useState & useEffect",
  //     done: false,
  //     progress: [
  //       {
  //         id: Date.now().toString(),
  //         act: "Membuat komponen",
  //         tglAct: "2026-01-01",
  //         status: "Plan",        // bisa Plan / On Process / Done
  //         feedback: "",
  //         tglFeedback: ""
  //       },
  //       {
  //         id: (Date.now() + 1).toString(),
  //         act: "Menghubungkan state",
  //         tglAct: "2026-01-02",
  //         status: "On Process",
  //         feedback: "Masih perlu belajar useEffect",
  //         tglFeedback: "2026-01-03"
  //       }
  //     ]
  //   }
  //   {...}
  // ];
  //END STRUKTUR DATA DI LOCAL STORAGE ⬅️==============================


  //simpan data ke localStorage (tergantung pada perubahan [notes])
  useEffect(() => {
    if (notes.length > 0) {
      localStorage.setItem("notes", JSON.stringify(notes));
    }
  }, [notes]);
  // END LIST OF NOTES =========================================================================================


  // ADD NOTES HANDLER ======================================================================================
  function addNotes(e) {
    e.preventDefault();

    const title = inputTitle.trim();
    const desc = inputDesc.trim();

    if (!title || !desc) return;

    const newNotes = { id: Date.now().toString(), title, desc, done: false, progress: [] };
    setNotes((prev) => [newNotes, ...prev]);

    setInputTitle("");
    setInputDesc("");
  }
  // END, ADD NOTES HANDLER ==================================================================================

  // ADD PROGRESS HANDLER ======================================================================================
  function addProgress(noteId, progressData) {
    setNotes((prev) =>
      prev.map((note) =>
        note.id === noteId
          ? { ...note, progress: [...note.progress, progressData] }
          : note
      )
    )
  }
  // END, ADD PROGRESS HANDLER =================================================================================

  // ADD FEEDBACK
  function addFeedback(noteId, progressId, feedbackData) {
    setNotes((prev) =>
      prev.map((note) =>
        note.id === noteId
          ?
          {
            ...note,
            progress: note.progress.map((prgs) =>
              prgs.id === progressId
                ? {
                  ...prgs,
                  feedback: feedbackData.feedback,
                  tglFeedback: feedbackData.tglFeedback
                }
                : prgs
            )
          }
          : note
      )
    );
  }

  // EDIT NOTES ==============================================================================================
  const updateNoteField = (id, field, value) => {
    setNotes(notes =>
      notes.map(note =>
        note.id === id ? { ...note, [field]: value } : note
      )
    );
  };

  const updateProgressField = (noteId, progressId, field, value) => {
    setNotes(notes =>
      notes.map(note =>
        note.id !== noteId
          ? note
          : {
            ...note,
            progress: note.progress.map(prgs =>
              prgs.id !== progressId
                ? prgs
                : { ...prgs, [field]: value }
            )
          }
      )
    );
  };

  // PAKAI HOOK
  const textareaRef = useAutoResizeTextarea(inputDesc);

  return (
    <div className="min-h-screen bg-orange-50 p-4 md:p-10 font-sans text-slate-800">
      <div className="max-w-6xl mx-auto">

        {/* Top Minimalist Form */}
        <div className="flex flex-col md:flex-row items-center justify-between mb-12
                    bg-white/40 backdrop-blur-md p-4 rounded-3xl 
                    border border-white/60 shadow-sm
                    transition-all duration-900 ease-in-out w-full md:w-auto"
        >

          <div className="flex items-center gap-4 px-4 w-full md:w-auto">
            <div className="bg-orange-500 p-2 rounded-2xl shadow-lg shadow-orange-200 text-white">
              <Zap size={20} fill="white" />
            </div>
            <h1 className="text-xl font-black tracking-tight uppercase">Activity Notes App</h1>
          </div>

          <form onSubmit={addNotes} ref={formRef}>
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
                  className={`${secondFormOpened ? 'max-h-[200px] opacity-100' : 'max-h-0 opacity-0'
                    } transition-all duration-300 ease-in-out`}
                >
                  {secondFormOpened && (
                    <textarea
                      ref={textareaRef}
                      type="text"
                      placeholder="Description here..."
                      className="w-full bg-white border-none rounded-2xl py-3 px-6 shadow-inner focus:ring-2 focus:ring-orange-200 outline-none text-sm resize-none overflow-hidden"
                      value={inputDesc}
                      onChange={(ev) => setInputDesc(ev.target.value)}
                      rows={1}
                    />
                  )}
                </div>
              </div>

              <button
                className={` 
                ${secondFormOpened ? 'bg-orange-500' : 'bg-orange-300'} rounded-2xl shadow-sm hover:shadow-md
                group-hover:bg-orange-500 hover:text-white 
                transition-all duration-300 ease-in-out 
                text-white px-4 flex items-center justify-center 
                transform ${secondFormOpened ? 'h-24' : 'h-12'}`
                }
                type="submit"

              >
                <Plus size={24} />
              </button>

            </div>
          </form>
        </div>

        {/* The Activities Stack */}
        <div className="space-y-6">
          {notes.map((note) => (
            <NotesItem
              key={note.id}
              note={note}
              isOpen={openNoteId === note.id}
              togglePrgs={togglePrgs}
              addProgress={addProgress}
              addFeedback={addFeedback}
              updateNoteField={updateNoteField}
              updateProgressField={updateProgressField}

            />
          ))}
        </div>

      </div>
    </div>
  );
};

export default NewNotes;
