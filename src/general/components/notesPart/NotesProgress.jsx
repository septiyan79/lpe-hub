import { useState } from "react";

export default function NotesProgress({ note, onAddProgress }) {

    const [act, setAct] = useState("");
    const [tglAct, setTglAct] = useState("");

    function handleSubmit(e) {
        e.preventDefault(); //fungsi: mencegah perilaku default (bawaan) dari sebuah event

        if (!act || !tglAct) return;
        
        onAddProgress(note.id, {
            id: Date.now().toString(),
            act,
            tglAct,
            status: "Plan"
        });

        setAct("");
        setTglAct("");
    }

    return (
        <>
            <h3 className="text-lg font-semibold text-gray-700 mb-4">
                Progress
                {/* - {note.id} */}
            </h3>
            {/* Progress Item 1 */}
            {note.progress.map((prgs) => (
                <div
                    key={prgs.id}
                    className="bg-white p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 border-l-4 border-cyan-500 flex justify-between items-start"
                >

                    {/* Left Side: Action & Feedback */}
                    <div className="flex flex-col justify-between">
                        <p className="text-sm text-gray-800 font-semibold">{prgs.act}</p>
                        {prgs.feedback &&
                            <>
                                <h6 className="mt-2">
                                    <span className="text-sm font-semibold text-gray-800">Feedback</span>
                                    <span className="text-xs text-gray-500 ">{prgs.tglFeedback}</span>
                                </h6>
                                <p className="text-sm text-gray-600">
                                    {prgs.feedback}
                                </p>
                            </>
                        }
                    </div>

                    {/* Right Side: Date & Status Badge */}
                    <div className="flex items-center justify-end space-x-2">
                        <span className="text-xs text-gray-500">
                            {new Date(prgs.tglAct).toLocaleDateString("en-GB", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                            })}
                        </span>
                        <span className="text-xs items-center px-2 py-1 rounded-full bg-green-500 text-white">
                            {prgs.status}
                        </span>
                    </div>
                </div>
            ))}


            {/* Form Tambah Progress Baru */}
            <div className="bg-white p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 border-l-4 border-cyan-800">

                <form onSubmit={handleSubmit}>
                    <div className="flex justify-between items-start space-x-4">
                        {/* Action Input */}
                        <div className="flex-1">
                            <input
                                id="action"
                                type="text"
                                className="w-full border border-cyan-200 text-gray-800 rounded p-2"
                                placeholder="Write an activity..."
                                value={act}
                                onChange={(ev) => setAct(ev.target.value)}
                            />
                            <label className="text-xs text-gray-700" htmlFor="action">Activity</label>
                        </div>

                        {/* Date Input */}
                        <div className="w-32">
                            <input
                                id="date"
                                type="date"
                                className="w-full border border-cyan-200 text-gray-800 rounded p-2 text-sm"
                                value={tglAct}
                                onChange={(ev) => setTglAct(ev.target.value)}
                            />
                            <label className="text-xs text-gray-700" htmlFor="date">Activity Date</label>
                        </div>

                        {/* Submit Button */}
                        <button type="submit"
                            className="bg-cyan-800 hover:bg-cyan-600 text-white px-4 py-2 rounded"
                        >
                            Add Progress
                        </button>
                    </div>

                </form >
            </div >

            <div></div>
        </>
    );
}


