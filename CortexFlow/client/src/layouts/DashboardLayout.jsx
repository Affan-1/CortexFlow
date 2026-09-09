import React from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";

const DashboardLayout = () => {
    return (
        <div className="min-h-screen bg-[#030303] text-white">
            {/* Desktop Sidebar */}
            <Sidebar />

            {/* Main Application Area */}
            <div className="min-h-screen lg:pl-[250px]">
                {/* Top Navigation */}
                <Topbar />

                {/* Page Content */}
                <main className="min-h-[calc(100vh-76px)]">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default DashboardLayout;