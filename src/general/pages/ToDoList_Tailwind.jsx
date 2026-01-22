import { useState, useEffect } from "react";
import { Plus, Zap } from 'lucide-react';

export default function ToDoList() {
    // state: todos = { id, text, done }
    const [todos, setTodos] = useState(() => {
        try {
            const raw = localStorage.getItem("todos_v1");
            return raw ? JSON.parse(raw) : [];
        } catch (e) {
            return [];
        }
    });

    const [input, setInput] = useState("");
    const [editingId, setEditingId] = useState(null);
    const [filter, setFilter] = useState("all");


    //simpan ke Local Storage dengan pemicu perubahan pada state todos ([todos])
    useEffect(() => {
        localStorage.setItem("todos_v1", JSON.stringify(todos));
    }, [todos]);
    // => useEffect menerima dua argumen:
    //    - Fungsi efek (callback) yang dijalankan setelah render
    //    - Array dependensi, yang memberi tahu React kapan efek tersebut harus dijalankan.

    function addTodo() {
        const text = input.trim();
        if (!text) return;
        const newTodo = { id: Date.now().toString(), text, done: false };
        setTodos((s) => [newTodo, ...s]);
        //ini cara aman menggunakan fungsi UPDATER, 
        //jika pakai [...todos, newTodo] berpotensi bikin balapan ketika perubahan data nya cepet

        //bentuk dasar fungsi updater: 
        // setState((previousState) => {
        //     // Operasikan state sebelumnya
        //     return newState;
        // });
        // atau:
        // setState((parameter_state) => [newData, ...parameter_state])
        setInput("");
    }

    function startEdit(todo) {
        setEditingId(todo.id);
        setInput(todo.text);
    }

    function saveEdit() {
        const text = input.trim();
        if (!text) return;
        setTodos((s) => s.map((t) => (t.id === editingId ? { ...t, text } : t)));
        setEditingId(null);
        setInput("");
    }

    // 1. cancelEdit
    // 2. toggleDone
    // 3. deleteTodo
    // 4. clearComplete
    // 5. filteredTodo

    function cancelEdit() {
        setEditingId(null);
        setInput("");
    }

    function toggleDone(id) {
        const done = true;
        setTodos((st) => st.map((ob) => (ob.id === id ? { ...ob, done: !ob.done } : ob)));
    }

    function deleteTodo(id) {
        setTodos((st) => st.filter((ob) => ob.id !== id));
    }

    function clearComplete() {
        setTodos((st) => st.filter((ob) => !ob.done));
    }

    function filteredTodos() {
        if (filter === "active") return todos.filter((ob) => !ob.done);
        if (filter === "completed") return todos.filter((ob) => ob.done);
        return todos;
    }




    return (
        <div className="min-h-screen bg-orange-50 p-4 md:p-10 font-sans text-slate-800">
            <div className="max-w-3xl mx-auto p-4">
                <div className="flex flex-col md:flex-row items-center justify-between mb-12
                    bg-white/40 backdrop-blur-md p-4 rounded-3xl 
                    border border-white/60 shadow-sm
                    transition-all duration-900 ease-in-out w-full md:w-auto"
                >
                    <div className="flex items-center gap-4 px-4 w-full md:w-auto">
                        <div className="bg-orange-500 p-2 rounded-2xl shadow-lg shadow-orange-200 text-white">
                            <Zap size={20} fill="white" />
                        </div>
                        <h1 className="text-xl font-black tracking-tight uppercase">Simple to Do List</h1>
                    </div>

                </div>


                <div className="md:flex-row items-center justify-between mb-12
                    bg-white/40 backdrop-blur-md p-4 rounded-3xl 
                    border border-white/60 shadow-sm
                    w-full md:w-auto"
                >
                    <div className="m-3">
                        {/* input */}
                        <div className="flex gap-2 mb-4">
                            <input
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        editingId ? (
                                            saveEdit()
                                        ) : (
                                            addTodo()
                                        )
                                    }
                                    if (e.key === "Escape") {
                                        cancelEdit();
                                    }
                                }}
                                className="flex-1 border rounded-md px-3 py-2 focus:outline-none focus:ring-2 text-amber-900 focus:ring-amber-200 border-amber-700"
                                placeholder="Add new Todo"
                            />

                            <div className="flex items-center gap-2">
                                {editingId ? (
                                    <>
                                        <button
                                            onClick={saveEdit}
                                            className="px-3 py-2 rounded-md bg-amber-600 text-amber-100 hover:bg-amber-500"
                                        > Save </button>
                                    </>
                                ) : (
                                    <button
                                        onClick={addTodo}
                                        className="px-3 py-2 rounded-md bg-amber-600 text-amber-100 hover:bg-amber-500"
                                    > Add </button>
                                )}
                            </div>
                        </div>

                        {/* controls */}
                        <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center gap-3 mb-4 text-white">
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setFilter("all")}
                                    className={`px-3 py-1 rounded-full border text-brown-900 ${filter === "all" ? "bg-amber-100 text-amber-900" : "bg-amber-900 text-amber-100"}`}
                                >
                                    All
                                </button>
                                <button
                                    onClick={() => setFilter("active")}
                                    className={`px-3 py-1 rounded-full border ${filter === "active" ? "bg-amber-100 text-amber-900" : "bg-amber-900 text-amber-100"}`}
                                >
                                    Active
                                </button>
                                <button
                                    onClick={() => setFilter("completed")}
                                    className={`px-3 py-1 rounded-full border ${filter === "completed" ? "bg-amber-100 text-amber-900" : "bg-amber-900 text-amber-100"}`}
                                >
                                    Completed
                                </button>
                            </div>


                            {/* <div className="text-sm text-gray-600">{todos.filter((t) =& gt; !t.done).length} items left</div> */}
                        </div>

                        {/* list */}
                        <ul className="space-y-2">
                            {filteredTodos().map((todo) => (
                                <li key={todo.id}
                                    className="
                            flex items-center justify-between 
                            bg-grey shadow-sm 
                            border border-amber-300 
                            rounded-md p-3 
                            text-amber-800
                            hover:border-amber-600
                            hover:text-amber-900">

                                    <div className="flex items-center gap-3">
                                        <input
                                            type="checkbox"
                                            value={todo.done}
                                            onChange={() => toggleDone(todo.id)}
                                            className="w-5 h-5"
                                            checked={todo.done}
                                        />
                                        <div className={`text-sm ${todo.done ? "line-through text-gray-400" : ""}`}>
                                            {todo.text}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <button onClick={() => startEdit(todo)} className="px-2 py-1 text-xs rounded-md border text-blue-300 hover:text-blue-200">
                                            Edit
                                        </button>
                                        <button onClick={() => deleteTodo(todo.id)} className="px-2 py-1 text-xs rounded-md border text-red-300 hover:text-red-400">
                                            Delete
                                        </button>
                                    </div>

                                </li>
                            ))}
                        </ul>


                        {/* footer actions */}
                        <div className="mt-4 flex items-center justify-between">
                            <button onClick={clearComplete} className="px-3 py-2 bg-amber-600 rounded-md border text-sm text-white">
                                Clear completed
                            </button>

                            <button className="px-3 py-2 bg-red-800 rounded-md border text-sm text-white"
                                onClick={() => {
                                    if (!confirm("Yakin hapus semua?")) return;
                                    setTodos([]);
                                }}>
                                Clear All
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}