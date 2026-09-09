import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Bell,
  Command,
  ChevronDown,
  User,
  LogOut,
  Settings,
  X,
  CheckCheck,
  Workflow,
  CircleCheck,
  Plug,
} from "lucide-react";
import { useAuthStore } from "../store/authStore";

const initialNotifications = [
  {
    id: 1,
    title: "Workflow completed",
    description: "Your latest workflow execution completed successfully.",
    time: "Just now",
    read: false,
    icon: CircleCheck,
  },
  {
    id: 2,
    title: "Automation is active",
    description: "Your scheduled automation is running normally.",
    time: "Recently",
    read: false,
    icon: Workflow,
  },
  {
    id: 3,
    title: "Integration connected",
    description: "A workspace integration is ready to use.",
    time: "Earlier",
    read: true,
    icon: Plug,
  },
];

const Topbar = ({ title = "Dashboard", description }) => {
  const navigate = useNavigate();

  const searchRef = useRef(null);
  const notificationRef = useRef(null);
  const profileRef = useRef(null);

  const [profileOpen, setProfileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);

  const [query, setQuery] = useState("");
  const [notifications, setNotifications] =
    useState(initialNotifications);

  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  const unreadCount = notifications.filter(
    (notification) => !notification.read
  ).length;

  /* -------------------------------------------------------------------------- */
  /* OUTSIDE CLICK                                                              */
  /* -------------------------------------------------------------------------- */

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target)
      ) {
        setSearchOpen(false);
      }

      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target)
      ) {
        setNotificationOpen(false);
      }

      if (
        profileRef.current &&
        !profileRef.current.contains(event.target)
      ) {
        setProfileOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutsideClick
      );
    };
  }, []);

  /* -------------------------------------------------------------------------- */
  /* KEYBOARD                                                                   */
  /* -------------------------------------------------------------------------- */

  useEffect(() => {
    const handleKeyboard = (event) => {
      if (
        (event.ctrlKey || event.metaKey) &&
        event.key.toLowerCase() === "k"
      ) {
        event.preventDefault();

        setProfileOpen(false);
        setNotificationOpen(false);
        setSearchOpen(true);
      }

      if (event.key === "Escape") {
        setSearchOpen(false);
        setProfileOpen(false);
        setNotificationOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyboard);

    return () => {
      document.removeEventListener(
        "keydown",
        handleKeyboard
      );
    };
  }, []);

  /* -------------------------------------------------------------------------- */
  /* ACTIONS                                                                    */
  /* -------------------------------------------------------------------------- */

  const handleLogout = () => {
    setProfileOpen(false);
    setNotificationOpen(false);

    logout();

    navigate("/login", {
      replace: true,
    });
  };

  const handleSearch = (event) => {
    event.preventDefault();

    const value = query.trim();

    if (!value) {
      return;
    }

    setSearchOpen(false);

    navigate(
      `/search?q=${encodeURIComponent(value)}`
    );
  };

  const openSettings = (tab) => {
    setProfileOpen(false);

    navigate(`/settings?tab=${tab}`);
  };

  const toggleNotifications = () => {
    setSearchOpen(false);
    setProfileOpen(false);

    setNotificationOpen(
      (currentValue) => !currentValue
    );
  };

  const markAllAsRead = () => {
    setNotifications((currentNotifications) =>
      currentNotifications.map((notification) => ({
        ...notification,
        read: true,
      }))
    );
  };

  const handleNotificationClick = (id) => {
    setNotifications((currentNotifications) =>
      currentNotifications.map((notification) =>
        notification.id === id
          ? {
              ...notification,
              read: true,
            }
          : notification
      )
    );
  };

  /* -------------------------------------------------------------------------- */
  /* USER                                                                       */
  /* -------------------------------------------------------------------------- */

  const initials = user?.name
    ? user.name
        .split(" ")
        .filter(Boolean)
        .map((part) => part[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "CN";

  return (
    <header className="sticky top-0 z-30 flex h-[76px] items-center justify-between border-b border-white/[0.07] bg-[#050609]/90 px-5 backdrop-blur-xl sm:px-7 lg:px-8">
      {/* PAGE TITLE */}

      <div className="min-w-0">
        <h1 className="truncate text-[17px] font-medium tracking-[-0.02em] text-white">
          {title}
        </h1>

        {description && (
          <p className="mt-0.5 hidden truncate text-[10px] text-zinc-600 sm:block">
            {description}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        {/* SEARCH */}

        <div className="relative" ref={searchRef}>
          {searchOpen && (
            <div className="absolute right-0 top-[48px] w-[min(380px,calc(100vw-40px))]">
              <form
                onSubmit={handleSearch}
                className="flex items-center gap-2 rounded-xl border border-white/[0.09] bg-[#0a0c10] p-2 shadow-2xl shadow-black/50"
              >
                <Search
                  size={14}
                  className="ml-2 shrink-0 text-zinc-600"
                />

                <input
                  autoFocus
                  type="search"
                  value={query}
                  onChange={(event) =>
                    setQuery(event.target.value)
                  }
                  placeholder="Search workflows..."
                  className="min-w-0 flex-1 bg-transparent px-2 py-2 text-[11px] text-zinc-200 outline-none placeholder:text-zinc-700"
                />

                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    className="rounded-md p-1.5 text-zinc-700 transition hover:text-zinc-300"
                  >
                    <X size={13} />
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setSearchOpen(false);
                    setQuery("");
                  }}
                  className="rounded-md p-1.5 text-zinc-600 transition hover:text-zinc-200"
                >
                  <X size={14} />
                </button>
              </form>

              <div className="mt-2 rounded-xl border border-white/[0.06] bg-[#0a0c10] px-4 py-3 shadow-xl shadow-black/30">
                <p className="text-[9px] text-zinc-700">
                  Search workflows, executions, and
                  workspace data.
                </p>
              </div>
            </div>
          )}

          {/* DESKTOP SEARCH */}

          <button
            type="button"
            onClick={() => {
              setProfileOpen(false);
              setNotificationOpen(false);
              setSearchOpen(true);
            }}
            className="group hidden h-9 items-center gap-3 rounded-lg border border-white/[0.07] bg-white/[0.025] px-3.5 transition-all duration-300 hover:border-white/[0.13] hover:bg-white/[0.045] md:flex"
          >
            <Search
              size={14}
              strokeWidth={1.7}
              className="text-zinc-600 group-hover:text-zinc-400"
            />

            <span className="text-[10px] text-zinc-600 group-hover:text-zinc-400">
              Search anything...
            </span>

            <span className="ml-4 flex items-center gap-1 rounded border border-white/[0.08] px-1.5 py-0.5">
              <Command
                size={9}
                className="text-zinc-700"
              />

              <span className="text-[8px] text-zinc-700">
                K
              </span>
            </span>
          </button>

          {/* MOBILE SEARCH */}

          <button
            type="button"
            aria-label="Search"
            onClick={() => {
              setProfileOpen(false);
              setNotificationOpen(false);
              setSearchOpen(true);
            }}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.07] bg-white/[0.025] text-zinc-500 transition hover:border-white/[0.13] hover:text-zinc-200 md:hidden"
          >
            <Search
              size={15}
              strokeWidth={1.7}
            />
          </button>
        </div>

        {/* NOTIFICATIONS */}

        <div
          ref={notificationRef}
          className="relative"
        >
          <button
            type="button"
            aria-label="Notifications"
            onClick={toggleNotifications}
            className={`group relative flex h-9 w-9 items-center justify-center rounded-lg border bg-white/[0.025] transition ${
              notificationOpen
                ? "border-[#168FFF]/35 text-[#168FFF]"
                : "border-white/[0.07] text-zinc-500 hover:border-white/[0.13] hover:bg-white/[0.045] hover:text-zinc-200"
            }`}
          >
            <Bell
              size={15}
              strokeWidth={1.7}
            />

            {unreadCount > 0 && (
              <span className="absolute right-[7px] top-[6px] h-1.5 w-1.5 rounded-full bg-[#168FFF] shadow-[0_0_7px_rgba(22,143,255,0.9)]" />
            )}
          </button>

          {/* NOTIFICATION DROPDOWN */}

          {notificationOpen && (
            <div className="absolute right-0 top-[calc(100%+10px)] w-[min(360px,calc(100vw-30px))] overflow-hidden rounded-xl border border-white/[0.09] bg-[#0a0c10] shadow-2xl shadow-black/60">
              {/* HEADER */}

              <div className="flex items-center justify-between border-b border-white/[0.07] px-4 py-3.5">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-[11px] font-medium text-white">
                      Notifications
                    </p>

                    {unreadCount > 0 && (
                      <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-[#168FFF]/15 px-1 text-[8px] font-medium text-[#168FFF]">
                        {unreadCount}
                      </span>
                    )}
                  </div>

                  <p className="mt-1 text-[8px] text-zinc-700">
                    Recent CortexFlow activity
                  </p>
                </div>

                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={markAllAsRead}
                    className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[8px] text-zinc-600 transition hover:bg-white/[0.04] hover:text-[#168FFF]"
                  >
                    <CheckCheck size={12} />
                    Mark all read
                  </button>
                )}
              </div>

              {/* NOTIFICATIONS LIST */}

              <div className="max-h-[340px] overflow-y-auto">
                {notifications.length > 0 ? (
                  notifications.map(
                    (notification) => {
                      const Icon =
                        notification.icon;

                      return (
                        <button
                          key={notification.id}
                          type="button"
                          onClick={() =>
                            handleNotificationClick(
                              notification.id
                            )
                          }
                          className="relative flex w-full gap-3 border-b border-white/[0.045] px-4 py-3.5 text-left transition last:border-b-0 hover:bg-white/[0.025]"
                        >
                          {!notification.read && (
                            <span className="absolute right-4 top-4 h-1.5 w-1.5 rounded-full bg-[#168FFF]" />
                          )}

                          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#168FFF]/15 bg-[#168FFF]/[0.07] text-[#168FFF]">
                            <Icon
                              size={14}
                              strokeWidth={1.7}
                            />
                          </div>

                          <div className="min-w-0 flex-1 pr-3">
                            <p
                              className={`text-[10px] ${
                                notification.read
                                  ? "font-normal text-zinc-400"
                                  : "font-medium text-zinc-200"
                              }`}
                            >
                              {notification.title}
                            </p>

                            <p className="mt-1 leading-relaxed text-[9px] text-zinc-600">
                              {
                                notification.description
                              }
                            </p>

                            <p className="mt-1.5 text-[8px] text-zinc-700">
                              {notification.time}
                            </p>
                          </div>
                        </button>
                      );
                    }
                  )
                ) : (
                  <div className="px-5 py-10 text-center">
                    <Bell
                      size={20}
                      className="mx-auto text-zinc-800"
                    />

                    <p className="mt-3 text-[10px] text-zinc-600">
                      No notifications
                    </p>
                  </div>
                )}
              </div>

              {/* FOOTER */}

              <div className="border-t border-white/[0.07] bg-white/[0.012] px-4 py-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setNotificationOpen(false);
                    navigate("/executions");
                  }}
                  className="w-full rounded-lg py-2 text-center text-[9px] text-zinc-600 transition hover:bg-white/[0.035] hover:text-[#168FFF]"
                >
                  View execution activity
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="mx-1 hidden h-7 w-px bg-white/[0.08] sm:block" />

        {/* PROFILE */}

        <div
          ref={profileRef}
          className="relative"
        >
          <button
            type="button"
            onClick={() => {
              setSearchOpen(false);
              setNotificationOpen(false);

              setProfileOpen(
                (value) => !value
              );
            }}
            className="group flex items-center gap-2.5 rounded-lg px-1.5 py-1 transition hover:bg-white/[0.04]"
          >
            <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-[#168FFF]/25 bg-[#168FFF]/10">
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt="Profile"
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-[10px] font-semibold text-[#168FFF]">
                  {initials}
                </span>
              )}
            </div>

            <div className="hidden text-left sm:block">
              <p className="max-w-[130px] truncate text-[10px] font-medium text-zinc-300">
                {user?.name || "CortexNova"}
              </p>

              <p className="mt-0.5 max-w-[130px] truncate text-[8px] text-zinc-700">
                {user?.workspaceName ||
                  "Workspace"}
              </p>
            </div>

            <ChevronDown
              size={13}
              className={`hidden text-zinc-600 transition-transform sm:block ${
                profileOpen
                  ? "rotate-180"
                  : ""
              }`}
            />
          </button>

          {/* PROFILE MENU */}

          {profileOpen && (
            <div className="absolute right-0 top-[calc(100%+10px)] w-56 overflow-hidden rounded-xl border border-white/[0.09] bg-[#0a0c10] p-1.5 shadow-2xl shadow-black/50">
              <div className="border-b border-white/[0.07] px-3 py-3">
                <p className="text-[11px] font-medium text-white">
                  {user?.name || "CortexNova"}
                </p>

                <p className="mt-1 truncate text-[9px] text-zinc-600">
                  {user?.email ||
                    "workspace@cortexnova.com"}
                </p>
              </div>

              <div className="mt-1 space-y-0.5">
                <button
                  type="button"
                  onClick={() =>
                    openSettings("profile")
                  }
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[10px] text-zinc-500 transition hover:bg-white/[0.05] hover:text-zinc-200"
                >
                  <User
                    size={14}
                    strokeWidth={1.7}
                  />

                  Profile
                </button>

                <button
                  type="button"
                  onClick={() =>
                    openSettings("workspace")
                  }
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[10px] text-zinc-500 transition hover:bg-white/[0.05] hover:text-zinc-200"
                >
                  <Settings
                    size={14}
                    strokeWidth={1.7}
                  />

                  Workspace Settings
                </button>

                <div className="my-1 border-t border-white/[0.06]" />

                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[10px] text-zinc-500 transition hover:bg-red-500/[0.08] hover:text-red-400"
                >
                  <LogOut
                    size={14}
                    strokeWidth={1.7}
                  />

                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Topbar;