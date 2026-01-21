import Navbar from "../components/navbar";

import { Outlet } from "react-router-dom";

export default function GenLayout() {
    return (
        <div className="min-h-screen bg-orange-50">
            <Navbar />
            <Outlet />
        </div>
    );
}