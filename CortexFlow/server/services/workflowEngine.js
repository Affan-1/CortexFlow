const Workflow = require("../models/Workflow");
const { executeAINode } = require("./ai/aiService");
const { executeActionNode } = require("./integrations");
const { executeLogicNode } = require("./logicService");

/*
|--------------------------------------------------------------------------
| Workflow Engine
|--------------------------------------------------------------------------
|
| Walks a workflow's node graph starting from its trigger node(s),
| executing each node in turn and following ONLY the edges that
| match the branch a node actually produced (for Condition and
| Decision nodes). Nodes that are never reached because their
| branch wasn't taken are recorded as "skipped" so execution
| history shows the full picture, e.g.:
|
|   Trigger -> AI Classifier -> Decision -[yes]-> Send Email
|                                        \-[no]--> Stop (skipped)
|
| Every node executor (trigger/ai/logic/action) is a plain async
| function that receives the accumulated `context` and returns a
| plain result object; the engine handles ordering, retries,
| timeouts, and persistence-shaped result recording.
|
*/

const DEFAULT_NODE_TIMEOUT_MS = 30_000;
const DEFAULT_RETRY_ATTEMPTS = 1;
const DEFAULT_RETRY_DELAY_MS = 1000;

/*
|--------------------------------------------------------------------------
| Graph helpers
|--------------------------------------------------------------------------
*/

const buildGraph = (nodes, edges) => {
  const nodesById = new Map(nodes.map((node) => [node.id, node]));

  const outgoingByNode = new Map(nodes.map((node) => [node.id, []]));
  const hasIncoming = new Set();

  edges.forEach((edge) => {
    if (!outgoingByNode.has(edge.source) || !nodesById.has(edge.target)) return;

    outgoingByNode.get(edge.source).push(edge);
    hasIncoming.add(edge.target);
  });

  return { nodesById, outgoingByNode, hasIncoming };
};

const findStartNodes = (nodes, hasIncoming) => {
  const triggerNodes = nodes.filter((node) => node.data?.kind === "trigger");

  if (triggerNodes.length) return triggerNodes;

  // Fallback: any node with no incoming edge (workflow without an
  // explicit trigger node, e.g. built ad hoc for testing).
  return nodes.filter((node) => !hasIncoming.has(node.id));
};

/*
|--------------------------------------------------------------------------
| Node Executors
|--------------------------------------------------------------------------
*/

const executeTriggerNode = async (node, context) => ({
  subtype: node.data?.key || "manual",
  triggeredAt: new Date().toISOString(),
  payload: context.__initialInput || {},
});

const NODE_EXECUTORS = {
  trigger: executeTriggerNode,
  ai: (node, context) => executeAINode(node, context),
  logic: (node, context) => executeLogicNode(node, context),
  // action needs ownerId for credential lookup, wired in via closure below
};

const withTimeout = (promise, ms, label) =>
  Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error(`${label} timed out after ${ms}ms.`)),
        ms
      )
    ),
  ]);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/*
 * Runs a single node with retry + timeout handling. Returns
 * { output, attempts } on success or throws the last error.
 */
const runNodeWithRetry = async (node, context, { ownerId }) => {
  const config = node.data?.config || {};
  const kind = node.data?.kind || "action";

  const maxAttempts = Math.max(
    1,
    Number(config.retry?.attempts) || DEFAULT_RETRY_ATTEMPTS
  );
  const retryDelayMs = Number(config.retry?.delayMs) || DEFAULT_RETRY_DELAY_MS;
  const timeoutMs = Number(config.timeoutMs) || DEFAULT_NODE_TIMEOUT_MS;

  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const executor =
        kind === "action"
          ? (n, c) => executeActionNode(n, c, { ownerId })
          : NODE_EXECUTORS[kind] || NODE_EXECUTORS.logic;

      const output = await withTimeout(
        executor(node, context),
        timeoutMs,
        node.data?.label || node.id
      );

      return { output, attempts: attempt };
    } catch (error) {
      lastError = error;

      if (attempt < maxAttempts) {
        await sleep(retryDelayMs);
      }
    }
  }

  throw lastError;
};

/*
|--------------------------------------------------------------------------
| Execute Workflow
|--------------------------------------------------------------------------
*/

const executeWorkflow = async ({
  workflowId,
  ownerId,
  input = {},
  onNodeStart = () => {},
  onNodeComplete = () => {},
}) => {
  const workflow = await Workflow.findOne({ _id: workflowId, owner: ownerId });

  if (!workflow) {
    throw new Error("Workflow not found.");
  }

  if (!workflow.nodes || workflow.nodes.length === 0) {
    throw new Error("Cannot execute an empty workflow.");
  }

  const nodes = workflow.nodes;
  const edges = workflow.edges || [];

  const { nodesById, outgoingByNode, hasIncoming } = buildGraph(nodes, edges);
  const startNodes = findStartNodes(nodes, hasIncoming);

  if (!startNodes.length) {
    throw new Error(
      "Workflow has no trigger node and no clear starting point."
    );
  }

  // Shared, mutable context object threaded through every node.
  // Each node's result is stored both under its kind (for simple
  // "{{ai.response}}"-style templating pointing at the most recent
  // node of that kind) and under context.nodes[nodeId] (for
  // precise, unambiguous references).
  const context = {
    __initialInput: input,
    trigger: {},
    ai: {},
    logic: {},
    action: {},
    nodes: {},
  };

  const results = [];
  const visited = new Set();
  const queue = [...startNodes];
  let order = 0;
  let failure = null;

  while (queue.length && !failure) {
    const node = queue.shift();

    if (visited.has(node.id)) continue;
    visited.add(node.id);

    order += 1;
    const startedAt = new Date();

    onNodeStart({ node, order });

    try {
      const { output, attempts } = await runNodeWithRetry(node, context, {
        ownerId,
      });

      const completedAt = new Date();

      // Thread the result into shared context.
      const kind = node.data?.kind || "action";
      context[kind] = output;
      context.nodes[node.id] = output;

      const resultRecord = {
        nodeId: node.id,
        nodeType: node.type || "custom",
        kind,
        key: node.data?.key || "",
        label: node.data?.label || "Untitled Node",
        status: "success",
        branch: output?.branch ?? null,
        order,
        startedAt,
        completedAt,
        duration: completedAt - startedAt,
        attempts,
        input: { context: Object.keys(context.nodes) },
        output,
      };

      results.push(resultRecord);
      onNodeComplete(resultRecord);

      // Decide which outgoing edges to follow. If this node
      // produced a `branch`, only edges tagged with that branch
      // (or with no branch tag at all) are followed; everything
      // else hanging off this node is later marked "skipped".
      const outgoing = outgoingByNode.get(node.id) || [];

      outgoing.forEach((edge) => {
        const edgeBranch = edge.branch || edge.sourceHandle || null;
        const matchesBranch =
          !output?.branch || !edgeBranch || edgeBranch === output.branch;

        const targetNode = nodesById.get(edge.target);

        if (targetNode && matchesBranch && !visited.has(targetNode.id)) {
          queue.push(targetNode);
        }
      });
    } catch (error) {
      const completedAt = new Date();

      const resultRecord = {
        nodeId: node.id,
        nodeType: node.type || "custom",
        kind: node.data?.kind || "action",
        key: node.data?.key || "",
        label: node.data?.label || "Untitled Node",
        status: "failed",
        branch: null,
        order,
        startedAt,
        completedAt,
        duration: completedAt - startedAt,
        attempts: Number(node.data?.config?.retry?.attempts) || 1,
        input: { context: Object.keys(context.nodes) },
        output: {},
        error: error.message,
      };

      results.push(resultRecord);
      onNodeComplete(resultRecord);

      failure = error;
    }
  }

  // Anything never visited (because its branch wasn't taken, or it
  // was simply unreachable from any start node) is recorded as
  // skipped so execution history shows the full workflow shape.
  nodes.forEach((node) => {
    if (visited.has(node.id)) return;

    order += 1;

    const resultRecord = {
      nodeId: node.id,
      nodeType: node.type || "custom",
      kind: node.data?.kind || "action",
      key: node.data?.key || "",
      label: node.data?.label || "Untitled Node",
      status: "skipped",
      branch: null,
      order,
      startedAt: null,
      completedAt: null,
      duration: 0,
      attempts: 0,
      input: {},
      output: {},
      error: null,
    };

    results.push(resultRecord);
    onNodeComplete(resultRecord);
  });

  if (failure) {
    const error = new Error(failure.message);
    error.results = results;
    error.output = context;
    throw error;
  }

  return { workflow, results, output: context };
};

module.exports = {
  executeWorkflow,
  buildGraph,
  findStartNodes,
};
