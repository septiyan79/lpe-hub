import { Link } from "react-router-dom";

export default function Navbar() {
    return(
        <nav className="bg-orange-950 p-4 w-full">
          <div className="text-cyan-100 flex justify-between items-center">
            <Link to="/" className="text-cyan-100 text-xl font-semibold">
              Lisence & Permit Expatriate
            </Link>

            <div className="space-x-6 hidden md:flex">
              <Link to="/" className="hover:text-orange-100">Home</Link>
              <Link to="/notes" className="hover:text-orange-100">Activity Notes</Link>
              <Link to="/newNotes" className="hover:text-orange-100">NEW! Activity Notes</Link>
              <Link to="/todolist" className="hover:text-orange-100">To Do List</Link>
              <Link to="/karyawan" className="hover:text-orange-100">Karyawan</Link>
            </div>
          </div>
        </nav>
    );
}