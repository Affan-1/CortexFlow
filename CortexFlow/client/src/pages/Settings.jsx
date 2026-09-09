import React, { useEffect, useRef, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  User,
  Building2,
  Bell,
  KeyRound,
  CreditCard,
  Copy,
  RefreshCw,
  AlertTriangle,
  Check,
  Upload,
  Loader2,
} from "lucide-react";

import api from "../services/api";
import { useAuthStore } from "../store/authStore";

const tabs = [
  { id: "profile", label: "Profile", icon: User },
  { id: "workspace", label: "Workspace", icon: Building2 },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "api", label: "API Keys", icon: KeyRound },
  { id: "billing", label: "Billing", icon: CreditCard },
];

const Toggle = ({ checked, onChange }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    onClick={onChange}
    className={`relative h-5 w-9 shrink-0 rounded-full transition ${
      checked ? "bg-[#168FFF]" : "bg-white/[0.08]"
    }`}
  >
    <span
      className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
        checked ? "translate-x-[18px]" : "translate-x-0.5"
      }`}
    />
  </button>
);

const FieldLabel = ({ children }) => (
  <label className="mb-2 block text-[9px] font-medium uppercase tracking-[0.14em] text-zinc-600">
    {children}
  </label>
);

const TextInput = ({ className = "", ...props }) => (
  <input
    {...props}
    className={`w-full rounded-lg border border-white/[0.08] bg-[#0A0D12] px-3.5 py-2.5 text-[11px] text-zinc-200 placeholder:text-zinc-700 transition focus:border-[#168FFF]/50 focus:outline-none ${className}`}
  />
);

const Card = ({ title, description, children }) => (
  <div className="rounded-xl border border-white/[0.07] bg-[#080A0E] p-6">
    <div className="mb-6">
      <h3 className="text-[13px] font-medium text-zinc-100">{title}</h3>

      <p className="mt-1.5 text-[10px] leading-5 text-zinc-600">
        {description}
      </p>
    </div>

    {children}
  </div>
);

const getInitials = (name = "") => {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .map((word) => word[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return initials || "CF";
};

const Settings = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const user = useAuthStore((state) => state.user);
  const updateUser = useAuthStore((state) => state.updateUser);
  const logout = useAuthStore((state) => state.logout);

  const [activeTab, setActiveTab] = useState(
    searchParams.get("tab") || "profile"
  );

  const [profile, setProfile] = useState({
    name: "",
    email: "",
    avatar: null,
  });

  const [workspace, setWorkspace] = useState({
    workspaceName: "",
    workspaceUrl: "",
    timezone: "(UTC+05:00) Karachi",
  });

  const [apiKey, setApiKey] = useState("");

  const [notifications, setNotifications] = useState({
    email: true,
    failures: true,
    weekly: false,
  });

  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");

  const fileRef = useRef(null);

  useEffect(() => {
    const tab = searchParams.get("tab");

    if (tab && tabs.some((item) => item.id === tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  useEffect(() => {
    const loadSettings = async () => {
      setLoading(true);

      try {
        const { data } = await api.get("/auth/me");

        const currentUser = data.user;

        updateUser(currentUser);

        setProfile({
          name: currentUser.name || "",
          email: currentUser.email || "",
          avatar: currentUser.avatar || null,
        });

        setWorkspace({
          workspaceName: currentUser.workspaceName || "My Workspace",
          workspaceUrl: currentUser.workspaceUrl || "",
          timezone:
            currentUser.timezone || "(UTC+05:00) Karachi",
        });

        /*
         * /auth/me returns the API key because the backend controller
         * explicitly includes it for the authenticated user.
         */
        setApiKey(currentUser.apiKey || "");
      } catch (error) {
        showMessage(
          error.response?.data?.message ||
            "Unable to load your settings.",
          "error"
        );
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [updateUser]);

  const showMessage = (text, type = "info") => {
    setMessage(text);
    setMessageType(type);
  };

  const changeTab = (id) => {
    setActiveTab(id);
    setSearchParams({ tab: id });
    setMessage("");
  };

  const saveProfile = async () => {
    if (!profile.name.trim()) {
      showMessage("Please enter your name.", "error");
      return;
    }

    if (!profile.email.trim()) {
      showMessage("Please enter your email.", "error");
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const { data } = await api.put("/auth/profile", {
        name: profile.name.trim(),
        email: profile.email.trim(),
        avatar: profile.avatar,
      });

      updateUser(data.user);

      setProfile({
        name: data.user.name || "",
        email: data.user.email || "",
        avatar: data.user.avatar || null,
      });

      showMessage("Profile changes saved.", "success");
    } catch (error) {
      showMessage(
        error.response?.data?.message ||
          "Failed to save profile.",
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  const saveWorkspace = async () => {
    if (!workspace.workspaceName.trim()) {
      showMessage("Please enter a workspace name.", "error");
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const { data } = await api.put("/auth/workspace", {
        workspaceName: workspace.workspaceName.trim(),
        workspaceUrl: workspace.workspaceUrl.trim(),
        timezone: workspace.timezone,
      });

      updateUser(data.user);

      setWorkspace({
        workspaceName: data.user.workspaceName || "",
        workspaceUrl: data.user.workspaceUrl || "",
        timezone:
          data.user.timezone || "(UTC+05:00) Karachi",
      });

      showMessage("Workspace changes saved.", "success");
    } catch (error) {
      showMessage(
        error.response?.data?.message ||
          "Failed to save workspace.",
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  const handlePhoto = (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showMessage("Please choose an image file.", "error");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      showMessage(
        "Profile photo must be smaller than 2MB.",
        "error"
      );
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      setProfile((previous) => ({
        ...previous,
        avatar: reader.result,
      }));

      showMessage(
        "Photo selected. Click Save changes to apply it.",
        "info"
      );
    };

    reader.onerror = () => {
      showMessage(
        "Unable to read the selected image.",
        "error"
      );
    };

    reader.readAsDataURL(file);
  };

  const regenerate = async () => {
    const confirmed = window.confirm(
      "Regenerate your API key? The previous key will stop working."
    );

    if (!confirmed) return;

    setSaving(true);
    setMessage("");

    try {
      const { data } = await api.post(
        "/auth/api-key/regenerate"
      );

      setApiKey(data.apiKey);

      updateUser({
        ...user,
        apiKey: data.apiKey,
      });

      showMessage("API key regenerated successfully.", "success");
    } catch (error) {
      showMessage(
        error.response?.data?.message ||
          "Failed to regenerate API key.",
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  const deleteWorkspace = async () => {
    const confirmed = window.confirm(
      "Delete this workspace and all workflows, integrations, and execution history? This cannot be undone."
    );

    if (!confirmed) return;

    setSaving(true);
    setMessage("");

    try {
      await api.delete("/auth/workspace");

      logout();

      navigate("/login", {
        replace: true,
      });
    } catch (error) {
      showMessage(
        error.response?.data?.message ||
          "Failed to delete workspace.",
        "error"
      );

      setSaving(false);
    }
  };

  const handleCopyKey = async () => {
    if (!apiKey) {
      showMessage("API key is not available yet.", "error");
      return;
    }

    try {
      await navigator.clipboard.writeText(apiKey);

      setCopied(true);
      showMessage("API key copied to clipboard.", "success");

      window.setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch {
      showMessage(
        "Could not copy the API key.",
        "error"
      );
    }
  };

  const toggleNotification = (key) => {
    setNotifications((previous) => ({
      ...previous,
      [key]: !previous[key],
    }));
  };

  const messageClasses =
    messageType === "error"
      ? "border-red-500/20 bg-red-500/[0.06] text-red-300"
      : messageType === "success"
      ? "border-emerald-500/20 bg-emerald-500/[0.06] text-emerald-300"
      : "border-[#168FFF]/20 bg-[#168FFF]/[0.06] text-zinc-300";

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-76px)] items-center justify-center bg-[#030303]">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-zinc-600">
          <Loader2
            size={14}
            className="animate-spin text-[#168FFF]"
          />
          Loading settings
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-[calc(100vh-76px)] overflow-hidden bg-[#030303]">
      <div className="pointer-events-none absolute left-1/2 top-0 h-[300px] w-[600px] -translate-x-1/2 rounded-full bg-[#168FFF]/[0.035] blur-[120px]" />

      <div className="relative mx-auto w-full max-w-[1600px] px-5 py-7 sm:px-7 lg:px-8 lg:py-9">
        {/* HEADER */}
        <section className="mb-8">
          <div className="mb-3 flex items-center gap-2">
            <span className="h-px w-5 bg-[#168FFF]" />

            <span className="text-[9px] font-medium uppercase tracking-[0.25em] text-[#168FFF]">
              Preferences
            </span>
          </div>

          <h2 className="text-2xl font-medium text-white sm:text-3xl">
            Settings
          </h2>

          <p className="mt-2 max-w-xl text-xs leading-6 text-zinc-600">
            Manage your profile, workspace, notifications,
            API access, and CortexFlow preferences.
          </p>
        </section>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[220px_1fr]">
          {/* TABS */}
          <nav className="flex gap-1.5 overflow-x-auto lg:flex-col lg:overflow-visible">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => changeTab(tab.id)}
                  className={`flex shrink-0 items-center gap-2.5 rounded-lg px-3.5 py-2.5 text-left text-[11px] font-medium transition ${
                    isActive
                      ? "border border-white/[0.08] bg-white/[0.05] text-white"
                      : "border border-transparent text-zinc-500 hover:bg-white/[0.03] hover:text-zinc-200"
                  }`}
                >
                  <Icon
                    size={14}
                    className={
                      isActive
                        ? "text-[#168FFF]"
                        : "text-zinc-600"
                    }
                  />

                  {tab.label}
                </button>
              );
            })}
          </nav>

          {/* CONTENT */}
          <div className="min-w-0 space-y-4">
            {message && (
              <div
                className={`rounded-lg border px-4 py-3 text-[10px] ${messageClasses}`}
              >
                {message}
              </div>
            )}

            {/* PROFILE */}
            {activeTab === "profile" && (
              <Card
                title="Profile"
                description="Update your personal information."
              >
                <div className="mb-6 flex items-center gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#168FFF]/25 bg-[#168FFF]/10">
                    {profile.avatar ? (
                      <img
                        src={profile.avatar}
                        alt="Profile"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-[15px] font-semibold text-[#168FFF]">
                        {getInitials(profile.name)}
                      </span>
                    )}
                  </div>

                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePhoto}
                    className="hidden"
                  />

                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="flex items-center gap-2 rounded-lg border border-white/[0.08] px-3.5 py-2 text-[10px] font-medium text-zinc-400 transition hover:border-white/[0.13] hover:text-zinc-200"
                  >
                    <Upload size={12} />
                    Change photo
                  </button>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <FieldLabel>Full name</FieldLabel>

                    <TextInput
                      value={profile.name}
                      onChange={(event) =>
                        setProfile((previous) => ({
                          ...previous,
                          name: event.target.value,
                        }))
                      }
                      placeholder="Your name"
                    />
                  </div>

                  <div>
                    <FieldLabel>Email</FieldLabel>

                    <TextInput
                      value={profile.email}
                      onChange={(event) =>
                        setProfile((previous) => ({
                          ...previous,
                          email: event.target.value,
                        }))
                      }
                      type="email"
                      placeholder="you@example.com"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  disabled={saving}
                  onClick={saveProfile}
                  className="mt-6 flex items-center gap-2 rounded-lg bg-[#168FFF] px-4 py-2.5 text-[10px] font-semibold text-black transition hover:bg-[#38A8FF] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving && (
                    <Loader2
                      size={12}
                      className="animate-spin"
                    />
                  )}

                  Save changes
                </button>
              </Card>
            )}

            {/* WORKSPACE */}
            {activeTab === "workspace" && (
              <>
                <Card
                  title="Workspace"
                  description="General information about your workspace."
                >
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                      <FieldLabel>Workspace name</FieldLabel>

                      <TextInput
                        value={workspace.workspaceName}
                        onChange={(event) =>
                          setWorkspace((previous) => ({
                            ...previous,
                            workspaceName: event.target.value,
                          }))
                        }
                        placeholder="My Workspace"
                      />
                    </div>

                    <div>
                      <FieldLabel>Workspace URL</FieldLabel>

                      <TextInput
                        value={workspace.workspaceUrl}
                        onChange={(event) =>
                          setWorkspace((previous) => ({
                            ...previous,
                            workspaceUrl: event.target.value,
                          }))
                        }
                        placeholder="https://your-workspace.com"
                      />
                    </div>

                    <div>
                      <FieldLabel>Timezone</FieldLabel>

                      <select
                        value={workspace.timezone}
                        onChange={(event) =>
                          setWorkspace((previous) => ({
                            ...previous,
                            timezone: event.target.value,
                          }))
                        }
                        className="w-full rounded-lg border border-white/[0.08] bg-[#0A0D12] px-3.5 py-2.5 text-[11px] text-zinc-200 focus:border-[#168FFF]/50 focus:outline-none"
                      >
                        <option>
                          (UTC+05:00) Karachi
                        </option>

                        <option>
                          (UTC+00:00) London
                        </option>

                        <option>
                          (UTC-05:00) New York
                        </option>

                        <option>
                          (UTC-08:00) Los Angeles
                        </option>

                        <option>
                          (UTC+01:00) Berlin
                        </option>

                        <option>
                          (UTC+05:30) Mumbai
                        </option>

                        <option>
                          (UTC+08:00) Singapore
                        </option>

                        <option>
                          (UTC+09:00) Tokyo
                        </option>
                      </select>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={saving}
                    onClick={saveWorkspace}
                    className="mt-6 flex items-center gap-2 rounded-lg bg-[#168FFF] px-4 py-2.5 text-[10px] font-semibold text-black transition hover:bg-[#38A8FF] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {saving && (
                      <Loader2
                        size={12}
                        className="animate-spin"
                      />
                    )}

                    Save changes
                  </button>
                </Card>

                {/* DELETE WORKSPACE */}
                <div className="rounded-xl border border-red-500/15 bg-red-500/[0.03] p-6">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-red-500/20 bg-red-500/10">
                      <AlertTriangle
                        size={16}
                        className="text-red-400"
                      />
                    </div>

                    <div className="flex-1">
                      <h3 className="text-[13px] font-medium text-zinc-100">
                        Delete workspace
                      </h3>

                      <p className="mt-1.5 text-[10px] leading-5 text-zinc-600">
                        Permanently delete this workspace,
                        all workflows, integrations, and
                        execution history. This action cannot
                        be undone.
                      </p>

                      <button
                        type="button"
                        disabled={saving}
                        onClick={deleteWorkspace}
                        className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3.5 py-2 text-[10px] font-medium text-red-400 transition hover:bg-red-500/15 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Delete workspace
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* NOTIFICATIONS */}
            {activeTab === "notifications" && (
              <Card
                title="Notifications"
                description="Choose what you want to be notified about."
              >
                <div className="divide-y divide-white/[0.06]">
                  {[
                    [
                      "email",
                      "Email notifications",
                      "Receive important updates via email.",
                    ],
                    [
                      "failures",
                      "Execution failure alerts",
                      "Get notified immediately when a workflow fails.",
                    ],
                    [
                      "weekly",
                      "Weekly summary",
                      "A weekly digest of workflow performance.",
                    ],
                  ].map(([key, title, description]) => (
                    <div
                      key={key}
                      className="flex items-center justify-between gap-5 py-4"
                    >
                      <div>
                        <p className="text-[11px] font-medium text-zinc-200">
                          {title}
                        </p>

                        <p className="mt-1 text-[10px] text-zinc-600">
                          {description}
                        </p>
                      </div>

                      <Toggle
                        checked={notifications[key]}
                        onChange={() =>
                          toggleNotification(key)
                        }
                      />
                    </div>
                  ))}
                </div>

                <p className="mt-5 text-[9px] leading-5 text-zinc-700">
                  Notification preferences are currently
                  stored for this session. Persistent
                  notification preferences can be connected to
                  the user model later.
                </p>
              </Card>
            )}

            {/* API KEYS */}
            {activeTab === "api" && (
              <Card
                title="API Keys"
                description="Use this key to trigger workflows from external services."
              >
                <div className="flex flex-col gap-3 rounded-lg border border-white/[0.08] bg-[#0A0D12] p-4 sm:flex-row sm:items-center sm:justify-between">
                  <code className="truncate text-[11px] text-zinc-400">
                    {apiKey || "Loading..."}
                  </code>

                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCopyKey}
                      disabled={!apiKey}
                      className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] px-3 py-2 text-[9px] text-zinc-400 transition hover:border-white/[0.14] hover:text-zinc-200 disabled:opacity-40"
                    >
                      {copied ? (
                        <>
                          <Check size={12} />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy size={12} />
                          Copy
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      disabled={saving}
                      onClick={regenerate}
                      className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] px-3 py-2 text-[9px] text-zinc-400 transition hover:border-white/[0.14] hover:text-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <RefreshCw
                        size={12}
                        className={
                          saving ? "animate-spin" : ""
                        }
                      />

                      Regenerate
                    </button>
                  </div>
                </div>

                <p className="mt-4 text-[10px] leading-5 text-zinc-700">
                  Keep this key secret. Anyone with this key
                  can trigger workflows in your workspace.
                </p>
              </Card>
            )}

            {/* BILLING */}
            {activeTab === "billing" && (
              <Card
                title="Billing"
                description="Manage your subscription and payment details."
              >
                <div className="flex flex-col justify-between gap-4 rounded-lg border border-white/[0.08] bg-[#0A0D12] p-5 sm:flex-row sm:items-center">
                  <div>
                    <p className="text-[11px] font-medium text-zinc-200">
                      Free plan
                    </p>

                    <p className="mt-1.5 text-[10px] text-zinc-600">
                      Up to 500 executions per month.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => navigate("/upgrade")}
                    className="rounded-lg bg-[#168FFF] px-4 py-2.5 text-[10px] font-semibold text-black transition hover:bg-[#38A8FF]"
                  >
                    Upgrade plan
                  </button>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;