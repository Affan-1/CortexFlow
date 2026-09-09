import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Copy,
  FileText,
  Loader2,
  RefreshCw,
  XCircle,
  Zap,
} from "lucide-react";
import api from "../services/api";

const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString();
};

const formatDuration = (execution) => {
  if (execution?.duration != null) {
    return `${execution.duration} ms`;
  }

  if (execution?.startedAt && execution?.completedAt) {
    const duration =
      new Date(execution.completedAt).getTime() -
      new Date(execution.startedAt).getTime();

    return `${Math.max(duration, 0)} ms`;
  }

  return "—";
};

const getStatusClasses = (status) => {
  switch (String(status || "").toLowerCase()) {
    case "success":
      return "border-emerald-500/20 bg-emerald-500/10 text-emerald-400";

    case "failed":
      return "border-red-500/20 bg-red-500/10 text-red-400";

    case "running":
      return "border-[#168FFF]/20 bg-[#168FFF]/10 text-[#168FFF]";

    case "queued":
    case "pending":
      return "border-yellow-500/20 bg-yellow-500/10 text-yellow-400";

    case "cancelled":
      return "border-zinc-500/20 bg-zinc-500/10 text-zinc-400";

    default:
      return "border-white/10 bg-white/[0.03] text-zinc-400";
  }
};

const StatusIcon = ({ status }) => {
  switch (String(status || "").toLowerCase()) {
    case "success":
      return <CheckCircle2 size={15} />;

    case "failed":
      return <XCircle size={15} />;

    case "running":
    case "queued":
    case "pending":
      return <Loader2 size={15} className="animate-spin" />;

    default:
      return <Clock3 size={15} />;
  }
};

const ExecutionDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [execution, setExecution] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const fetchExecution = async (showLoader = true) => {
    try {
      if (showLoader) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      setError("");

      const response = await api.get(`/executions/${id}`);

      setExecution(response.data);
    } catch (err) {
      console.error("Failed to load execution:", err);

      setError(
        err.response?.data?.message ||
          "Unable to load this execution."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!id) {
      setError("Execution ID is missing.");
      setLoading(false);
      return;
    }

    fetchExecution(true);
  }, [id]);

  const copyExecutionId = async () => {
    try {
      await navigator.clipboard.writeText(execution?._id || id);
    } catch (err) {
      console.error("Copy failed:", err);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-76px)] items-center justify-center bg-[#030303]">
        <div className="flex flex-col items-center">
          <Loader2
            size={24}
            className="animate-spin text-[#168FFF]"
          />

          <p className="mt-3 text-[10px] text-zinc-600">
            Loading execution...
          </p>
        </div>
      </div>
    );
  }

  if (error || !execution) {
    return (
      <div className="min-h-[calc(100vh-76px)] bg-[#030303] px-5 py-8">
        <div className="mx-auto max-w-[1200px]">
          <button
            type="button"
            onClick={() => navigate("/executions")}
            className="mb-8 flex items-center gap-2 text-[10px] text-zinc-500 transition-colors hover:text-white"
          >
            <ArrowLeft size={14} />
            Back to executions
          </button>

          <div className="rounded-xl border border-red-500/10 bg-[#080A0E] p-8 text-center">
            <XCircle
              size={28}
              className="mx-auto text-red-400"
            />

            <h2 className="mt-4 text-sm font-medium text-white">
              Execution could not be loaded
            </h2>

            <p className="mx-auto mt-2 max-w-md text-[10px] leading-5 text-zinc-600">
              {error || "The requested execution does not exist."}
            </p>

            <button
              type="button"
              onClick={() => fetchExecution(true)}
              className="mt-6 rounded-lg border border-white/10 px-4 py-2 text-[10px] text-zinc-400 transition hover:border-white/20 hover:text-white"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  const workflowName =
    typeof execution.workflow === "object"
      ? execution.workflow?.name
      : "Unknown workflow";

  const results = Array.isArray(execution.results)
    ? execution.results
    : [];

  const status = execution.status || "unknown";

  return (
    <div className="relative min-h-[calc(100vh-76px)] overflow-hidden bg-[#030303]">
      <div className="pointer-events-none absolute left-1/2 top-0 h-[300px] w-[600px] -translate-x-1/2 rounded-full bg-[#168FFF]/[0.035] blur-[120px]" />

      <div className="relative mx-auto w-full max-w-[1500px] px-5 py-7 sm:px-7 lg:px-8 lg:py-9">

        {/* Header */}
        <div className="mb-7 flex flex-col justify-between gap-5 md:flex-row md:items-start">
          <div>
            <button
              type="button"
              onClick={() => navigate("/executions")}
              className="mb-5 flex items-center gap-2 text-[10px] text-zinc-600 transition-colors hover:text-white"
            >
              <ArrowLeft size={14} />
              Back to executions
            </button>

            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/[0.07] bg-white/[0.025]">
                <Zap
                  size={17}
                  className="text-[#168FFF]"
                />
              </div>

              <div>
                <p className="text-[9px] uppercase tracking-[0.16em] text-zinc-600">
                  Execution
                </p>

                <h1 className="mt-1 text-xl font-medium tracking-[-0.03em] text-white">
                  {workflowName}
                </h1>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fetchExecution(false)}
              disabled={refreshing}
              className="flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-2 text-[9px] text-zinc-500 transition hover:border-white/[0.15] hover:text-white disabled:opacity-50"
            >
              <RefreshCw
                size={12}
                className={refreshing ? "animate-spin" : ""}
              />

              Refresh
            </button>
          </div>
        </div>

        {/* Overview */}
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">

          <div className="rounded-xl border border-white/[0.07] bg-[#080A0E] p-5">
            <p className="text-[9px] uppercase tracking-[0.14em] text-zinc-700">
              Status
            </p>

            <div
              className={`mt-4 inline-flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-[9px] uppercase tracking-[0.08em] ${getStatusClasses(
                status
              )}`}
            >
              <StatusIcon status={status} />
              {status}
            </div>
          </div>

          <div className="rounded-xl border border-white/[0.07] bg-[#080A0E] p-5">
            <p className="text-[9px] uppercase tracking-[0.14em] text-zinc-700">
              Trigger
            </p>

            <p className="mt-4 text-sm capitalize text-zinc-300">
              {execution.triggerType || "manual"}
            </p>
          </div>

          <div className="rounded-xl border border-white/[0.07] bg-[#080A0E] p-5">
            <p className="text-[9px] uppercase tracking-[0.14em] text-zinc-700">
              Duration
            </p>

            <p className="mt-4 text-sm text-zinc-300">
              {formatDuration(execution)}
            </p>
          </div>

          <div className="rounded-xl border border-white/[0.07] bg-[#080A0E] p-5">
            <p className="text-[9px] uppercase tracking-[0.14em] text-zinc-700">
              Started
            </p>

            <p className="mt-4 text-[10px] text-zinc-400">
              {formatDate(execution.startedAt || execution.createdAt)}
            </p>
          </div>
        </section>

        {/* Execution ID */}
        <section className="mt-3 rounded-xl border border-white/[0.07] bg-[#080A0E] p-5">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <p className="text-[9px] uppercase tracking-[0.14em] text-zinc-700">
                Execution ID
              </p>

              <p className="mt-2 break-all font-mono text-[10px] text-zinc-500">
                {execution._id || id}
              </p>
            </div>

            <button
              type="button"
              onClick={copyExecutionId}
              className="flex w-fit items-center gap-2 rounded-md border border-white/[0.07] px-3 py-2 text-[9px] text-zinc-500 transition hover:border-white/[0.15] hover:text-white"
            >
              <Copy size={12} />
              Copy ID
            </button>
          </div>
        </section>

        {/* Error */}
        {execution.error && (
          <section className="mt-3 rounded-xl border border-red-500/10 bg-red-500/[0.025] p-5">
            <div className="flex gap-3">
              <XCircle
                size={16}
                className="mt-0.5 shrink-0 text-red-400"
              />

              <div>
                <p className="text-[10px] font-medium text-red-400">
                  Execution Error
                </p>

                <p className="mt-2 whitespace-pre-wrap text-[10px] leading-5 text-zinc-500">
                  {execution.error}
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Node Results */}
        <section className="mt-3 rounded-xl border border-white/[0.07] bg-[#080A0E]">
          <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-5">
            <div>
              <p className="text-[9px] uppercase tracking-[0.14em] text-zinc-700">
                Execution Trace
              </p>

              <h2 className="mt-1.5 text-sm font-medium text-white">
                Node results
              </h2>
            </div>

            <span className="text-[9px] text-zinc-700">
              {results.length} node{results.length !== 1 ? "s" : ""}
            </span>
          </div>

          {results.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <FileText
                size={22}
                className="text-zinc-700"
              />

              <p className="mt-3 text-[10px] text-zinc-600">
                No node results yet.
              </p>

              <p className="mt-1 text-[9px] text-zinc-800">
                The execution may still be queued.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.05]">
              {results.map((result, index) => {
                const resultStatus = result.status || "pending";

                return (
                  <div
                    key={
                      result.nodeId ||
                      `${result.nodeKey || "node"}-${index}`
                    }
                    className="p-5"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start">

                      <div className="flex min-w-0 flex-1 gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/[0.07] bg-white/[0.02] text-[9px] text-zinc-600">
                          {index + 1}
                        </div>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-[10px] font-medium text-zinc-200">
                              {result.label ||
                                result.nodeKey ||
                                result.nodeId ||
                                `Node ${index + 1}`}
                            </h3>

                            <span
                              className={`rounded border px-2 py-0.5 text-[8px] uppercase ${getStatusClasses(
                                resultStatus
                              )}`}
                            >
                              {resultStatus}
                            </span>
                          </div>

                          <p className="mt-1 text-[8px] text-zinc-700">
                            {result.kind || result.nodeType || "workflow node"}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:w-[360px]">
                        <div>
                          <p className="text-[8px] uppercase tracking-[0.1em] text-zinc-800">
                            Attempts
                          </p>

                          <p className="mt-1 text-[9px] text-zinc-500">
                            {result.attempts ?? 0}
                          </p>
                        </div>

                        <div>
                          <p className="text-[8px] uppercase tracking-[0.1em] text-zinc-800">
                            Duration
                          </p>

                          <p className="mt-1 text-[9px] text-zinc-500">
                            {result.duration != null
                              ? `${result.duration} ms`
                              : "—"}
                          </p>
                        </div>

                        <div>
                          <p className="text-[8px] uppercase tracking-[0.1em] text-zinc-800">
                            Branch
                          </p>

                          <p className="mt-1 text-[9px] text-zinc-500">
                            {result.branch || "—"}
                          </p>
                        </div>
                      </div>
                    </div>

                    {(result.input != null ||
                      result.output != null ||
                      result.error) && (
                      <div className="mt-5 grid grid-cols-1 gap-3 lg:grid-cols-2">

                        <div className="rounded-lg border border-white/[0.05] bg-black/20 p-4">
                          <p className="mb-2 text-[8px] uppercase tracking-[0.12em] text-zinc-700">
                            Input
                          </p>

                          <pre className="max-h-[260px] overflow-auto whitespace-pre-wrap break-words font-mono text-[9px] leading-5 text-zinc-500">
                            {JSON.stringify(
                              result.input ?? {},
                              null,
                              2
                            )}
                          </pre>
                        </div>

                        <div className="rounded-lg border border-white/[0.05] bg-black/20 p-4">
                          <p className="mb-2 text-[8px] uppercase tracking-[0.12em] text-zinc-700">
                            Output
                          </p>

                          <pre className="max-h-[260px] overflow-auto whitespace-pre-wrap break-words font-mono text-[9px] leading-5 text-zinc-500">
                            {JSON.stringify(
                              result.output ?? {},
                              null,
                              2
                            )}
                          </pre>
                        </div>
                      </div>
                    )}

                    {result.error && (
                      <div className="mt-3 rounded-lg border border-red-500/10 bg-red-500/[0.025] p-3">
                        <p className="text-[9px] leading-5 text-red-400">
                          {result.error}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Raw JSON */}
        <section className="mt-3 rounded-xl border border-white/[0.07] bg-[#080A0E]">
          <details>
            <summary className="cursor-pointer px-5 py-5 text-[9px] uppercase tracking-[0.14em] text-zinc-600 hover:text-zinc-300">
              Raw execution data
            </summary>

            <div className="border-t border-white/[0.05] p-5">
              <pre className="max-h-[500px] overflow-auto whitespace-pre-wrap break-words rounded-lg border border-white/[0.05] bg-black/30 p-4 font-mono text-[9px] leading-5 text-zinc-600">
                {JSON.stringify(execution, null, 2)}
              </pre>
            </div>
          </details>
        </section>
      </div>
    </div>
  );
};

export default ExecutionDetail;