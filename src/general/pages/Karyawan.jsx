import { useState, useEffect } from 'react';

function Karyawan() {
  const [karyawans, setKaryawans] = useState(() => {
    try {
      const raw = localStorage.getItem("karyawans_v1");
      return raw ? JSON.parse(raw) : [];
    } catch (error) {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem("karyawans_v1", JSON.stringify(karyawans));
  }, [karyawans]);

  const [inNama, setInNama] = useState("");
  const [inJab, setInJab] = useState("");

  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const openModal = (karyawan) => {
    setIsOpen(true);
    setEditingId(karyawan.id);
    setInNama(karyawan.nama);
    setInJab(karyawan.jabatan);
  };

  const closeModal = () => setIsOpen(false);

  function saveEdit(){
    const nama = inNama;
    const jabatan = inJab;
    if (!nama) return;
    setKaryawans((st) => st.map((ob) => (editingId === ob.id ? {...ob, nama, jabatan} : ob)));
    setIsOpen(false);
    setEditingId(null);
    setInNama("");
    setInJab("");
  }

  function saveTbh() {
    const nama = inNama.trim();
    const jabatan = inJab.trim();
    if (!nama) return;
    const newKaryawans = { id: Date.now().toString(), nama, jabatan };
    setKaryawans((st) => [newKaryawans, ...st]);
    setInNama("");
    setInJab("");
  }

  function delKaryawan(id) {
    setKaryawans((st) => st.filter((ob) => ob.id !== id));
  }

  return (
    <div className="max-w-3xl mx-auto p-4">
      <h1 className="text-2xl text-amber-50 font-semibold mb-4">Karyawan</h1>

      {/* FORM TAMBAH */}
      <div className="bg-cyan-800 text-cyan-100 p-6 rounded-lg shadow-md mb-6">
        <h2 className="text-xl font-semibold mb-4">Tambah Data</h2>

        <form className="space-y-4">
          {/* Nama */}
          <div>
            <label className="block text-cyan-100 mb-1">Nama</label>
            <input
              type="text"
              placeholder="Masukkan nama"
              className="w-full text-cyan-100 border border-cyan-100 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-400"
              value={inNama}
              onChange={(ev) => setInNama(ev.target.value)}
            />
          </div>

          {/* Jabatan */}
          <div>
            <label className="block text-cyan-100 mb-1">Jabatan</label>
            <input
              type="text"
              placeholder="Masukkan jabatan"
              className="w-full text-cyan-100 border border-cyan-100 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-400"
              value={inJab}
              onChange={(ev) => setInJab(ev.target.value)}
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              className="bg-cyan-500 text-white px-4 py-2 rounded-md hover:bg-cyan-600"
              onClick={saveTbh}
            >
              Simpan
            </button>

            <button
              type="button"
              className="bg-gray-300 text-cyan-700 px-4 py-2 rounded-md hover:bg-gray-400"
            >
              Batal
            </button>
          </div>
        </form>
      </div>

      {/* TABEL */}
      <div className="flex gap-2 mb-4">
        <table className="min-w-full border border-cyan-950 bg-cyan-800 rounded-lg overflow-hidden shadow-md">
          <thead className="bg-cyan-950">
            <tr>
              <th className="border border-cyan-800 text-cyan-100 px-4 py-2 text-left">No</th>
              <th className="border border-cyan-800 text-cyan-100 px-4 py-2 text-left">Nama</th>
              <th className="border border-cyan-800 text-cyan-100 px-4 py-2 text-left">Jabatan</th>
              <th className="border border-cyan-800 text-cyan-100 px-4 py-2 text-left">Aksi</th>
            </tr>
          </thead>

          <tbody>
            {karyawans.map((karyawan, index) => (
              <tr key={karyawan.id} className="hover:bg-cyan-700">
                <td className="border border-cyan-700 text-cyan-200 px-4 py-2">{index + 1}</td>
                <td className="border border-cyan-700 text-cyan-200 px-4 py-2">{karyawan.nama}</td>
                <td className="border border-cyan-700 text-cyan-200 px-4 py-2">{karyawan.jabatan}</td>
                <td className="border border-cyan-700 text-cyan-200 px-4 py-2">
                  <button
                    className="text-yellow-600 hover:underline mr-2"
                    onClick={() => {openModal(karyawan)}}
                  >
                    Edit
                  </button>
                  <button 
                    className="text-red-600 hover:underline"
                    onClick={() => {
                      if (!confirm("Yakin hapus?")) return;
                      delKaryawan(karyawan.id)
                    }}
                  >
                    Hapus
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL EDIT */}
      {isOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 backdrop-blur-sm flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-96">
            <h2 className="text-2xl mb-4">Edit Karyawan</h2>
            <p className="mb-4">Edit data karyawan di sini.</p>

            {/* Form untuk Edit */}
            <div className="space-y-4">
              <label className="block text-gray-700 mb-1">Nama</label>
              <input
                type="text"
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                placeholder="Nama"
                value={inNama}
                onChange={(ev) => setInNama(ev.target.value)}
              />
              <label className="block text-gray-700 mb-1">Jabatan</label>
              <input
                type="text"
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                placeholder="Jabatan"
                value={inJab}
                onChange={(ev) => setInJab(ev.target.value)}
              />
            </div>

            {/* Tombol */}
            <div className="flex justify-end gap-4 pt-4">
              <button
                onClick={closeModal}
                className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
              >
                Close
              </button>
              <button
                onClick={saveEdit}
                className="px-4 py-2 bg-cyan-500 text-white rounded-md hover:bg-cyan-600"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default Karyawan;
