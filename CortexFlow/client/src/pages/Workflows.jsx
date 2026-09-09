import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  ArrowUpRight,
  Bot,
  Loader2,
  Play,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Zap,
  RefreshCw,
} from "lucide-react";

import {
  getWorkflows,
  deleteWorkflow,
  runWorkflow,
} from "../services/workflowService";

const filters = ["All", "Active", "Paused", "Draft"];

const cardIcons = [Bot, Sparkles, Activity, Zap];

const formatRelativeTime = (dateString) => {
  if (!dateString) return "Never";

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) return "Never";

  const diff = Date.now() - date.getTime();

  if (diff < 60000) return "Just now";

  const minutes = Math.floor(diff / 60000);

  if (minutes < 60) {
    return `${minutes} min ago`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours} hour${hours !== 1 ? "s" : ""} ago`;
  }

  const days = Math.floor(hours / 24);

  return `${days} day${days !== 1 ? "s" : ""} ago`;
};

const normalizeWorkflowsResponse = (data) => {
  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.workflows)) {
    return data.workflows;
  }

  if (Array.isArray(data?.data)) {
    return data.data;
  }

  return [];
};

const Workflows = () => {
  const navigate = useNavigate();

  const [workflows, setWorkflows] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState("All");
  const [query, setQuery] = useState("");
  const [runningId, setRunningId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const showMessage = (text) => {
    setMessage(text);

    window.setTimeout(() => {
      setMessage("");
    }, 2500);
  };

  const loadWorkflows = useCallback(async (refresh = false) => {
    try {
      if (refresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      setError("");

      const data = await getWorkflows();

      setWorkflows(normalizeWorkflowsResponse(data));
    } catch (err) {
      console.error("Failed to load workflows:", err);

      setError(
        err.response?.data?.message ||
          "Failed to load workflows."
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadWorkflows();
  }, [loadWorkflows]);

  const handleRun = async (id) => {
    try {
      setRunningId(id);
      setError("");

      await runWorkflow(id);

      showMessage("Execution queued successfully.");

      /*
       * The execution is asynchronous, so the workflow statistics
       * may not change immediately. We refresh once after a short
       * delay instead of pretending the run has already completed.
       */
      window.setTimeout(() => {
        loadWorkflows(true);
      }, 1000);
    } catch (err) {
      console.error("Failed to run workflow:", err);

      setError(
        err.response?.data?.message ||
          "Unable to run this workflow."
      );
    } finally {
      setRunningId(null);
    }
  };

  const handleDelete = async (id, name) => {
    const confirmed = window.confirm(
      `Delete "${name || "Untitled Workflow"}"? This can't be undone.`
    );

    if (!confirmed) return;

    try {
      setDeletingId(id);
      setError("");

      await deleteWorkflow(id);

      setWorkflows((current) =>
        current.filter(
          (workflow) => workflow._id !== id
        )
      );

      showMessage("Workflow deleted.");
    } catch (err) {
      console.error("Failed to delete workflow:", err);

      setError(
        err.response?.data?.message ||
          "Unable to delete workflow."
      );
    } finally {
      setDeletingId(null);
    }
  };

  const filteredWorkflows = useMemo(() => {
    const search = query.trim().toLowerCase();

    return workflows.filter((workflow) => {
      const matchesFilter =
        activeFilter === "All" ||
        workflow.status === activeFilter;

      if (!matchesFilter) return false;

      if (!search) return true;

      const searchableText = [
        workflow.name,
        workflow.description,
        workflow.status,
        workflow.trigger?.type,
        ...(workflow.nodes || []).map(
          (node) =>
            `${node.data?.label || ""} ${
              node.data?.key || ""
            }`
        ),
      ]
        .join(" ")
        .toLowerCase();

      return searchableText.includes(search);
    });
  }, [workflows, activeFilter, query]);

  return (
    <div className="relative min-h-[calc(100vh-76px)] overflow-hidden bg-[#030303]">
      {/* Background */}
      <div className="pointer-events-none absolute left-1/2 top-0 h-[300px] w-[600px] -translate-x-1/2 rounded-full bg-[#168FFF]/[0.035] blur-[120px]" />

      <div className="relative mx-auto w-full max-w-[1600px] px-5 py-7 sm:px-7 lg:px-8 lg:py-9">

        {/* Header */}
        <section className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <div className="mb-3 flex items-center gap-2">
              <span className="h-px w-5 bg-[#168FFF]" />

              <span className="text-[9px] font-medium uppercase tracking-[0.25em] text-[#168FFF]">
                Automations
              </span>
            </div>

            <h1 className="text-2xl font-medium tracking-[-0.035em] text-white sm:text-3xl">
              Workflows
            </h1>

            <p className="mt-2 max-w-xl text-xs leading-6 text-zinc-600">
              Create, monitor, and manage every automation
              running in your workspace.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => loadWorkflows(true)}
              disabled={isRefreshing}
              className="flex h-10 items-center gap-2 rounded-lg border border-white/[0.07] bg-white/[0.02] px-3 text-[10px] text-zinc-500 transition hover:border-white/[0.14] hover:text-white disabled:opacity-50"
            >
              <RefreshCw
                size={13}
                className={
                  isRefreshing
                    ? "animate-spin"
                    : ""
                }
              />

              <span className="hidden sm:inline">
                Refresh
              </span>
            </button>

            <button
              type="button"
              onClick={() =>
                navigate("/workflows/new")
              }
              className="group flex items-center gap-2.5 rounded-lg bg-[#168FFF] px-4 py-2.5 text-[10px] font-semibold text-black transition-all duration-300 hover:bg-[#38A8FF] hover:shadow-[0_0_30px_rgba(22,143,255,0.18)]"
            >
              <Plus
                size={14}
                strokeWidth={2.2}
              />

              Create Workflow

              <ArrowUpRight
                size={13}
                strokeWidth={2}
                className="transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
              />
            </button>
          </div>
        </section>

        {/* Feedback */}
        {error && (
          <div className="mb-4 flex items-center justify-between gap-4 rounded-lg border border-red-500/10 bg-red-500/[0.035] px-4 py-3">
            <p className="text-[10px] text-red-400">
              {error}
            </p>

            <button
              type="button"
              onClick={() => setError("")}
              className="text-[9px] text-zinc-600 hover:text-white"
            >
              Dismiss
            </button>
          </div>
        )}

        {message && (
          <div className="mb-4 rounded-lg border border-[#168FFF]/15 bg-[#168FFF]/[0.05] px-4 py-3">
            <p className="text-[10px] text-[#168FFF]">
              {message}
            </p>
          </div>
        )}

        {/* Search + filters */}
        <section className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex h-10 w-full items-center gap-3 rounded-lg border border-white/[0.07] bg-[#080A0E] px-3.5 sm:max-w-xs">
            <Search
              size={14}
              strokeWidth={1.7}
              className="shrink-0 text-zinc-600"
            />

            <input
              type="text"
              value={query}
              onChange={(event) =>
                setQuery(event.target.value)
              }
              placeholder="Search workflows..."
              className="w-full bg-transparent text-[11px] text-zinc-200 placeholder:text-zinc-700 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto">
            {filters.map((filter) => {
              const active =
                activeFilter === filter;

              return (
                <button
                  key={filter}
                  type="button"
                  onClick={() =>
                    setActiveFilter(filter)
                  }
                  className={`shrink-0 rounded-lg border px-3.5 py-2 text-[10px] font-medium transition ${
                    active
                      ? "border-[#168FFF]/30 bg-[#168FFF]/10 text-[#168FFF]"
                      : "border-white/[0.07] text-zinc-500 hover:border-white/[0.13] hover:text-zinc-200"
                  }`}
                >
                  {filter}
                </button>
              );
            })}
          </div>
        </section>

        {/* Loading */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center rounded-xl border border-white/[0.07] bg-[#080A0E] py-24">
            <Loader2
              size={22}
              className="animate-spin text-[#168FFF]"
            />

            <p className="mt-3 text-[11px] text-zinc-600">
              Loading your workflows...
            </p>
          </div>
        )}

        {/* Empty */}
        {!isLoading &&
          workflows.length === 0 && (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/[0.09] bg-[#080A0E] py-20 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.025]">
                <Bot
                  size={20}
                  strokeWidth={1.5}
                  className="text-zinc-600"
                />
              </div>

              <p className="mt-4 text-[12px] font-medium text-zinc-300">
                No workflows yet
              </p>

              <p className="mt-1.5 max-w-xs text-[10px] leading-5 text-zinc-600">
                Create your first automation to
                get started.
              </p>

              <button
                type="button"
                onClick={() =>
                  navigate("/workflows/new")
                }
                className="mt-5 flex items-center gap-2 rounded-lg bg-[#168FFF] px-4 py-2.5 text-[10px] font-semibold text-black transition hover:bg-[#38A8FF]"
              >
                <Plus size={13} />
                Create Workflow
              </button>
            </div>
          )}

        {/* No results */}
        {!isLoading &&
          workflows.length > 0 &&
          filteredWorkflows.length === 0 && (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/[0.09] bg-[#080A0E] py-20 text-center">
              <Search
                size={22}
                className="text-zinc-700"
              />

              <p className="mt-4 text-[12px] font-medium text-zinc-300">
                No workflows found
              </p>

              <p className="mt-1.5 text-[10px] text-zinc-600">
                Try another search or filter.
              </p>
            </div>
          )}

        {/* Cards */}
        {!isLoading &&
          filteredWorkflows.length > 0 && (
            <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {filteredWorkflows.map(
                (workflow, index) => {
                  const Icon =
                    cardIcons[
                      index %
                        cardIcons.length
                    ];

                  const total =
                    Number(
                      workflow.totalExecutions
                    ) || 0;

                  const successful =
                    Number(
                      workflow.successfulExecutions
                    ) || 0;

                  const successRate =
                    total > 0
                      ? `${Math.round(
                          (successful /
                            total) *
                            100
                        )}%`
                      : "—";

                  const status =
                    workflow.status ||
                    "Draft";

                  return (
                    <div
                      key={workflow._id}
                      onClick={() =>
                        navigate(
                          `/workflows/${workflow._id}`
                        )
                      }
                      className="group relative flex cursor-pointer flex-col rounded-xl border border-white/[0.07] bg-[#080A0E] p-5 transition-all duration-300 hover:border-white/[0.13] hover:bg-[#0A0D12]"
                    >
                      {/* Top */}
                      <div className="flex items-start justify-between">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/[0.07] bg-white/[0.025]">
                          <Icon
                            size={17}
                            strokeWidth={1.6}
                            className="text-zinc-500 transition-colors group-hover:text-[#168FFF]"
                          />
                        </div>

                        <button
                          type="button"
                          disabled={
                            deletingId ===
                            workflow._id
                          }
                          onClick={(event) => {
                            event.stopPropagation();

                            handleDelete(
                              workflow._id,
                              workflow.name
                            );
                          }}
                          className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-700 transition hover:bg-red-500/10 hover:text-red-400 disabled:opacity-40"
                        >
                          {deletingId ===
                          workflow._id ? (
                            <Loader2
                              size={13}
                              className="animate-spin"
                            />
                          ) : (
                            <Trash2
                              size={13}
                              strokeWidth={1.7}
                            />
                          )}
                        </button>
                      </div>

                      {/* Title */}
                      <div className="mt-4">
                        <h2 className="truncate text-[13px] font-medium text-zinc-100">
                          {workflow.name ||
                            "Untitled Workflow"}
                        </h2>

                        <p className="mt-1.5 line-clamp-2 text-[10px] leading-5 text-zinc-600">
                          {workflow.description ||
                            "No description yet."}
                        </p>
                      </div>

                      {/* Status */}
                      <div className="mt-5 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              status ===
                              "Active"
                                ? "bg-[#168FFF] shadow-[0_0_7px_rgba(22,143,255,0.7)]"
                                : status ===
                                    "Paused"
                                  ? "bg-yellow-500"
                                  : "bg-zinc-700"
                            }`}
                          />

                          <span className="text-[9px] text-zinc-500">
                            {status}
                          </span>
                        </div>

                        <span className="text-[8px] uppercase tracking-[0.12em] text-zinc-700">
                          {workflow.trigger
                            ?.type ||
                            "manual"}
                        </span>
                      </div>

                      {/* Stats */}
                      <div className="mt-4 grid grid-cols-3 gap-3 border-t border-white/[0.06] pt-4">
                        <div>
                          <p className="text-[8px] uppercase tracking-[0.12em] text-zinc-800">
                            Runs
                          </p>

                          <p className="mt-1.5 text-[11px] text-zinc-300">
                            {total}
                          </p>
                        </div>

                        <div>
                          <p className="text-[8px] uppercase tracking-[0.12em] text-zinc-800">
                            Success
                          </p>

                          <p className="mt-1.5 text-[11px] text-zinc-300">
                            {successRate}
                          </p>
                        </div>

                        <div>
                          <p className="text-[8px] uppercase tracking-[0.12em] text-zinc-800">
                            Nodes
                          </p>

                          <p className="mt-1.5 text-[11px] text-zinc-300">
                            {workflow.nodes
                              ?.length ||
                              0}
                          </p>
                        </div>
                      </div>

                      {/* Footer */}
                      <div className="mt-5 flex items-center justify-between border-t border-white/[0.06] pt-4">
                        <span className="text-[8px] text-zinc-800">
                          {workflow.lastRunAt
                            ? `Ran ${formatRelativeTime(
                                workflow.lastRunAt
                              )}`
                            : "Never run"}
                        </span>

                        <button
                          type="button"
                          disabled={
                            runningId ===
                            workflow._id
                          }
                          onClick={(event) => {
                            event.stopPropagation();

                            handleRun(
                              workflow._id
                            );
                          }}
                          className="flex h-7 w-7 items-center justify-center rounded-md border border-white/[0.07] text-zinc-500 transition hover:border-[#168FFF]/30 hover:bg-[#168FFF]/10 hover:text-[#168FFF] disabled:opacity-50"
                          title="Run workflow"
                        >
                          {runningId ===
                          workflow._id ? (
                            <Loader2
                              size={12}
                              className="animate-spin"
                            />
                          ) : (
                            <Play
                              size={12}
                              strokeWidth={1.8}
                            />
                          )}
                        </button>
                      </div>
                    </div>
                  );
                }
              )}
            </section>
          )}
      </div>
    </div>
  );
};

export default Workflows;