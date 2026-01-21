import NotesProgress from './NotesProgress';
import { LayoutList } from 'lucide-react';
import { useState } from 'react';
import { useAutoResizeTextarea } from "../../../hooks/useAutoResizeTextarea";


export default function NotesItem({ note, isOpen, togglePrgs, addProgress, addFeedback, updateNoteField, updateProgressField }) {
    const [editingNote, setEditingNote] = useState(null); // null | 'title' | 'desc' | 'done'
    const [draftNote, setDraftNote] = useState('');

    const startEditNote = (field, value) => {
        setEditingNote(field);
        setDraftNote(value);
    };

    const saveEditNote = () => {
        if (!editingNote) return;

        updateNoteField(note.id, editingNote, draftNote);
        setEditingNote(null);
        setDraftNote("");
    }

    // PAKAI HOOK
    const textareaRef = useAutoResizeTextarea(draftNote);

    return (
        <div className="flex flex-col lg:flex-row bg-white rounded-[2.5rem] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-white relative">

            {/* Left Side */}
            <div className={`transition-all duration-300 ease-in-out ${isOpen ? 'lg:w-1/3 max-w-full opacity-100' : 'lg:w-3/3 max-w-full opacity-100'} p-6 lg:p-8 border-r border-slate-50`}>
                <div className="flex justify-between items-center gap-2 mb-4">
                    <div className="flex items-center gap-2">
                        <span className="h-1 w-10 bg-orange-500 rounded-full"></span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
                            <div className="inline-flex items-center px-3 py-1 bg-orange-500 rounded-2xl text-xs font-bold text-orange-50">
                                {/* Toggle Button */}
                                <button
                                    onClick={() => {
                                        const newStatus = !note.done;
                                        updateNoteField(note.id, 'done', newStatus);
                                        // Update localStorage
                                        // localStorage.setItem(`note_${note.id}_status`, newStatus ? 'done' : 'on-going');
                                    }}
                                    className={`inline-flex items-center px-3 py-1 rounded-2xl text-xs font-bold transition-all duration-500 ease-in-out ${note.done ? 'bg-orange-500 text-green-50' : 'bg-orange-500 text-orange-50'
                                        } hover:opacity-80 cursor-pointer`}
                                >
                                    {/* Status Text */}
                                    {note.done ? "Done" : "On Going"}
                                </button>
                            </div>
                        </span>
                    </div>

                    <LayoutList
                        size={30}
                        className={`text-orange-500 transition-all duration-400 ease-in-out absolute right-8 top-10 z-10 transform -translate-y-1/2 ${!isOpen ? 'opacity-100 translate-x-0' : 'opacity-20 translate-x-1'} cursor-pointer`}
                        onClick={() => togglePrgs(note.id)}
                    />
                </div>
                {editingNote === 'title' ? (
                    <textarea
                        ref={textareaRef}
                        autoFocus
                        value={draftNote}
                        onChange={(ev) => setDraftNote(ev.target.value)}
                        onBlur={saveEditNote}
                        rows={1}
                        className='text-2xl font-bold w-full outline-none border-b border-orange-500 bg-transparent mb-3 resize-none overflow-hidden'
                        spellCheck={false}
                    />

                ) : (
                    <h2 className="text-2xl font-bold leading-tight mb-3 text-slate-900 cursor-pointer hover:text-orange-500 transition"
                        onClick={() => startEditNote('title', note.title)}
                        title="Click to edit title"
                    >
                        {note.title}
                    </h2>
                )}
                {editingNote === 'desc' ? (
                    <textarea
                        ref={textareaRef}
                        autoFocus
                        value={draftNote}
                        onChange={(ev) => setDraftNote(ev.target.value)}
                        onBlur={saveEditNote}
                        rows={1}
                        className='text-slate-400 text-sm mb-1 leading-snug w-full outline-none border-b border-orange-500 bg-transparent resize-none overflow-hidden'
                        spellCheck={false}
                    />
                ) : (
                    <p className="text-slate-400 text-sm mb-1 leading-snug"
                        onClick={() => startEditNote('desc', note.desc)}
                        title="Click to edit description"
                    >
                        {note.desc}
                    </p>
                )}
            </div>

            {/* Right Side*/}
            <div className={`flex-1 bg-slate-50/50 p-6 lg:p-8 transition-all duration-300 ease-in-out ${isOpen ? ' max-h-auto lg:max-h-[1000px] opacity-100 display-block' : 'max-h-0 opacity-0 overflow-hidden display-none'}`}>
                <div className="flex items-center mb-6">
                    <h3 className={`font-bold text-sm flex items-center gap-2 cursor-pointer transition-all duration-700 ease-in-out ${isOpen ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4'}`} onClick={() => togglePrgs(note.id)}>
                        <div className="flex items-end">
                            <LayoutList size={16} className="text-orange-500" />
                        </div>

                        {/* Teks dengan animasi fade-in/out */}
                        <span>
                            Progress Logs
                        </span>
                    </h3>
                </div>

                <div
                    className={`transition-all duration-300 ease-in-out overflow-hidden ${isOpen ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}
                >
                    {/* List Progress Logs */}
                    <div className="grid grid-cols-1 gap-2">
                        <NotesProgress
                            note={note}
                            addProgress={addProgress}
                            addFeedback={addFeedback}
                            updateProgressField={updateProgressField}
                        />
                    </div>
                </div>
            </div>


        </div>



    );
}