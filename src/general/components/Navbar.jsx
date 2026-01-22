import { Link } from "react-router-dom";

export default function Navbar() {
    return(
        <nav className="bg-orange-950 p-4 w-full sticky top-0 z-50">
          <div className="text-orange-100 flex justify-between items-center">
            <Link to="/" className="text-orange-100 text-xl font-semibold">
              Lisence & Permit Expatriate
            </Link>

            <div className="space-x-6 hidden md:flex">
              <Link to="/" className="hover:text-orange-100">Home</Link>
              {/* <Link to="/notes" className="hover:text-orange-100">Activity Notes</Link> */}
              <Link to="/newNotes" className="hover:text-orange-100">Activity Notes</Link>
              <Link to="/todolist" className="hover:text-orange-100">Simple to Do List</Link>
              {/* <Link to="/karyawan" className="hover:text-orange-100">Karyawan</Link> */}
            </div>
          </div>
        </nav>
    );
}