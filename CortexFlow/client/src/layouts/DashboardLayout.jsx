import React, { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Menu } from "lucide-react";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";

const DashboardLayout = () => {
  // Controls the slide-in menu on phones and tablets
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  // Close the menu whenever the page changes
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // While the menu is open: Esc closes it, page behind does not scroll,
  // and it closes by itself if the screen is resized to desktop width
  useEffect(() => {
    if (!sidebarOpen) return;

    const onKey = (e) => {
      if (e.key === "Escape") setSidebarOpen(false);
    };
    const onResize = () => {
      if (window.innerWidth >= 1024) setSidebarOpen(false);
    };
    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
    };
  }, [sidebarOpen]);

  return (
    <div className="min-h-screen bg-[#030303] text-white">
      {/* Sidebar: fixed on desktop, slide-in menu on mobile */}
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Application Area */}
      <div className="min-h-screen lg:pl-[250px]">
        {/* Mobile header with the hamburger button (hidden on desktop) */}
        <div className="sticky top-0 z-[35] flex h-14 items-center gap-3 border-b border-white/[0.07] bg-[#050609]/95 px-4 backdrop-blur lg:hidden">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
            aria-expanded={sidebarOpen}
            aria-controls="app-sidebar"
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/[0.08] text-zinc-300 transition-colors hover:bg-white/[0.05] hover:text-white"
          >
            <Menu size={20} />
          </button>

          <span className="text-[15px] font-semibold tracking-[0.08em] text-white">
            CORTEX<span className="text-[#168FFF]">FLOW</span>
          </span>
        </div>

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
