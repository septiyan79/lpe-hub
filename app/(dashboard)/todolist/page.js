"use client";

import { useState, useEffect, useRef } from "react";
import { Plus, Trash2, Pencil, Check, X, LayoutList } from "lucide-react";

const FILTERS = ["Semua", "Aktif", "Selesai"];

export default function TodoListPage() {
  const [todos, setTodos] = useState([]);
  const [input, setInput] = useState("");
  const [filter, setFilter] = useState("Semua");
  const [editId, setEditId] = useState(null);
  const [editText, setEditText] = useState("");
  const [loading, setLoading] = useState(true);
  const editRef = useRef(null);

  useEffect(() => {
    fetch("/api/todos")
      .then((r) => r.json())
      .then((data) => { setTodos(data); setLoading(false); });
  }, []);

  useEffect(() => {
    if (editId) editRef.current?.focus();
  }, [editId]);

  const filtered = todos.filter((t) => {
    if (filter === "Aktif") return !t.done;
    if (filter === "Selesai") return t.done;
    return true;
  });

  async function addTodo() {
    if (!input.trim()) return;
    const res = await fetch("/api/todos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: input.trim() }),
    });
    const newTodo = await res.json();
    setTodos((prev) => [...prev, newTodo]);
    setInput("");
  }

  async function toggleDone(id, done) {
    const updated = await fetch(`/api/todos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done: !done }),
    }).then((r) => r.json());
    setTodos((prev) => prev.map((t) => (t.id === id ? updated : t)));
  }

  async function saveEdit(id) {
    if (!editText.trim()) return cancelEdit();
    const updated = await fetch(`/api/todos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: editText.trim() }),
    }).then((r) => r.json());
    setTodos((prev) => prev.map((t) => (t.id === id ? updated : t)));
    cancelEdit();
  }

  function cancelEdit() {
    setEditId(null);
    setEditText("");
  }

  async function deleteTodo(id) {
    await fetch(`/api/todos/${id}`, { method: "DELETE" });
    setTodos((prev) => prev.filter((t) => t.id !== id));
  }

  async function clearCompleted() {
    const completed = todos.filter((t) => t.done);
    await Promise.all(completed.map((t) => fetch(`/api/todos/${t.id}`, { method: "DELETE" })));
    setTodos((prev) => prev.filter((t) => !t.done));
  }

  const activeCount = todos.filter((t) => !t.done).length;
  const doneCount = todos.filter((t) => t.done).length;

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center gap-2">
        <LayoutList size={22} className="text-orange-950" />
        <h1 className="text-xl font-bold text-orange-950">Todo List</h1>
      </div>

      <div className="flex gap-3 text-sm">
        <span className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full font-medium">{activeCount} aktif</span>
        <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full font-medium">{doneCount} selesai</span>
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addTodo()}
          placeholder="Tambah tugas baru..."
          className="flex-1 border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
        />
        <button
          onClick={addTodo}
          className="bg-orange-950 text-white px-4 py-2.5 rounded-xl hover:bg-orange-800 transition flex items-center gap-1.5 text-sm font-medium"
        >
          <Plus size={16} /> Tambah
        </button>
      </div>

      <div className="flex gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
              filter === f ? "bg-orange-950 text-white" : "bg-white text-gray-600 border border-gray-200 hover:border-orange-300"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-orange-100 overflow-hidden">
        {loading ? (
          <p className="text-center text-gray-400 py-10 text-sm">Memuat...</p>
        ) : filtered.length === 0 ? (
          <p className="text-center text-gray-400 py-10 text-sm">Tidak ada tugas.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {filtered.map((todo) => (
              <li key={todo.id} className="flex items-center gap-3 px-4 py-3">
                <button
                  onClick={() => toggleDone(todo.id, todo.done)}
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition ${
                    todo.done ? "bg-green-500 border-green-500 text-white" : "border-gray-300 hover:border-orange-400"
                  }`}
                >
                  {todo.done && <Check size={11} strokeWidth={3} />}
                </button>

                {editId === todo.id ? (
                  <input
                    ref={editRef}
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveEdit(todo.id);
                      if (e.key === "Escape") cancelEdit();
                    }}
                    className="flex-1 border border-orange-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                  />
                ) : (
                  <span className={`flex-1 text-sm ${todo.done ? "line-through text-gray-400" : "text-gray-700"}`}>
                    {todo.text}
                  </span>
                )}

                <div className="flex items-center gap-1 shrink-0">
                  {editId === todo.id ? (
                    <>
                      <button onClick={() => saveEdit(todo.id)} className="p-1.5 rounded-lg text-green-600 hover:bg-green-50 transition"><Check size={15} /></button>
                      <button onClick={cancelEdit} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-50 transition"><X size={15} /></button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => { setEditId(todo.id); setEditText(todo.text); }} className="p-1.5 rounded-lg text-gray-400 hover:text-orange-600 hover:bg-orange-50 transition"><Pencil size={15} /></button>
                      <button onClick={() => deleteTodo(todo.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition"><Trash2 size={15} /></button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {doneCount > 0 && (
        <div className="flex justify-end">
          <button onClick={clearCompleted} className="text-sm text-red-400 hover:text-red-600 transition">
            Hapus semua yang selesai ({doneCount})
          </button>
        </div>
      )}
    </div>
  );
}
