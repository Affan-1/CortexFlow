import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  Bot,
  Loader2,
  Search,
  Workflow,
  X,
} from "lucide-react";
import api from "../services/api";

const SearchPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const initialQuery = searchParams.get("q") || "";

  const [query, setQuery] = useState(initialQuery);
  const [workflows, setWorkflows] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setQuery(searchParams.get("q") || "");
  }, [searchParams]);

  useEffect(() => {
    const loadWorkflows = async () => {
      try {
        setIsLoading(true);
        setError("");

        const response = await api.get("/workflows");

        setWorkflows(
          Array.isArray(response.data) ? response.data : []
        );
      } catch (err) {
        console.error("Search workflows error:", err);

        setError(
          err.response?.data?.message ||
            "Unable to load workflows."
        );
      } finally {
        setIsLoading(false);
      }
    };

    loadWorkflows();
  }, []);

  const results = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return workflows;
    }

    return workflows.filter((workflow) => {
      const searchableText = [
        workflow.name,
        workflow.description,
        workflow.status,
        workflow.trigger?.type,
        ...(Array.isArray(workflow.nodes)
          ? workflow.nodes.map(
              (node) =>
                `${node.data?.label || ""} ${node.data?.key || ""}`
            )
          : []),
      ]
        .join(" ")
        .toLowerCase();

      return searchableText.includes(normalizedQuery);
    });
  }, [query, workflows]);

  const handleSearch = (event) => {
    event.preventDefault();

    const value = query.trim();

    if (!value) {
      setSearchParams({});
      return;
    }

    setSearchParams({ q: value });
  };

  const clearSearch = () => {
    setQuery("");
    setSearchParams({});
  };

  const formatDate = (date) => {
    if (!date) return "Never";

    const parsed = new Date(date);

    if (Number.isNaN(parsed.getTime())) {
      return "Never";
    }

    return parsed.toLocaleDateString();
  };

  return (
    <div className="relative min-h-[calc(100vh-76px)] overflow-hidden bg-[#030303] text-white">

      {/* Background */}
      <div className="pointer-events-none absolute left-1/2 top-0 h-[320px] w-[650px] -translate-x-1/2 rounded-full bg-[#168FFF]/[0.035] blur-[120px]" />

      <div className="relative mx-auto w-full max-w-[1100px] px-5 py-8 sm:px-7 lg:px-8 lg:py-10">

        {/* Back */}
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mb-8 flex items-center gap-2 text-[10px] text-zinc-600 transition-colors hover:text-white"
        >
          <ArrowLeft size={14} />
          Back
        </button>

        {/* Header */}
        <div className="mb-7">
          <div className="mb-3 flex items-center gap-2">
            <span className="h-px w-5 bg-[#168FFF]" />

            <span className="text-[9px] font-medium uppercase tracking-[0.25em] text-[#168FFF]">
              Workspace Search
            </span>
          </div>

          <h1 className="text-2xl font-medium tracking-[-0.035em] sm:text-3xl">
            Search
          </h1>

          <p className="mt-2 text-xs leading-6 text-zinc-600">
            Find workflows by name, description, status, trigger, or node.
          </p>
        </div>

        {/* Search input */}
        <form
          onSubmit={handleSearch}
          className="mb-8 flex h-12 items-center gap-3 rounded-xl border border-white/[0.08] bg-[#080A0E] px-4 transition-colors focus-within:border-[#168FFF]/30"
        >
          <Search
            size={15}
            strokeWidth={1.7}
            className="shrink-0 text-zinc-600"
          />

          <input
            autoFocus
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search workflows..."
            className="min-w-0 flex-1 bg-transparent text-[11px] text-zinc-200 outline-none placeholder:text-zinc-700"
          />

          {query && (
            <button
              type="button"
              onClick={clearSearch}
              className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-600 transition hover:bg-white/[0.05] hover:text-zinc-300"
            >
              <X size={13} />
            </button>
          )}

          <button
            type="submit"
            className="rounded-lg bg-[#168FFF] px-3.5 py-2 text-[9px] font-semibold text-black transition hover:bg-[#38A8FF]"
          >
            Search
          </button>
        </form>

        {/* Loading */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center rounded-xl border border-white/[0.07] bg-[#080A0E] py-24">
            <Loader2
              size={22}
              className="animate-spin text-[#168FFF]"
            />

            <p className="mt-3 text-[10px] text-zinc-600">
              Searching your workspace...
            </p>
          </div>
        )}

        {/* Error */}
        {!isLoading && error && (
          <div className="rounded-xl border border-red-500/10 bg-red-500/[0.025] p-6">
            <p className="text-[11px] text-red-400">
              {error}
            </p>

            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-4 rounded-lg border border-white/[0.08] px-3 py-2 text-[9px] text-zinc-500 hover:text-white"
            >
              Try again
            </button>
          </div>
        )}

        {/* Results */}
        {!isLoading && !error && (
          <>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-[9px] uppercase tracking-[0.16em] text-zinc-700">
                  Results
                </p>

                <p className="mt-1 text-[11px] text-zinc-500">
                  {query.trim()
                    ? `${results.length} result${
                        results.length !== 1 ? "s" : ""
                      } for "${query.trim()}"`
                    : `${workflows.length} workflow${
                        workflows.length !== 1 ? "s" : ""
                      }`}
                </p>
              </div>
            </div>

            {results.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/[0.09] bg-[#080A0E] py-20 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.025]">
                  <Search
                    size={20}
                    strokeWidth={1.5}
                    className="text-zinc-600"
                  />
                </div>

                <p className="mt-4 text-[12px] font-medium text-zinc-300">
                  No workflows found
                </p>

                <p className="mt-1.5 max-w-xs text-[10px] leading-5 text-zinc-600">
                  Try another workflow name, trigger, or node type.
                </p>

                {query && (
                  <button
                    type="button"
                    onClick={clearSearch}
                    className="mt-5 rounded-lg border border-white/[0.08] px-4 py-2.5 text-[9px] text-zinc-500 transition hover:border-white/[0.15] hover:text-white"
                  >
                    Clear search
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {results.map((workflow) => (
                  <button
                    key={workflow._id}
                    type="button"
                    onClick={() =>
                      navigate(`/workflows/${workflow._id}`)
                    }
                    className="group flex w-full items-center gap-4 rounded-xl border border-white/[0.07] bg-[#080A0E] p-4 text-left transition-all duration-300 hover:border-[#168FFF]/25 hover:bg-[#0A0D12]"
                  >
                    {/* Icon */}
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/[0.07] bg-white/[0.025]">
                      {workflow.nodes?.length ? (
                        <Workflow
                          size={16}
                          strokeWidth={1.6}
                          className="text-zinc-500 transition-colors group-hover:text-[#168FFF]"
                        />
                      ) : (
                        <Bot
                          size={16}
                          strokeWidth={1.6}
                          className="text-zinc-500 transition-colors group-hover:text-[#168FFF]"
                        />
                      )}
                    </div>

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-[11px] font-medium text-zinc-200">
                          {workflow.name || "Untitled Workflow"}
                        </h3>

                        <span
                          className={`rounded border px-2 py-0.5 text-[8px] uppercase ${
                            workflow.status === "Active"
                              ? "border-[#168FFF]/20 bg-[#168FFF]/10 text-[#168FFF]"
                              : workflow.status === "Paused"
                                ? "border-white/10 bg-white/[0.03] text-zinc-500"
                                : "border-white/10 bg-white/[0.02] text-zinc-600"
                          }`}
                        >
                          {workflow.status || "Draft"}
                        </span>
                      </div>

                      <p className="mt-1.5 line-clamp-1 text-[9px] text-zinc-600">
                        {workflow.description ||
                          "No description available."}
                      </p>

                      <div className="mt-2 flex flex-wrap items-center gap-3 text-[8px] text-zinc-700">
                        <span>
                          Trigger:{" "}
                          {workflow.trigger?.type || "manual"}
                        </span>

                        <span>
                          Nodes: {workflow.nodes?.length || 0}
                        </span>

                        <span>
                          Runs: {workflow.totalExecutions || 0}
                        </span>

                        <span>
                          Updated: {formatDate(workflow.updatedAt)}
                        </span>
                      </div>
                    </div>

                    {/* Arrow */}
                    <div className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-md border border-white/[0.06] text-zinc-700 transition group-hover:border-[#168FFF]/20 group-hover:text-[#168FFF] sm:flex">
                      →
                    </div>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default SearchPage;