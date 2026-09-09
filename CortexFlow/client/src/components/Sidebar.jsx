import React from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Workflow,
  Library,
  History,
  PlugZap,
  Settings,
  ChevronRight,
  Sparkles,
  Plus,
} from "lucide-react";

const navigation = [
  {
    label: "Dashboard",
    path: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Workflows",
    path: "/workflows",
    icon: Workflow,
  },
  {
    label: "Templates",
    path: "/templates",
    icon: Library,
  },
  {
    label: "Executions",
    path: "/executions",
    icon: History,
  },
  {
    label: "Integrations",
    path: "/integrations",
    icon: PlugZap,
  },
];

const Sidebar = () => {
  return (
    <aside className="fixed left-0 top-0 z-40 hidden h-screen w-[250px] flex-col border-r border-white/[0.07] bg-[#050609] lg:flex">
      {/* Logo */}
      <div className="flex h-[76px] items-center border-b border-white/[0.07] px-6">
        <div className="flex items-center gap-3">
          <div className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-[#168FFF]/30 bg-[#168FFF]/10">
            <Sparkles
              size={17}
              strokeWidth={1.7}
              className="text-[#168FFF]"
            />

            <span className="absolute inset-0 rounded-xl bg-[#168FFF]/10 blur-md" />
          </div>

          <div>
            <h1 className="text-[15px] font-semibold tracking-[0.08em] text-white">
              CORTEX<span className="text-[#168FFF]">FLOW</span>
            </h1>

            <p className="mt-0.5 text-[8px] uppercase tracking-[0.22em] text-zinc-600">
              AI Automation
            </p>
          </div>
        </div>
      </div>

      {/* Create workflow */}
      <div className="px-4 pt-6">
        <NavLink
          to="/workflows/new"
          className="group flex w-full items-center justify-between rounded-xl border border-[#168FFF]/30 bg-[#168FFF]/10 px-4 py-3 transition-all duration-300 hover:border-[#168FFF]/60 hover:bg-[#168FFF]/15"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#168FFF] text-black">
              <Plus size={15} strokeWidth={2.5} />
            </div>

            <span className="text-[11px] font-medium text-white">
              New Workflow
            </span>
          </div>

          <ChevronRight
            size={14}
            className="text-zinc-600 transition-transform duration-300 group-hover:translate-x-1 group-hover:text-[#168FFF]"
          />
        </NavLink>
      </div>

      {/* Navigation */}
      <div className="mt-8 flex-1 px-4">
        <p className="mb-3 px-3 text-[9px] font-medium uppercase tracking-[0.22em] text-zinc-700">
          Workspace
        </p>

        <nav className="space-y-1">
          {navigation.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all duration-300 ${isActive
                    ? "border border-white/[0.06] bg-white/[0.06] text-white"
                    : "text-zinc-500 hover:bg-white/[0.035] hover:text-zinc-200"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      size={16}
                      strokeWidth={1.7}
                      className={`transition-colors duration-300 ${isActive
                          ? "text-[#168FFF]"
                          : "text-zinc-600 group-hover:text-zinc-300"
                        }`}
                    />

                    <span className="text-[11px] font-medium">
                      {item.label}
                    </span>

                    {isActive && (
                      <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#168FFF] shadow-[0_0_8px_rgba(22,143,255,0.8)]" />
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* System section */}
        <div className="mt-9">
          <p className="mb-3 px-3 text-[9px] font-medium uppercase tracking-[0.22em] text-zinc-700">
            System
          </p>

          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all duration-300 ${isActive
                ? "border border-white/[0.06] bg-white/[0.06] text-white"
                : "text-zinc-500 hover:bg-white/[0.035] hover:text-zinc-200"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Settings
                  size={16}
                  strokeWidth={1.7}
                  className={
                    isActive
                      ? "text-[#168FFF]"
                      : "text-zinc-600 group-hover:text-zinc-300"
                  }
                />

                <span className="text-[11px] font-medium">Settings</span>

                {isActive && (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#168FFF] shadow-[0_0_8px_rgba(22,143,255,0.8)]" />
                )}
              </>
            )}
          </NavLink>
        </div>
      </div>

      {/* Bottom status */}
      <div className="border-t border-white/[0.07] p-4">
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-3">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#168FFF] opacity-40" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#168FFF]" />
            </span>

            <span className="text-[10px] font-medium text-zinc-300">
              All systems operational
            </span>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <span className="text-[8px] uppercase tracking-[0.15em] text-zinc-700">
              CortexFlow
            </span>

            <span className="text-[8px] text-zinc-700">
              v1.0.0
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;