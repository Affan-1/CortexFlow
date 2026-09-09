import React, { useEffect, useMemo, useState } from "react";
import {
  Search,
  Mail,
  MessageSquare,
  MessageCircle,
  FileSpreadsheet,
  BookOpen,
  Building2,
  Webhook,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Plus,
  Unplug,
  X,
} from "lucide-react";
import api from "../services/api";

const integrationDefinitions = [
  {
    provider: "gmail",
    name: "Gmail",
    description:
      "Send real emails from your workflows using Gmail and a Google App Password.",
    category: "Email",
    icon: Mail,

    fields: [
      {
        key: "user",
        label: "Gmail Address",
        placeholder: "yourname@gmail.com",
        type: "email",
      },
      {
        key: "appPassword",
        label: "Google App Password",
        placeholder: "Enter your 16-character app password",
        type: "password",
      },
    ],
  },
  {
    provider: "slack",
    name: "Slack",
    description:
      "Post messages and notifications directly to Slack channels.",
    category: "Messaging",
    icon: MessageSquare,
    fields: [
      {
        key: "webhookUrl",
        label: "Webhook URL",
        placeholder: "https://hooks.slack.com/...",
        type: "url",
      },
    ],
  },
  {
    provider: "discord",
    name: "Discord",
    description:
      "Send automated messages and alerts to Discord servers.",
    category: "Messaging",
    icon: MessageCircle,
    fields: [
      {
        key: "webhookUrl",
        label: "Webhook URL",
        placeholder: "https://discord.com/api/webhooks/...",
        type: "url",
      },
    ],
  },
  {
    provider: "googleSheets",
    name: "Google Sheets",
    description:
      "Append workflow data to Google Sheets using a secure Google service account.",
    category: "Data",
    icon: FileSpreadsheet,

    fields: [
      {
        key: "serviceAccountEmail",
        label: "Service Account Email",
        placeholder:
          "cortexflow@your-project.iam.gserviceaccount.com",
        type: "email",
      },
      {
        key: "privateKey",
        label: "Service Account Private Key",
        placeholder:
          "-----BEGIN PRIVATE KEY-----",
        type: "password",
      },
    ],
  },
  {
    provider: "notion",
    name: "Notion",
    description:
      "Create and update pages and database records in Notion.",
    category: "Data",
    icon: BookOpen,
    fields: [
      {
        key: "token",
        label: "Integration Token",
        placeholder: "secret_...",
        type: "password",
      },
      {
        key: "databaseId",
        label: "Database ID",
        placeholder: "Enter database ID",
        type: "text",
      },
    ],
  },
  {
    provider: "hubspot",
    name: "HubSpot",
    description:
      "Create and update contacts, deals, and CRM records.",
    category: "CRM",
    icon: Building2,
    fields: [
      {
        key: "accessToken",
        label: "Access Token",
        placeholder: "Enter HubSpot access token",
        type: "password",
      },
    ],
  },
  {
    provider: "webhook",
    name: "Webhooks",
    description:
      "Trigger workflows from any external service via HTTP.",
    category: "Developer",
    icon: Webhook,
    fields: [],
  },
];

const Integrations = () => {
  const [integrations, setIntegrations] = useState([]);
  const [query, setQuery] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState(null);

  const [form, setForm] = useState({});
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadIntegrations = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/integrations");
      setIntegrations(response.data || []);
    } catch (err) {
      console.error("Failed to load integrations:", err);

      setError(
        err.response?.data?.message ||
        "Failed to load integrations."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIntegrations();
  }, []);

  const connectedProviders = useMemo(
    () =>
      new Set(
        integrations
          .filter((integration) => integration.status === "connected")
          .map((integration) => integration.provider)
      ),
    [integrations]
  );

  const filteredIntegrations = integrationDefinitions.filter(
    (integration) =>
      integration.name
        .toLowerCase()
        .includes(query.toLowerCase()) ||
      integration.category
        .toLowerCase()
        .includes(query.toLowerCase())
  );

  const connectedCount = connectedProviders.size;

  const openConnectModal = (definition) => {
    setSelectedIntegration(definition);
    setForm({});
    setError("");
    setSuccess("");
    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;

    setModalOpen(false);
    setSelectedIntegration(null);
    setForm({});
    setError("");
  };

  const handleFieldChange = (key, value) => {
    setForm((previous) => ({
      ...previous,
      [key]: value,
    }));
  };

  const handleConnect = async (event) => {
    event.preventDefault();

    if (!selectedIntegration) return;

    if (selectedIntegration.fields.length > 0) {
      const missingField = selectedIntegration.fields.find(
        (field) => !form[field.key]?.trim()
      );

      if (missingField) {
        setError(`${missingField.label} is required.`);
        return;
      }
    }

    try {
      setSaving(true);
      setError("");

      const response = await api.post("/integrations", {
        provider: selectedIntegration.provider,
        name: selectedIntegration.name,
        credentials: form,
      });

      const createdIntegration = response.data?.integration;

      if (createdIntegration) {
        setIntegrations((previous) => [
          createdIntegration,
          ...previous.filter(
            (item) =>
              item.provider !== createdIntegration.provider
          ),
        ]);
      }

      setSuccess(
        `${selectedIntegration.name} connected successfully.`
      );

      setTimeout(() => {
        setModalOpen(false);
        setSelectedIntegration(null);
        setForm({});
        setSuccess("");
      }, 800);
    } catch (err) {
      console.error("Connect integration error:", err);

      setError(
        err.response?.data?.message ||
        "Failed to connect integration."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDisconnect = async (definition) => {
    const existing = integrations.find(
      (integration) =>
        integration.provider === definition.provider
    );

    if (!existing) return;

    const confirmed = window.confirm(
      `Disconnect ${definition.name}?`
    );

    if (!confirmed) return;

    try {
      setError("");

      await api.delete(`/integrations/${existing.id}`);

      setIntegrations((previous) =>
        previous.filter(
          (integration) => integration.id !== existing.id
        )
      );

      setSuccess(`${definition.name} disconnected.`);

      setTimeout(() => {
        setSuccess("");
      }, 1800);
    } catch (err) {
      console.error("Disconnect integration error:", err);

      setError(
        err.response?.data?.message ||
        "Failed to disconnect integration."
      );
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-76px)] overflow-hidden bg-[#030303]">
      {/* Background glow */}
      <div className="pointer-events-none absolute left-1/2 top-0 h-[300px] w-[600px] -translate-x-1/2 rounded-full bg-[#168FFF]/[0.035] blur-[120px]" />

      <div className="relative mx-auto w-full max-w-[1600px] px-5 py-7 sm:px-7 lg:px-8 lg:py-9">
        {/* Header */}
        <section className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <div className="mb-3 flex items-center gap-2">
              <span className="h-px w-5 bg-[#168FFF]" />

              <span className="text-[9px] font-medium uppercase tracking-[0.25em] text-[#168FFF]">
                Connect your tools
              </span>
            </div>

            <h2 className="text-2xl font-medium tracking-[-0.035em] text-white sm:text-3xl">
              Integrations
            </h2>

            <p className="mt-2 max-w-xl text-xs leading-6 text-zinc-600">
              Connect the tools you already use so your workflows
              can read and act on them automatically.
            </p>
          </div>

          <div className="flex h-9 w-fit items-center gap-2 rounded-lg border border-white/[0.07] bg-[#080A0E] px-3.5">
            <span className="h-1.5 w-1.5 rounded-full bg-[#168FFF] shadow-[0_0_7px_rgba(22,143,255,0.7)]" />

            <span className="text-[10px] text-zinc-400">
              {connectedCount} of {integrationDefinitions.length}{" "}
              connected
            </span>
          </div>
        </section>

        {/* Success */}
        {success && (
          <div className="mb-5 flex items-center gap-2 rounded-lg border border-[#168FFF]/20 bg-[#168FFF]/[0.06] px-4 py-3 text-[10px] text-[#168FFF]">
            <CheckCircle2 size={14} />
            {success}
          </div>
        )}

        {/* Error */}
        {error && !modalOpen && (
          <div className="mb-5 flex items-center justify-between gap-3 rounded-lg border border-red-500/20 bg-red-500/[0.05] px-4 py-3 text-[10px] text-red-400">
            <span>{error}</span>

            <button
              type="button"
              onClick={() => setError("")}
              className="text-red-400/70 hover:text-red-300"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Search */}
        <section className="mb-5">
          <div className="flex h-10 w-full items-center gap-3 rounded-lg border border-white/[0.07] bg-[#080A0E] px-3.5 sm:max-w-xs">
            <Search
              size={14}
              strokeWidth={1.7}
              className="text-zinc-600"
            />

            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search integrations..."
              className="w-full bg-transparent text-[11px] text-zinc-200 placeholder:text-zinc-700 focus:outline-none"
            />
          </div>
        </section>

        {/* Loading */}
        {loading ? (
          <div className="flex min-h-[300px] items-center justify-center">
            <div className="flex items-center gap-2 text-[10px] text-zinc-600">
              <Loader2
                size={15}
                className="animate-spin"
              />
              Loading integrations...
            </div>
          </div>
        ) : filteredIntegrations.length > 0 ? (
          <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {filteredIntegrations.map((definition) => {
              const Icon = definition.icon;

              const existing = integrations.find(
                (integration) =>
                  integration.provider === definition.provider
              );

              const connected =
                existing?.status === "connected";

              return (
                <div
                  key={definition.provider}
                  className="group flex flex-col rounded-xl border border-white/[0.07] bg-[#080A0E] p-5 transition-all duration-300 hover:border-white/[0.13] hover:bg-[#0A0D12]"
                >
                  {/* Top row */}
                  <div className="flex items-start justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/[0.07] bg-white/[0.025]">
                      <Icon
                        size={17}
                        strokeWidth={1.6}
                        className="text-zinc-500 transition-colors duration-300 group-hover:text-[#168FFF]"
                      />
                    </div>

                    {connected && (
                      <span className="flex items-center gap-1 rounded-md border border-[#168FFF]/20 bg-[#168FFF]/[0.08] px-2 py-1 text-[8px] font-medium text-[#168FFF]">
                        <CheckCircle2
                          size={10}
                          strokeWidth={2}
                        />
                        Connected
                      </span>
                    )}
                  </div>

                  {/* Title + description */}
                  <div className="mt-4 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-[13px] font-medium text-zinc-100">
                        {definition.name}
                      </h3>

                      <span className="rounded-md border border-white/[0.07] px-1.5 py-0.5 text-[7.5px] uppercase tracking-[0.08em] text-zinc-700">
                        {definition.category}
                      </span>
                    </div>

                    <p className="mt-1.5 text-[10px] leading-5 text-zinc-600">
                      {definition.description}
                    </p>
                  </div>

                  {/* Footer */}
                  <div className="mt-5 flex items-center justify-between border-t border-white/[0.06] pt-4">
                    <button
                      type="button"
                      className="flex items-center gap-1.5 text-[9px] text-zinc-700 transition-colors hover:text-zinc-400"
                    >
                      Learn more
                      <ExternalLink
                        size={10}
                        strokeWidth={1.8}
                      />
                    </button>

                    {connected ? (
                      <button
                        type="button"
                        onClick={() =>
                          handleDisconnect(definition)
                        }
                        className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] px-3.5 py-2 text-[9px] font-semibold text-zinc-400 transition-all duration-300 hover:border-red-500/30 hover:bg-red-500/[0.06] hover:text-red-400"
                      >
                        <Unplug size={11} />
                        Disconnect
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() =>
                          openConnectModal(definition)
                        }
                        className="flex items-center gap-1.5 rounded-lg bg-[#168FFF] px-3.5 py-2 text-[9px] font-semibold text-black transition-all duration-300 hover:bg-[#38A8FF] hover:shadow-[0_0_20px_rgba(22,143,255,0.18)]"
                      >
                        <Plus size={11} />
                        Connect
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </section>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/[0.09] bg-[#080A0E] py-20 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.025]">
              <Search
                size={20}
                strokeWidth={1.5}
                className="text-zinc-600"
              />
            </div>

            <p className="mt-4 text-[12px] font-medium text-zinc-300">
              No integrations found
            </p>

            <p className="mt-1.5 max-w-xs text-[10px] leading-5 text-zinc-600">
              Try a different search term.
            </p>
          </div>
        )}
      </div>

      {/* Connect Modal */}
      {modalOpen && selectedIntegration && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/[0.08] bg-[#080A0E] shadow-2xl">
            {/* Modal header */}
            <div className="flex items-start justify-between border-b border-white/[0.07] px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.07] bg-white/[0.025]">
                  <selectedIntegration.icon
                    size={16}
                    className="text-[#168FFF]"
                  />
                </div>

                <div>
                  <h3 className="text-[13px] font-medium text-white">
                    Connect {selectedIntegration.name}
                  </h3>

                  <p className="mt-0.5 text-[9px] text-zinc-600">
                    Add the credentials required by CortexFlow.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={closeModal}
                className="text-zinc-600 transition-colors hover:text-zinc-300"
              >
                <X size={16} />
              </button>
            </div>

            {/* Form */}
            <form
              onSubmit={handleConnect}
              className="p-5"
            >
              {selectedIntegration.fields.length === 0 ? (
                <div className="rounded-lg border border-[#168FFF]/15 bg-[#168FFF]/[0.04] p-4">
                  <p className="text-[10px] leading-5 text-zinc-400">
                    Webhooks do not require stored credentials.
                    You can use webhook URLs directly inside your
                    workflows.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {selectedIntegration.fields.map((field) => (
                    <div key={field.key}>
                      <label className="mb-1.5 block text-[9px] font-medium uppercase tracking-[0.12em] text-zinc-500">
                        {field.label}
                      </label>

                      <input
                        type={field.type}
                        value={form[field.key] || ""}
                        onChange={(event) =>
                          handleFieldChange(
                            field.key,
                            event.target.value
                          )
                        }
                        placeholder={field.placeholder}
                        autoComplete="off"
                        className="h-10 w-full rounded-lg border border-white/[0.08] bg-[#030303] px-3 text-[10px] text-zinc-200 outline-none transition-colors placeholder:text-zinc-700 focus:border-[#168FFF]/40"
                      />
                    </div>
                  ))}
                </div>
              )}

              {error && (
                <div className="mt-4 rounded-lg border border-red-500/20 bg-red-500/[0.05] px-3 py-2.5 text-[9px] leading-5 text-red-400">
                  {error}
                </div>
              )}

              {success && (
                <div className="mt-4 rounded-lg border border-[#168FFF]/20 bg-[#168FFF]/[0.05] px-3 py-2.5 text-[9px] leading-5 text-[#168FFF]">
                  {success}
                </div>
              )}

              <div className="mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="rounded-lg border border-white/[0.08] px-4 py-2.5 text-[9px] font-medium text-zinc-400 transition-colors hover:bg-white/[0.03] hover:text-white disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 rounded-lg bg-[#168FFF] px-4 py-2.5 text-[9px] font-semibold text-black transition-all hover:bg-[#38A8FF] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving && (
                    <Loader2
                      size={12}
                      className="animate-spin"
                    />
                  )}

                  {saving ? "Connecting..." : "Connect"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Integrations;