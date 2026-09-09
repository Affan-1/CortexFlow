import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  ArrowUpRight,
  Bot,
  CheckCircle2,
  Clock3,
  Loader2,
  Play,
  Plus,
  RefreshCw,
  Sparkles,
  Workflow as WorkflowIcon,
  XCircle,
  Zap,
} from "lucide-react";

import { getWorkflows, runWorkflow } from "../services/workflowService";
import api from "../services/api";

const normalizeArray = (data, key) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.[key])) return data[key];
  if (Array.isArray(data?.data)) return data.data;
  return [];
};

const formatTime = (dateString) => {
  if (!dateString) return "Never";

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) return "Never";

  const diff = Date.now() - date.getTime();

  if (diff < 60000) return "Just now";

  const minutes = Math.floor(diff / 60000);

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.floor(hours / 24);

  return `${days}d ago`;
};

const getStatusClasses = (status) => {
  switch (String(status || "").toLowerCase()) {
    case "success":
    case "active":
      return "text-emerald-400";

    case "failed":
      return "text-red-400";

    case "running":
    case "queued":
    case "pending":
      return "text-[#168FFF]";

    case "paused":
      return "text-yellow-400";

    default:
      return "text-zinc-600";
  }
};

const Dashboard = () => {
  const navigate = useNavigate();

  const [workflows, setWorkflows] = useState([]);
  const [executions, setExecutions] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [runningId, setRunningId] = useState(null);

  const [error, setError] = useState("");

  const loadDashboard = useCallback(async (refresh = false) => {
    try {
      if (refresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const [workflowResponse, executionResponse] =
        await Promise.all([
          getWorkflows(),
          api.get("/executions"),
        ]);

      setWorkflows(
        normalizeArray(workflowResponse, "workflows")
      );

      setExecutions(
        normalizeArray(executionResponse.data, "executions")
      );
    } catch (err) {
      console.error("Dashboard loading error:", err);

      setError(
        err.response?.data?.message ||
          "Unable to load dashboard data."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const stats = useMemo(() => {
    const totalExecutions = executions.length;

    const successfulExecutions = executions.filter(
      (execution) =>
        execution.status === "success"
    ).length;

    const failedExecutions = executions.filter(
      (execution) =>
        execution.status === "failed"
    ).length;

    const runningExecutions = executions.filter(
      (execution) =>
        ["running", "queued", "pending"].includes(
          execution.status
        )
    ).length;

    const activeWorkflows = workflows.filter(
      (workflow) =>
        workflow.status === "Active"
    ).length;

    const successRate =
      totalExecutions > 0
        ? Math.round(
            (successfulExecutions /
              totalExecutions) *
              100
          )
        : 0;

    return {
      totalExecutions,
      successfulExecutions,
      failedExecutions,
      runningExecutions,
      activeWorkflows,
      successRate,
    };
  }, [workflows, executions]);

  const recentExecutions = useMemo(() => {
    return [...executions]
      .sort(
        (a, b) =>
          new Date(
            b.createdAt || b.startedAt || 0
          ) -
          new Date(
            a.createdAt || a.startedAt || 0
          )
      )
      .slice(0, 6);
  }, [executions]);

  const recentWorkflows = useMemo(() => {
    return [...workflows]
      .sort(
        (a, b) =>
          new Date(
            b.updatedAt || 0
          ) -
          new Date(
            a.updatedAt || 0
          )
      )
      .slice(0, 5);
  }, [workflows]);

  const handleRun = async (workflowId) => {
    try {
      setRunningId(workflowId);
      setError("");

      await runWorkflow(workflowId);

      await loadDashboard(true);
    } catch (err) {
      console.error("Workflow run error:", err);

      setError(
        err.response?.data?.message ||
          "Unable to start workflow."
      );
    } finally {
      setRunningId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-76px)] items-center justify-center bg-[#030303]">
        <div className="flex flex-col items-center">
          <Loader2
            size={22}
            className="animate-spin text-[#168FFF]"
          />

          <p className="mt-3 text-[10px] text-zinc-600">
            Loading dashboard...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-[calc(100vh-76px)] overflow-hidden bg-[#030303]">
      <div className="pointer-events-none absolute left-1/2 top-0 h-[350px] w-[700px] -translate-x-1/2 rounded-full bg-[#168FFF]/[0.035] blur-[130px]" />

      <div className="relative mx-auto w-full max-w-[1600px] px-5 py-7 sm:px-7 lg:px-8 lg:py-9">

        {/* Header */}

        <section className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <div className="mb-3 flex items-center gap-2">
              <span className="h-px w-5 bg-[#168FFF]" />

              <span className="text-[9px] font-medium uppercase tracking-[0.25em] text-[#168FFF]">
                Control Center
              </span>
            </div>

            <h1 className="text-2xl font-medium tracking-[-0.035em] text-white sm:text-3xl">
              Dashboard
            </h1>

            <p className="mt-2 text-xs leading-6 text-zinc-600">
              Monitor your automations and execution activity.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => loadDashboard(true)}
              disabled={refreshing}
              className="flex h-10 items-center gap-2 rounded-lg border border-white/[0.07] bg-white/[0.02] px-3 text-[10px] text-zinc-500 transition hover:border-white/[0.14] hover:text-white disabled:opacity-50"
            >
              <RefreshCw
                size={13}
                className={
                  refreshing
                    ? "animate-spin"
                    : ""
                }
              />

              Refresh
            </button>

            <button
              type="button"
              onClick={() =>
                navigate("/workflows/new")
              }
              className="flex h-10 items-center gap-2 rounded-lg bg-[#168FFF] px-4 text-[10px] font-semibold text-black transition hover:bg-[#38A8FF] hover:shadow-[0_0_30px_rgba(22,143,255,0.18)]"
            >
              <Plus size={14} />

              New Workflow
            </button>
          </div>
        </section>

        {/* Error */}

        {error && (
          <div className="mb-4 rounded-lg border border-red-500/10 bg-red-500/[0.035] px-4 py-3">
            <p className="text-[10px] text-red-400">
              {error}
            </p>
          </div>
        )}

        {/* Stats */}

        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">

          <div className="rounded-xl border border-white/[0.07] bg-[#080A0E] p-5">
            <div className="flex items-center justify-between">
              <span className="text-[9px] uppercase tracking-[0.14em] text-zinc-700">
                Workflows
              </span>

              <WorkflowIcon
                size={15}
                className="text-zinc-700"
              />
            </div>

            <p className="mt-5 text-2xl font-medium tracking-[-0.03em] text-white">
              {workflows.length}
            </p>

            <p className="mt-1 text-[9px] text-zinc-700">
              {stats.activeWorkflows} active
            </p>
          </div>

          <div className="rounded-xl border border-white/[0.07] bg-[#080A0E] p-5">
            <div className="flex items-center justify-between">
              <span className="text-[9px] uppercase tracking-[0.14em] text-zinc-700">
                Executions
              </span>

              <Activity
                size={15}
                className="text-zinc-700"
              />
            </div>

            <p className="mt-5 text-2xl font-medium tracking-[-0.03em] text-white">
              {stats.totalExecutions}
            </p>

            <p className="mt-1 text-[9px] text-zinc-700">
              {stats.runningExecutions} in progress
            </p>
          </div>

          <div className="rounded-xl border border-white/[0.07] bg-[#080A0E] p-5">
            <div className="flex items-center justify-between">
              <span className="text-[9px] uppercase tracking-[0.14em] text-zinc-700">
                Success Rate
              </span>

              <CheckCircle2
                size={15}
                className="text-zinc-700"
              />
            </div>

            <p className="mt-5 text-2xl font-medium tracking-[-0.03em] text-white">
              {stats.successRate}%
            </p>

            <p className="mt-1 text-[9px] text-zinc-700">
              {stats.successfulExecutions} successful
            </p>
          </div>

          <div className="rounded-xl border border-white/[0.07] bg-[#080A0E] p-5">
            <div className="flex items-center justify-between">
              <span className="text-[9px] uppercase tracking-[0.14em] text-zinc-700">
                Failed
              </span>

              <XCircle
                size={15}
                className="text-zinc-700"
              />
            </div>

            <p className="mt-5 text-2xl font-medium tracking-[-0.03em] text-white">
              {stats.failedExecutions}
            </p>

            <p className="mt-1 text-[9px] text-zinc-700">
              Failed executions
            </p>
          </div>
        </section>

        {/* Main grid */}

        <section className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1.4fr_1fr]">

          {/* Recent Executions */}

          <div className="rounded-xl border border-white/[0.07] bg-[#080A0E]">

            <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-5">
              <div>
                <p className="text-[9px] uppercase tracking-[0.14em] text-zinc-700">
                  Activity
                </p>

                <h2 className="mt-1.5 text-sm font-medium text-white">
                  Recent Executions
                </h2>
              </div>

              <button
                type="button"
                onClick={() =>
                  navigate("/executions")
                }
                className="flex items-center gap-1 text-[9px] text-zinc-600 transition hover:text-[#168FFF]"
              >
                View all
                <ArrowUpRight size={11} />
              </button>
            </div>

            {recentExecutions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Activity
                  size={22}
                  className="text-zinc-700"
                />

                <p className="mt-3 text-[10px] text-zinc-600">
                  No executions yet
                </p>

                <p className="mt-1 text-[9px] text-zinc-800">
                  Run a workflow to see activity here.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-white/[0.05]">
                {recentExecutions.map(
                  (execution) => {
                    const workflowName =
                      typeof execution.workflow ===
                      "object"
                        ? execution.workflow?.name
                        : "Workflow";

                    return (
                      <button
                        key={execution._id}
                        type="button"
                        onClick={() =>
                          navigate(
                            `/executions/${execution._id}`
                          )
                        }
                        className="flex w-full items-center gap-4 px-5 py-4 text-left transition hover:bg-white/[0.02]"
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/[0.07] bg-white/[0.02]">
                          {execution.status ===
                          "success" ? (
                            <CheckCircle2
                              size={14}
                              className="text-emerald-400"
                            />
                          ) : execution.status ===
                            "failed" ? (
                            <XCircle
                              size={14}
                              className="text-red-400"
                            />
                          ) : (
                            <Clock3
                              size={14}
                              className={getStatusClasses(
                                execution.status
                              )}
                            />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[10px] font-medium text-zinc-300">
                            {workflowName}
                          </p>

                          <p className="mt-1 text-[8px] text-zinc-700">
                            {execution.triggerType ||
                              "manual"}{" "}
                            ·{" "}
                            {formatTime(
                              execution.createdAt ||
                                execution.startedAt
                            )}
                          </p>
                        </div>

                        <span
                          className={`text-[8px] uppercase tracking-[0.1em] ${getStatusClasses(
                            execution.status
                          )}`}
                        >
                          {execution.status}
                        </span>
                      </button>
                    );
                  }
                )}
              </div>
            )}
          </div>

          {/* Workflows */}

          <div className="rounded-xl border border-white/[0.07] bg-[#080A0E]">

            <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-5">
              <div>
                <p className="text-[9px] uppercase tracking-[0.14em] text-zinc-700">
                  Automations
                </p>

                <h2 className="mt-1.5 text-sm font-medium text-white">
                  Your Workflows
                </h2>
              </div>

              <button
                type="button"
                onClick={() =>
                  navigate("/workflows")
                }
                className="flex items-center gap-1 text-[9px] text-zinc-600 transition hover:text-[#168FFF]"
              >
                View all
                <ArrowUpRight size={11} />
              </button>
            </div>

            {recentWorkflows.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Bot
                  size={22}
                  className="text-zinc-700"
                />

                <p className="mt-3 text-[10px] text-zinc-600">
                  No workflows created
                </p>

                <button
                  type="button"
                  onClick={() =>
                    navigate("/workflows/new")
                  }
                  className="mt-4 text-[9px] text-[#168FFF]"
                >
                  Create your first workflow →
                </button>
              </div>
            ) : (
              <div className="divide-y divide-white/[0.05]">
                {recentWorkflows.map(
                  (workflow) => (
                    <div
                      key={workflow._id}
                      className="flex items-center gap-3 px-5 py-4"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          navigate(
                            `/workflows/${workflow._id}`
                          )
                        }
                        className="flex min-w-0 flex-1 items-center gap-3 text-left"
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/[0.07] bg-white/[0.02]">
                          <Zap
                            size={13}
                            className="text-zinc-600"
                          />
                        </div>

                        <div className="min-w-0">
                          <p className="truncate text-[10px] font-medium text-zinc-300">
                            {workflow.name ||
                              "Untitled Workflow"}
                          </p>

                          <p className="mt-1 text-[8px] text-zinc-700">
                            {workflow.nodes?.length ||
                              0}{" "}
                            nodes ·{" "}
                            {workflow.totalExecutions ||
                              0}{" "}
                            runs
                          </p>
                        </div>
                      </button>

                      <span
                        className={`hidden text-[8px] uppercase sm:block ${getStatusClasses(
                          workflow.status
                        )}`}
                      >
                        {workflow.status ||
                          "Draft"}
                      </span>

                      <button
                        type="button"
                        title="Run workflow"
                        disabled={
                          runningId ===
                          workflow._id
                        }
                        onClick={() =>
                          handleRun(
                            workflow._id
                          )
                        }
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-white/[0.07] text-zinc-600 transition hover:border-[#168FFF]/25 hover:bg-[#168FFF]/10 hover:text-[#168FFF] disabled:opacity-40"
                      >
                        {runningId ===
                        workflow._id ? (
                          <Loader2
                            size={12}
                            className="animate-spin"
                          />
                        ) : (
                          <Play
                            size={11}
                            fill="currentColor"
                          />
                        )}
                      </button>
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        </section>

        {/* Quick actions */}

        <section className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">

          <button
            type="button"
            onClick={() =>
              navigate("/workflows/new")
            }
            className="group rounded-xl border border-white/[0.07] bg-[#080A0E] p-5 text-left transition hover:border-[#168FFF]/20"
          >
            <Plus
              size={17}
              className="text-zinc-600 transition group-hover:text-[#168FFF]"
            />

            <p className="mt-4 text-[11px] font-medium text-zinc-300">
              Build Automation
            </p>

            <p className="mt-1 text-[9px] leading-5 text-zinc-700">
              Create a workflow from scratch.
            </p>
          </button>

          <button
            type="button"
            onClick={() =>
              navigate("/templates")
            }
            className="group rounded-xl border border-white/[0.07] bg-[#080A0E] p-5 text-left transition hover:border-[#168FFF]/20"
          >
            <SparklesIcon />

            <p className="mt-4 text-[11px] font-medium text-zinc-300">
              Use a Template
            </p>

            <p className="mt-1 text-[9px] leading-5 text-zinc-700">
              Start with a pre-built automation.
            </p>
          </button>

          <button
            type="button"
            onClick={() =>
              navigate("/integrations")
            }
            className="group rounded-xl border border-white/[0.07] bg-[#080A0E] p-5 text-left transition hover:border-[#168FFF]/20"
          >
            <Activity
              size={17}
              className="text-zinc-600 transition group-hover:text-[#168FFF]"
            />

            <p className="mt-4 text-[11px] font-medium text-zinc-300">
              Connect Services
            </p>

            <p className="mt-1 text-[9px] leading-5 text-zinc-700">
              Manage Gmail, Slack, CRM and more.
            </p>
          </button>

        </section>
      </div>
    </div>
  );
};

/*
 * Small separate icon component keeps the JSX above clean.
 */
const SparklesIcon = () => (
  <Sparkles
    size={17}
    className="text-zinc-600 transition group-hover:text-[#168FFF]"
  />
);

export default Dashboard;