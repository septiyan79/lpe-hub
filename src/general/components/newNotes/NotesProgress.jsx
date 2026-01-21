import {
    Plus,
    CheckCircle,
    MessageSquare,
    CalendarClock,
    Footprints,
} from 'lucide-react';

import { useState } from 'react';

export default function NotesProgress({ note, addProgress, addFeedback, updateProgressField }) {
    const [inputAct, setInputAct] = useState("");
    const [inputTglAct, setInputTglAct] = useState("");

    function handleSubmit(e) {
        e.preventDefault();

        const act = inputAct.trim();
        const tglAct = inputTglAct.trim();

        if (!act || !tglAct) return;

        addProgress(note.id, {
            id: Date.now().toString(),
            act,
            tglAct,
            status: "Plan",
        });

        setInputAct("");
        setInputTglAct("");
    }

    const [inputFeedback, setInputFeedback] = useState({});

    function handleSubmitFeedback(e, progressId) {
        e.preventDefault();

        const data = inputFeedback[progressId];
        if (!data || !data.feedback || !data.tglFeedback) return;

        addFeedback(note.id, progressId, {
            feedback: data.feedback,
            tglFeedback: data.tglFeedback,

        });

        setInputFeedback(prev => {
            const copy = { ...prev };
            delete copy[progressId];
            return copy;
        });
    }


    // EDIT PROGRESS FIELD =============================================================================
    const [draftProgress, setDraftProgress] = useState({});
    const [editingProgress, setEditingProgress] = useState(null); // { progressId, field }


    const startEditProgress = (progressId, field, value) => {
        setEditingProgress({ progressId, field });
        setDraftProgress(prev => ({ ...prev, [progressId]: value }));
    };


    const saveEditProgress = (progressId) => {
        if (!draftProgress[progressId]?.trim()) return;

        updateProgressField(note.id, progressId, editingProgress.field, draftProgress[progressId]);

        setEditingProgress(null);
        setDraftProgress(prev => {
            const copy = { ...prev };
            delete copy[progressId];
            return copy;
        });
        setEditingProgress(null);
    };


    return (
        <>
            {note.progress.map((prgs) => (
                <div key={prgs.id} className="bg-white p-5 rounded-4xl shadow-sm hover:shadow-md transition-shadow group border border-transparent hover:border-orange-100">
                    <div className={`flex items-center justify-between ${prgs.feedback ? 'mb-3' : 'mb-3'}`}>
                        <div className="flex flex-1/3 items-center gap-2">
                            <div className="p-0.5 bg-orange-50 text-orange-500 rounded-xl group-hover:bg-orange-500 group-hover:text-white transition-colors">
                                <CheckCircle size={16} />
                                {/* emerald */}
                                {/* <CalendarClock size={16} /> */}
                                {/* cyan */}
                                {/* <Footprints size={16} /> */}
                                {/* orange */}
                            </div>

                            {editingProgress?.progressId === prgs.id && editingProgress.field === 'act'
                                ? (
                                    <input
                                        className='font-bold text-slate-800 text-sm leading-none outline-none border-b border-orange-400 w-[90%]'
                                        value={draftProgress[prgs.id] || ""}
                                        onChange={(ev) => setDraftProgress(prev => ({...prev, [prgs.id]: ev.target.value}))}
                                        onBlur={() => saveEditProgress(prgs.id)}
                                        autoFocus
                                    />
                                )
                                : (
                                    <h4 className="font-bold text-slate-800 text-sm leading-none"
                                        onClick={() => startEditProgress(prgs.id, 'act', prgs.act)}>
                                        {prgs.act}
                                    </h4>
                                )
                            }
                        </div>

                        {editingProgress?.progressId === prgs.id && editingProgress.field === 'tglAct'
                            ? (
                                <input
                                    type='date'
                                    autoFocus
                                    value={draftProgress[prgs.id] || ""}
                                    onChange={(ev) => setDraftProgress(prev => ({...prev, [prgs.id]: ev.target.value}))}
                                    onBlur={() => saveEditProgress(prgs.id)}
                                    className="text-[10px] text-slate-600 font-medium italic outline-none"
                                />
                            ) : (
                                <span className="text-[10px] text-slate-600 font-medium italic cursor-pointer"
                                    onClick={() => startEditProgress(prgs.id, 'tglAct', prgs.tglAct)}>
                                    {new Date(prgs.tglAct).toLocaleDateString("en-GB", {
                                        day: "2-digit",
                                        month: "short",
                                        year: "numeric",
                                    })}
                                </span>
                            )}
                    </div>

                    {prgs.feedback
                        ?
                        <div className="bg-slate-50 p-3 rounded-2xl text-[11px] text-slate-500 relative">
                            <MessageSquare
                                size={30}
                                className="absolute top-2 right-0.5 transform -translate-y-1/2 text-orange-200 group-hover:text-orange-500"
                            />
                            <span className="font-semibold text-slate-700 block mb-1">
                                Feedback<b> </b>
                                {editingProgress?.progressId === prgs.id && editingProgress.field === 'tglFeedback'
                                    ? (
                                        <small className="text-orange-500">
                                            <input
                                                type='date'
                                                autoFocus
                                                value={draftProgress[prgs.id] || ""}
                                                onChange={(ev) => setDraftProgress(prev => ({...prev, [prgs.id]: ev.target.value}))}
                                                onBlur={() => saveEditProgress(prgs.id)}
                                                className="outline-none"
                                            />
                                        </small>
                                    ) : (
                                        <small className="text-orange-500 cursor-pointer" onClick={() => startEditProgress(prgs.id, 'tglFeedback', prgs.tglFeedback)}>
                                            {new Date(prgs.tglFeedback).toLocaleDateString("en-GB", {
                                                day: "2-digit",
                                                month: "short",
                                                year: "numeric",
                                            })}
                                        </small>
                                    )}

                            </span>
                            {editingProgress?.progressId === prgs.id && editingProgress.field === 'feedback'
                                ? (
                                    <textarea
                                        className='w-full md:w-full flex items-center justify-center focus:outline-none group-hover:text-orange-500'
                                        value={draftProgress[prgs.id] || ""}
                                        onBlur={() => saveEditProgress(prgs.id)}
                                        onChange={(ev) => setDraftProgress(prev => ({...prev, [prgs.id]: ev.target.value}))}
                                        spellCheck={false}
                                        rows={1}
                                    />
                                )
                                : (
                                    <p onClick={() => startEditProgress(prgs.id, 'feedback', prgs.feedback)}>
                                        {prgs.feedback}
                                    </p>
                                )}
                        </div>
                        :
                        <div className="bg-slate-50 hover:bg-orange-50 hover:text-orange-500 p-2 rounded-2xl text-[11px] text-slate-500 group">
                            <form onSubmit={(e) => handleSubmitFeedback(e, prgs.id)}>
                                <div className='flex flex-col md:flex-row gap-1 mb-1'>
                                    <input
                                        className='w-full md:w-[80%] flex items-center justify-center focus:outline-none group-hover:text-orange-500'
                                        placeholder='input feedback disini...'
                                        value={inputFeedback[prgs.id]?.feedback || ""}
                                        onChange={(e) =>
                                            setInputFeedback(prev => ({
                                                ...prev,
                                                [prgs.id]: {
                                                    ...prev[prgs.id],
                                                    feedback: e.target.value
                                                }
                                            }))
                                        }
                                    />

                                    <input
                                        className='w-full md:w-[20%] flex items-center justify-center focus:outline-none'
                                        type='date'
                                        value={inputFeedback[prgs.id]?.tglFeedback || ""}
                                        onChange={(e) =>
                                            setInputFeedback(prev => ({
                                                ...prev,
                                                [prgs.id]: {
                                                    ...prev[prgs.id],
                                                    tglFeedback: e.target.value
                                                }
                                            }))
                                        }
                                    />

                                    <button
                                        type="submit"
                                        className="text-xs text-orange-500 font-semibold mt-1"
                                        disabled={
                                            !inputFeedback[prgs.id]?.feedback ||
                                            !inputFeedback[prgs.id]?.tglFeedback
                                        }
                                    >
                                        Save
                                    </button>
                                </div>
                            </form>
                        </div>
                    }

                </div>
            ))}


            {/* Add Progress - Simple Inline Form */}
            <form onSubmit={handleSubmit}>
                <div className="flex flex-col md:flex-row gap-2 mb-2 group">
                    <input className="w-full md:w-[60%] flex items-center justify-center
                                    border-2 border-dashed border-slate-200 rounded-4xl p-4
                                    hover:bg-white transition-all cursor-pointer group
                                    text-slate-400 text-xs
                                    group-hover:text-orange-500 group-hover:border-orange-300
                                    focus:bg-white focus:text-orange-500 focus:border-orange-300
                                    focus:outline-none focus-visible:outline-none"
                        placeholder='Input the progress here ...'
                        value={inputAct}
                        onChange={(e) => setInputAct(e.target.value)}
                    />

                    <input className="w-full md:w-[25%] flex items-center justify-center
                                    border-2 border-dashed border-slate-200 rounded-4xl p-4
                                    hover:bg-white transition-all cursor-pointer group 
                                    text-slate-400 text-xs
                                    group-hover:text-orange-500 group-hover:border-orange-300
                                    focus:bg-white focus:text-orange-500 focus:border-orange-300
                                    focus:outline-none focus-visible:outline-none"
                        type='date'
                        value={inputTglAct}
                        onChange={(e) => setInputTglAct(e.target.value)}
                    />

                    <div className="w-full md:w-[15%] flex items-center justify-center
                                    border-2 border-dashed border-slate-200 rounded-4xl p-4
                                    group-hover:bg-orange-100 group-hover:border-orange-500 transition-all cursor-pointer">
                        <button type="submit" className="flex items-center gap-2 text-slate-400 font-bold text-xs group-hover:text-orange-500">
                            <Plus size={16} />
                            Add
                        </button>
                    </div>
                </div>
            </form>
        </>

    );
}