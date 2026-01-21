import { useState } from "react";
import { FaChevronDown, FaChevronUp } from 'react-icons/fa';
import NotesProgress from "./notesProgress";

export default function NotesItem({ note, isOpen, togglePrgs, onAddProgress }) {
    return (
        <div className="bg-cyan-100 p-6 rounded-lg shadow-lg hover:shadow-2xl transition-shadow duration-300 border-r-6 border-l-6 border-cyan-50">
            <div onClick={() => togglePrgs(note.id)} className="flex justify-between items-center cursor-pointer">
                <h2 className="text-2xl font-bold text-cyan-800">
                     {note.title} {/* - {note.id} */}
                </h2>
                <button 
                  className="text-cyan-800 hover:text-cyan-500 focus:outline-none"
                  
                >
                    {isOpen ? <FaChevronUp /> : <FaChevronDown />}
                </button>
            </div>

            <p className="text-cyan-900 mt-2">
                {note.desc}
            </p>

            {/* PROGRESS SECTION */}
            <div className="mt-6">
                <div className={`space-y-4 transition-all duration-300 ease-in-out overflow-hidden ${isOpen ? 'max-h-screen' : 'max-h-0'}`}>
                    <NotesProgress 
                        note={note}
                        onAddProgress={onAddProgress} 
                    />
                </div>
            </div>
        </div>
    );
}