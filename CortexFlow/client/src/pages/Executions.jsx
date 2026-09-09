import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Activity,
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  Filter,
  Loader2,
  Play,
  RefreshCw,
  Search,
  XCircle,
  Zap,
} from "lucide-react";

import {
  getExecutions,
  getWorkflows,
} from "../services/workflowService";

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "queued", label: "Queued" },
  { value: "running", label: "Running" },
  { value: "success", label: "Success" },
  { value: "failed", label: "Failed" },
  { value: "cancelled", label: "Cancelled" },
];

const formatDate = (date) => {
  if (!date) return "—";

  return new Date(date).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatDuration = (duration) => {
  if (!duration && duration !== 0) return "—";

  if (duration < 1000) {
    return `${duration}ms`;
  }

  const seconds = duration / 1000;

  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);

  return `${minutes}m ${remainingSeconds}s`;
};

const getStatusClasses = (status) => {
  switch (status) {
    case "success":
      return {
        wrapper:
          "border-emerald-500/15 bg-emerald-500/[0.05]",
        text: "text-emerald-400",
        icon: CheckCircle2,
      };

    case "failed":
      return {
        wrapper: "border-red-500/15 bg-red-500/[0.05]",
        text: "text-red-400",
        icon: XCircle,
      };

    case "running":
      return {
        wrapper: "border-[#168FFF]/15 bg-[#168FFF]/[0.05]",
        text: "text-[#168FFF]",
        icon: Activity,
      };

    case "queued":
    case "pending":
      return {
        wrapper:
          "border-amber-500/15 bg-amber-500/[0.05]",
        text: "text-amber-400",
        icon: Clock3,
      };

    case "cancelled":
      return {
        wrapper: "border-zinc-500/15 bg-zinc-500/[0.05]",
        text: "text-zinc-500",
        icon: XCircle,
      };

    default:
      return {
        wrapper: "border-white/[0.07] bg-white/[0.03]",
        text: "text-zinc-500",
        icon: Clock3,
      };
  }
};

const StatusBadge = ({ status }) => {
  const config = getStatusClasses(status);
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[8px] font-medium uppercase tracking-[0.08em] ${config.wrapper} ${config.text}`}
    >
      <Icon size={10} />

      {status || "unknown"}
    </span>
  );
};

const StatCard = ({ label, value, icon: Icon }) => (
  <div className="rounded-xl border border-white/[0.07] bg-[#080A0E] p-5">
    <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.07] bg-white/[0.025]">
      <Icon size={14} className="text-zinc-500" />
    </div>

    <p className="mt-5 text-[9px] uppercase tracking-[0.13em] text-zinc-700">
      {label}
    </p>

    <p className="mt-1.5 text-xl font-medium tracking-[-0.03em] text-white">
      {value}
    </p>
  </div>
);

const Executions = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [executions, setExecutions] = useState([]);
  const [workflows, setWorkflows] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [search, setSearch] = useState(
    searchParams.get("search") || ""
  );

  const [status, setStatus] = useState(
    searchParams.get("status") || "all"
  );

  const [workflowFilter, setWorkflowFilter] = useState(
    searchParams.get("workflow") || "all"
  );

  const [error, setError] = useState("");

  const loadExecutions = async (showRefresh = false) => {
    if (showRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      const [executionsData, workflowsData] =
        await Promise.all([
          getExecutions(),
          getWorkflows(),
        ]);

      setExecutions(
        Array.isArray(executionsData)
          ? executionsData
          : []
      );

      setWorkflows(
        Array.isArray(workflowsData)
          ? workflowsData
          : []
      );
    } catch (requestError) {
      console.error(
        "Failed to load executions:",
        requestError
      );

      setError(
        requestError.response?.data?.message ||
          "Unable to load executions."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadExecutions();
  }, []);

  useEffect(() => {
    const params = {};

    if (search.trim()) {
      params.search = search.trim();
    }

    if (status !== "all") {
      params.status = status;
    }

    if (workflowFilter !== "all") {
      params.workflow = workflowFilter;
    }

    setSearchParams(params, {
      replace: true,
    });
  }, [
    search,
    status,
    workflowFilter,
    setSearchParams,
  ]);

  const filteredExecutions = useMemo(() => {
    const normalizedSearch = search
      .trim()
      .toLowerCase();

    return executions.filter((execution) => {
      const workflowName =
        execution.workflow?.name ||
        execution.workflowName ||
        "Untitled workflow";

      const matchesSearch =
        !normalizedSearch ||
        workflowName
          .toLowerCase()
          .includes(normalizedSearch) ||
        execution.triggerType
          ?.toLowerCase()
          .includes(normalizedSearch) ||
        execution.status
          ?.toLowerCase()
          .includes(normalizedSearch);

      const matchesStatus =
        status === "all" ||
        execution.status === status;

      const workflowId =
        execution.workflow?._id ||
        execution.workflow;

      const matchesWorkflow =
        workflowFilter === "all" ||
        workflowId === workflowFilter;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesWorkflow
      );
    });
  }, [
    executions,
    search,
    status,
    workflowFilter,
  ]);

  const stats = useMemo(() => {
    const total = executions.length;

    const successful = executions.filter(
      (execution) =>
        execution.status === "success"
    ).length;

    const failed = executions.filter(
      (execution) =>
        execution.status === "failed"
    ).length;

    const running = executions.filter(
      (execution) =>
        execution.status === "running" ||
        execution.status === "queued" ||
        execution.status === "pending"
    ).length;

    return {
      total,
      successful,
      failed,
      running,
    };
  }, [executions]);

  const clearFilters = () => {
    setSearch("");
    setStatus("all");
    setWorkflowFilter("all");
  };

  const hasFilters =
    search.trim() ||
    status !== "all" ||
    workflowFilter !== "all";

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-76px)] items-center justify-center bg-[#030303]">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-zinc-600">
          <Loader2
            size={15}
            className="animate-spin text-[#168FFF]"
          />

          Loading executions
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-[calc(100vh-76px)] overflow-hidden bg-[#030303]">
      <div className="pointer-events-none absolute left-1/2 top-0 h-[300px] w-[600px] -translate-x-1/2 rounded-full bg-[#168FFF]/[0.035] blur-[120px]" />

      <div className="relative mx-auto w-full max-w-[1600px] px-5 py-7 sm:px-7 lg:px-8 lg:py-9">
        {/* HEADER */}
        <section className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <div className="mb-3 flex items-center gap-2">
              <span className="h-px w-5 bg-[#168FFF]" />

              <span className="text-[9px] font-medium uppercase tracking-[0.25em] text-[#168FFF]">
                Execution Center
              </span>
            </div>

            <h2 className="text-2xl font-medium tracking-[-0.035em] text-white sm:text-3xl">
              Executions
            </h2>

            <p className="mt-2 max-w-xl text-xs leading-6 text-zinc-600">
              Monitor workflow runs, inspect execution
              status, and track automation activity.
            </p>
          </div>

          <button
            type="button"
            onClick={() => loadExecutions(true)}
            disabled={refreshing}
            className="flex w-fit items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.02] px-3.5 py-2.5 text-[9px] font-medium text-zinc-400 transition hover:border-white/[0.14] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw
              size={12}
              className={
                refreshing ? "animate-spin" : ""
              }
            />

            Refresh
          </button>
        </section>

        {/* ERROR */}
        {error && (
          <div className="mb-4 rounded-lg border border-red-500/15 bg-red-500/[0.04] px-4 py-3 text-[10px] text-red-400">
            {error}
          </div>
        )}

        {/* STATS */}
        <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <StatCard
            label="Total runs"
            value={stats.total}
            icon={Zap}
          />

          <StatCard
            label="Successful"
            value={stats.successful}
            icon={CheckCircle2}
          />

          <StatCard
            label="Failed"
            value={stats.failed}
            icon={XCircle}
          />

          <StatCard
            label="In progress"
            value={stats.running}
            icon={Activity}
          />
        </section>

        {/* FILTERS */}
        <section className="mt-3 rounded-xl border border-white/[0.07] bg-[#080A0E] p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            {/* SEARCH */}
            <div className="relative flex-1">
              <Search
                size={13}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-700"
              />

              <input
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search executions..."
                className="w-full rounded-lg border border-white/[0.07] bg-[#0A0D12] py-2.5 pl-9 pr-3 text-[10px] text-zinc-300 placeholder:text-zinc-700 focus:border-[#168FFF]/40 focus:outline-none"
              />
            </div>

            {/* STATUS */}
            <div className="relative">
              <Filter
                size={12}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-700"
              />

              <select
                value={status}
                onChange={(event) =>
                  setStatus(event.target.value)
                }
                className="w-full appearance-none rounded-lg border border-white/[0.07] bg-[#0A0D12] py-2.5 pl-8 pr-8 text-[10px] text-zinc-400 focus:border-[#168FFF]/40 focus:outline-none lg:w-[150px]"
              >
                {STATUS_OPTIONS.map((option) => (
                  <option
                    key={option.value}
                    value={option.value}
                  >
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* WORKFLOW */}
            <select
              value={workflowFilter}
              onChange={(event) =>
                setWorkflowFilter(event.target.value)
              }
              className="rounded-lg border border-white/[0.07] bg-[#0A0D12] px-3 py-2.5 text-[10px] text-zinc-400 focus:border-[#168FFF]/40 focus:outline-none lg:w-[200px]"
            >
              <option value="all">
                All workflows
              </option>

              {workflows.map((workflow) => (
                <option
                  key={workflow._id}
                  value={workflow._id}
                >
                  {workflow.name}
                </option>
              ))}
            </select>

            {hasFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="flex items-center justify-center gap-1.5 rounded-lg px-3 py-2.5 text-[9px] text-zinc-600 transition hover:text-zinc-300"
              >
                <XCircle size={12} />

                Clear
              </button>
            )}
          </div>
        </section>

        {/* EXECUTION TABLE */}
        <section className="mt-3 overflow-hidden rounded-xl border border-white/[0.07] bg-[#080A0E]">
          <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-5 sm:px-6">
            <div>
              <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-600">
                Run History
              </p>

              <h3 className="mt-1.5 text-sm font-medium text-white">
                {filteredExecutions.length} execution
                {filteredExecutions.length !== 1
                  ? "s"
                  : ""}
              </h3>
            </div>
          </div>

          {filteredExecutions.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-5 py-20 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.025]">
                <Activity
                  size={17}
                  className="text-zinc-700"
                />
              </div>

              <h4 className="mt-4 text-[11px] font-medium text-zinc-400">
                {hasFilters
                  ? "No matching executions"
                  : "No executions yet"}
              </h4>

              <p className="mt-1.5 max-w-sm text-[9px] leading-5 text-zinc-700">
                {hasFilters
                  ? "Try changing your search or filters."
                  : "Run a workflow to see its execution history here."}
              </p>

              {hasFilters ? (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="mt-4 rounded-lg border border-white/[0.08] px-3 py-2 text-[9px] text-zinc-500 transition hover:text-white"
                >
                  Clear filters
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() =>
                    navigate("/workflows")
                  }
                  className="mt-4 flex items-center gap-2 rounded-lg bg-[#168FFF] px-3.5 py-2.5 text-[9px] font-semibold text-black transition hover:bg-[#38A8FF]"
                >
                  <Play size={11} />

                  Go to workflows
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-white/[0.05]">
              {filteredExecutions.map((execution) => {
                const workflowName =
                  execution.workflow?.name ||
                  execution.workflowName ||
                  "Untitled workflow";

                return (
                  <button
                    key={execution._id}
                    type="button"
                    onClick={() =>
                      navigate(
                        `/executions/${execution._id}`
                      )
                    }
                    className="group flex w-full flex-col gap-4 px-5 py-4 text-left transition hover:bg-white/[0.015] sm:px-6 lg:flex-row lg:items-center"
                  >
                    {/* WORKFLOW */}
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/[0.07] bg-white/[0.025]">
                        <Zap
                          size={14}
                          className="text-zinc-600 transition-colors group-hover:text-[#168FFF]"
                        />
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-[10px] font-medium text-zinc-200">
                          {workflowName}
                        </p>

                        <p className="mt-1 text-[8px] text-zinc-700">
                          ID: {execution._id}
                        </p>
                      </div>
                    </div>

                    {/* STATUS */}
                    <div className="lg:w-[120px]">
                      <StatusBadge
                        status={execution.status}
                      />
                    </div>

                    {/* TRIGGER */}
                    <div className="lg:w-[100px]">
                      <p className="text-[8px] uppercase tracking-[0.12em] text-zinc-800">
                        Trigger
                      </p>

                      <p className="mt-1.5 text-[9px] capitalize text-zinc-500">
                        {execution.triggerType ||
                          "manual"}
                      </p>
                    </div>

                    {/* DURATION */}
                    <div className="lg:w-[100px]">
                      <p className="text-[8px] uppercase tracking-[0.12em] text-zinc-800">
                        Duration
                      </p>

                      <p className="mt-1.5 text-[9px] text-zinc-500">
                        {formatDuration(
                          execution.duration
                        )}
                      </p>
                    </div>

                    {/* DATE */}
                    <div className="lg:w-[175px]">
                      <p className="text-[8px] uppercase tracking-[0.12em] text-zinc-800">
                        Started
                      </p>

                      <p className="mt-1.5 text-[9px] text-zinc-500">
                        {formatDate(
                          execution.startedAt ||
                            execution.createdAt
                        )}
                      </p>
                    </div>

                    <div className="flex items-center justify-end lg:w-8">
                      <ArrowUpRight
                        size={14}
                        className="text-zinc-800 transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[#168FFF]"
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default Executions;