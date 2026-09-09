import React, { useCallback, useEffect, useState } from "react";
import {
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";

import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
  addEdge,
  useNodesState,
  useEdgesState,
  useReactFlow,
} from "@xyflow/react";

import "@xyflow/react/dist/style.css";

import NodeConfigPanel from "../components/NodeConfigPanel";

import {
  getWorkflowById,
  createWorkflow,
  updateWorkflow,
  runWorkflow,
} from "../services/workflowService";

import {
  ArrowLeft,
  Sparkles,
  Webhook,
  Clock,
  FileInput,
  Bot,
  ScanSearch,
  PenLine,
  GitBranch,
  Filter as FilterIcon,
  Timer,
  Mail,
  MessageSquare,
  Database,
  Send,
  Bell,
  Play,
  Save,
  Loader2,
  Check,
  Rocket,
  Pause,
} from "lucide-react";

/* -------------------------------------------------------------------------- */
/* NODE PALETTE                                                               */
/* -------------------------------------------------------------------------- */

const nodeGroups = [
  {
    label: "Triggers",
    kind: "trigger",
    items: [
      {
        name: "Webhook",
        key: "webhook",
        icon: Webhook,
      },
      {
        name: "Schedule",
        key: "schedule",
        icon: Clock,
      },
      {
        name: "New Lead",
        key: "newLead",
        icon: FileInput,
      },
      {
        name: "Form Submission",
        key: "formSubmission",
        icon: FileInput,
      },
    ],
  },
  {
    label: "AI",
    kind: "ai",
    items: [
      {
        name: "AI Agent",
        key: "aiAgent",
        icon: Bot,
      },
      {
        name: "AI Classifier",
        key: "aiClassifier",
        icon: ScanSearch,
      },
      {
        name: "AI Extractor",
        key: "aiExtractor",
        icon: ScanSearch,
      },
      {
        name: "AI Generator",
        key: "aiGenerator",
        icon: PenLine,
      },
      {
        name: "AI Decision",
        key: "aiDecision",
        icon: GitBranch,
      },
    ],
  },
  {
    label: "Logic",
    kind: "logic",
    items: [
      {
        name: "Condition",
        key: "condition",
        icon: GitBranch,
      },
      {
        name: "Filter",
        key: "filter",
        icon: FilterIcon,
      },
      {
        name: "Delay",
        key: "delay",
        icon: Timer,
      },
    ],
  },
  {
    label: "Actions",
    kind: "action",
    items: [
      {
        name: "Send Email",
        key: "sendEmail",
        icon: Mail,
      },
      {
        name: "Slack Message",
        key: "slackMessage",
        icon: MessageSquare,
      },
      {
        name: "Discord Message",
        key: "discordMessage",
        icon: MessageSquare,
      },
      {
        name: "Google Sheets Row",
        key: "googleSheetsAppend",
        icon: Database,
      },
      {
        name: "Notion Page",
        key: "notionCreatePage",
        icon: Database,
      },
      {
        name: "CRM Record",
        key: "hubspotUpsert",
        icon: Database,
      },
      {
        name: "Webhook",
        key: "webhookCall",
        icon: Send,
      },
      {
        name: "Notification",
        key: "notification",
        icon: Bell,
      },
    ],
  },
];

const iconMap = nodeGroups
  .flatMap((group) =>
    group.items.map((item) => ({
      ...item,
      kind: group.kind,
    }))
  )
  .reduce((map, item) => {
    map[item.key] = item;
    return map;
  }, {});

const kindLabel = {
  trigger: "Trigger",
  ai: "AI",
  logic: "Logic",
  action: "Action",
};

/* -------------------------------------------------------------------------- */
/* DEFAULT NODE                                                               */
/* -------------------------------------------------------------------------- */

const defaultNodes = [
  {
    id: "start",
    type: "custom",
    position: {
      x: 100,
      y: 220,
    },
    data: {
      label: "New Lead",
      icon: FileInput,
      kind: "trigger",
      key: "newLead",
      config: {
        eventName: "lead.created",
      },
    },
  },
];

let idCounter = 1;

const getNodeId = () => {
  return `node-${Date.now()}-${idCounter++}`;
};

/* -------------------------------------------------------------------------- */
/* CUSTOM NODE                                                                */
/* -------------------------------------------------------------------------- */

const CustomNode = ({ data }) => {
  const Icon = data?.icon || Sparkles;

  const isTrigger = data?.kind === "trigger";

  const isBranchNode =
    data?.key === "condition" ||
    data?.key === "aiDecision";

  return (
    <div className="relative min-w-[190px] rounded-xl border border-white/[0.09] bg-[#0A0D12] px-4 py-3 shadow-lg shadow-black/40">
      {!isTrigger && (
        <Handle
          type="target"
          position={Position.Left}
          className="!h-2.5 !w-2.5 !border-2 !border-[#168FFF] !bg-[#0A0D12]"
        />
      )}

      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#168FFF]/25 bg-[#168FFF]/10">
          <Icon
            size={15}
            strokeWidth={1.7}
            className="text-[#168FFF]"
          />
        </div>

        <div className="min-w-0">
          <p className="truncate text-[11px] font-medium text-zinc-100">
            {data?.label || "Untitled Node"}
          </p>

          <p className="text-[8px] uppercase tracking-[0.14em] text-zinc-600">
            {kindLabel[data?.kind] || "Node"}
          </p>
        </div>
      </div>

      {isBranchNode ? (
        <>
          <Handle
            type="source"
            position={Position.Right}
            id="yes"
            style={{ top: "38%" }}
            className="!h-2.5 !w-2.5 !border-2 !border-emerald-400 !bg-[#0A0D12]"
          />

          <span className="absolute -right-10 top-[31%] text-[7px] uppercase tracking-wider text-emerald-400">
            yes
          </span>

          <Handle
            type="source"
            position={Position.Right}
            id="no"
            style={{ top: "68%" }}
            className="!h-2.5 !w-2.5 !border-2 !border-red-400 !bg-[#0A0D12]"
          />

          <span className="absolute -right-10 top-[61%] text-[7px] uppercase tracking-wider text-red-400">
            no
          </span>
        </>
      ) : (
        <Handle
          type="source"
          position={Position.Right}
          className="!h-2.5 !w-2.5 !border-2 !border-[#168FFF] !bg-[#0A0D12]"
        />
      )}
    </div>
  );
};

const nodeTypes = {
  custom: CustomNode,
};

/* -------------------------------------------------------------------------- */
/* WEBHOOK HELPERS                                                            */
/* -------------------------------------------------------------------------- */

const getWebhookUrl = (token) => {
  if (!token) {
    return "";
  }

  const configuredApiUrl =
    import.meta.env.VITE_API_URL ||
    "http://localhost:5000/api";

  const cleanBase = configuredApiUrl.replace(/\/+$/, "");

  if (cleanBase.endsWith("/api")) {
    return `${cleanBase}/webhooks/${token}`;
  }

  return `${cleanBase}/api/webhooks/${token}`;
};

const mergeWebhookTriggerIntoNodes = (
  workflow,
  currentNodes
) => {
  if (
    workflow?.trigger?.type !== "webhook" ||
    !workflow.trigger?.webhook
  ) {
    return currentNodes;
  }

  const webhook = workflow.trigger.webhook;

  return currentNodes.map((node) => {
    if (node.data?.key !== "webhook") {
      return node;
    }

    return {
      ...node,
      data: {
        ...node.data,
        config: {
          ...(node.data?.config || {}),
          token: webhook.token || "",
          secret: webhook.secret || "",
          url: getWebhookUrl(webhook.token),
        },
      },
    };
  });
};

/* -------------------------------------------------------------------------- */
/* FLOW CANVAS                                                                */
/* -------------------------------------------------------------------------- */

const FlowCanvas = ({
  nodes,
  setNodes,
  onNodesChange,
  edges,
  setEdges,
  onEdgesChange,
}) => {
  const [selectedNodeId, setSelectedNodeId] = useState(null);

  const { screenToFlowPosition } = useReactFlow();

  const selectedNode =
    nodes.find((node) => node.id === selectedNodeId) || null;

  const onNodeClick = useCallback((event, node) => {
    setSelectedNodeId(node.id);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, []);

  const handleNodeUpdate = useCallback(
    (nodeId, newData) => {
      setNodes((currentNodes) =>
        currentNodes.map((node) =>
          node.id === nodeId
            ? {
              ...node,
              data: {
                ...node.data,
                ...newData,
              },
            }
            : node
        )
      );
    },
    [setNodes]
  );

  const handleNodeDelete = useCallback(
    (nodeId) => {
      setNodes((currentNodes) =>
        currentNodes.filter((node) => node.id !== nodeId)
      );

      setEdges((currentEdges) =>
        currentEdges.filter(
          (edge) =>
            edge.source !== nodeId &&
            edge.target !== nodeId
        )
      );

      setSelectedNodeId(null);
    },
    [setNodes, setEdges]
  );

  const onConnect = useCallback(
    (connection) => {
      if (!connection.source || !connection.target) {
        return;
      }

      if (connection.source === connection.target) {
        return;
      }

      const branch =
        connection.sourceHandle === "yes" ||
          connection.sourceHandle === "no"
          ? connection.sourceHandle
          : null;

      const edge = {
        ...connection,
        id: `edge-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 8)}`,
        branch,
        label: branch ? branch.toUpperCase() : "",
        animated: true,
        style: {
          stroke:
            branch === "yes"
              ? "#22c55e"
              : branch === "no"
                ? "#ef4444"
                : "#168FFF",
          strokeWidth: 1.5,
        },
      };

      setEdges((currentEdges) =>
        addEdge(edge, currentEdges)
      );
    },
    [setEdges]
  );

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event) => {
      event.preventDefault();

      const key = event.dataTransfer.getData(
        "application/cortexflow-node"
      );

      if (!key) {
        return;
      }

      const nodeInfo = iconMap[key];

      if (!nodeInfo) {
        return;
      }

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode = {
        id: getNodeId(),
        type: "custom",
        position,
        data: {
          label: nodeInfo.name,
          icon: nodeInfo.icon,
          kind: nodeInfo.kind,
          key: nodeInfo.key,
          config: {},
        },
      };

      setNodes((currentNodes) => [
        ...currentNodes,
        newNode,
      ]);

      setSelectedNodeId(newNode.id);
    },
    [screenToFlowPosition, setNodes]
  );

  return (
    <div
      className="relative h-full w-full"
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        fitView
        proOptions={{
          hideAttribution: true,
        }}
        defaultEdgeOptions={{
          animated: true,
          style: {
            stroke: "#168FFF",
            strokeWidth: 1.5,
          },
        }}
        style={{
          "--xy-background-color": "#030303",
          "--xy-edge-stroke-default": "#168FFF",
          "--xy-controls-button-background-color": "#080A0E",
          "--xy-controls-button-background-color-hover":
            "#0f1319",
          "--xy-controls-button-color": "#a1a1aa",
          "--xy-controls-button-color-hover": "#ffffff",
          "--xy-controls-button-border-color":
            "rgba(255,255,255,0.07)",
          "--xy-minimap-background-color": "#050609",
          "--xy-minimap-mask-background-color":
            "rgba(3,3,3,0.6)",
        }}
      >
        <Background
          color="rgba(255,255,255,0.06)"
          gap={26}
          size={1}
        />

        <Controls showInteractive={false} />

        <MiniMap
          pannable
          zoomable
          nodeColor="#168FFF"
          maskColor="rgba(3,3,3,0.65)"
        />
      </ReactFlow>

      <NodeConfigPanel
        node={selectedNode}
        onClose={() => setSelectedNodeId(null)}
        onUpdate={handleNodeUpdate}
        onDelete={handleNodeDelete}
      />
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* WORKFLOW BUILDER                                                           */
/* -------------------------------------------------------------------------- */

const WorkflowBuilder = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();

  const [workflowId, setWorkflowId] = useState(id || null);

  const [workflowName, setWorkflowName] = useState(
    "Untitled Workflow"
  );

  const [nodes, setNodes, onNodesChange] =
    useNodesState(defaultNodes);

  const [edges, setEdges, onEdgesChange] =
    useEdgesState([]);

  const [workflowStatus, setWorkflowStatus] =
    useState("Draft");

  const [isLoadingWorkflow, setIsLoadingWorkflow] =
    useState(Boolean(id));

  const [isSaving, setIsSaving] = useState(false);

  const [isRunning, setIsRunning] = useState(false);

  const [isPublishing, setIsPublishing] =
    useState(false);

  const [feedback, setFeedback] = useState("");

    /* ---------------------------------------------------------------------- */
  /* LOAD TEMPLATE                                                          */
  /* ---------------------------------------------------------------------- */

  useEffect(() => {
    // Existing saved workflow open ho raha ho to template load nahi karna.
    if (id) {
      return;
    }

    const template = location.state?.template;

    // Normal "New Workflow" button se aaye hain.
    if (!template) {
      return;
    }

    const templateNodes = Array.isArray(template.nodes)
      ? template.nodes.map((node) => {
          const nodeInfo = iconMap[node.data?.key];

          return {
            ...node,

            type: node.type || "custom",

            position: {
              x: Number(node.position?.x || 0),
              y: Number(node.position?.y || 0),
            },

            data: {
              ...(node.data || {}),

              label:
                node.data?.label ||
                nodeInfo?.name ||
                "Untitled Node",

              kind:
                node.data?.kind ||
                nodeInfo?.kind ||
                "action",

              key:
                node.data?.key ||
                "notification",

              icon:
                nodeInfo?.icon ||
                Sparkles,

              config: {
                ...(node.data?.config || {}),
              },
            },
          };
        })
      : [];

    const templateEdges = Array.isArray(template.edges)
      ? template.edges.map((edge) => {
          const branch =
            edge.branch ||
            edge.sourceHandle ||
            null;

          return {
            ...edge,

            sourceHandle:
              edge.sourceHandle || null,

            targetHandle:
              edge.targetHandle || null,

            branch,

            label:
              edge.label ||
              (branch
                ? branch.toUpperCase()
                : ""),

            animated: true,

            style: {
              stroke:
                branch === "yes"
                  ? "#22c55e"
                  : branch === "no"
                    ? "#ef4444"
                    : "#168FFF",

              strokeWidth: 1.5,
            },
          };
        })
      : [];

    setWorkflowId(null);

    setWorkflowName(
      template.name
        ? `${template.name}`
        : "Untitled Workflow"
    );

    setWorkflowStatus("Draft");

    setNodes(
      templateNodes.length > 0
        ? templateNodes
        : defaultNodes
    );

    setEdges(templateEdges);

    setIsLoadingWorkflow(false);
  }, [
    id,
    location.state,
    setNodes,
    setEdges,
  ]);

  /* ---------------------------------------------------------------------- */
  /* LOAD WORKFLOW                                                          */
  /* ---------------------------------------------------------------------- */

  /* ---------------------------------------------------------------------- */
  /* LOAD WORKFLOW                                                          */
  /* ---------------------------------------------------------------------- */

  useEffect(() => {
    if (!id) {
      return;
    }

    let cancelled = false;

    const loadWorkflow = async () => {
      try {
        setIsLoadingWorkflow(true);

        const data = await getWorkflowById(id);

        if (cancelled) {
          return;
        }

        if (!data) {
          throw new Error("Workflow not found");
        }

        setWorkflowId(data._id || id);

        setWorkflowName(
          data.name || "Untitled Workflow"
        );

        setWorkflowStatus(
          data.status || "Draft"
        );

        const baseRestoredNodes = (
          data.nodes || []
        ).map((node) => ({
          ...node,
          type: node.type || "custom",
          data: {
            ...(node.data || {}),
            icon:
              iconMap[node.data?.key]?.icon ||
              Sparkles,
            config:
              node.data?.config || {},
          },
        }));

        const restoredNodes =
          mergeWebhookTriggerIntoNodes(
            data,
            baseRestoredNodes
          );

        const restoredEdges = (
          data.edges || []
        ).map((edge) => {
          const branch =
            edge.branch ||
            edge.sourceHandle ||
            null;

          return {
            ...edge,
            animated: true,
            branch,
            sourceHandle:
              edge.sourceHandle || null,
            style: {
              stroke:
                branch === "yes"
                  ? "#22c55e"
                  : branch === "no"
                    ? "#ef4444"
                    : "#168FFF",
              strokeWidth: 1.5,
            },
          };
        });

        setNodes(
          restoredNodes.length
            ? restoredNodes
            : defaultNodes
        );

        setEdges(restoredEdges);
      } catch (error) {
        console.error(
          "Failed to load workflow:",
          error
        );

        if (!cancelled) {
          showFeedback(
            error.response?.data?.message ||
            "Failed to load workflow"
          );

          navigate("/workflows");
        }
      } finally {
        if (!cancelled) {
          setIsLoadingWorkflow(false);
        }
      }
    };

    loadWorkflow();

    return () => {
      cancelled = true;
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  /* ---------------------------------------------------------------------- */
  /* FEEDBACK                                                               */
  /* ---------------------------------------------------------------------- */

  const showFeedback = useCallback((text) => {
    setFeedback(text);

    window.setTimeout(() => {
      setFeedback("");
    }, 3000);
  }, []);

  /* ---------------------------------------------------------------------- */
  /* SERIALIZE NODES                                                        */
  /* ---------------------------------------------------------------------- */

  const serializeNodes = useCallback(() => {
    return nodes.map((node) => ({
      id: node.id,
      type: node.type || "custom",
      position: {
        x: Number(node.position?.x || 0),
        y: Number(node.position?.y || 0),
      },
      data: {
        label:
          node.data?.label ||
          "Untitled Node",

        kind: node.data?.kind || "action",

        key:
          node.data?.key ||
          "notification",

        config:
          node.data?.config || {},
      },
    }));
  }, [nodes]);

  /* ---------------------------------------------------------------------- */
  /* SERIALIZE EDGES                                                        */
  /* ---------------------------------------------------------------------- */

  const serializeEdges = useCallback(() => {
    return edges.map((edge) => {
      const branch =
        edge.branch ||
        edge.sourceHandle ||
        null;

      return {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        sourceHandle:
          edge.sourceHandle || null,
        targetHandle:
          edge.targetHandle || null,
        branch,
        label:
          edge.label ||
          (branch ? branch.toUpperCase() : ""),
      };
    });
  }, [edges]);

  /* ---------------------------------------------------------------------- */
  /* BUILD TRIGGER                                                          */
  /* ---------------------------------------------------------------------- */

  const buildTrigger = useCallback(() => {
    const triggerNode = nodes.find(
      (node) => node.data?.kind === "trigger"
    );

    if (!triggerNode) {
      return {
        type: "manual",
      };
    }

    const key = triggerNode.data?.key;

    const config =
      triggerNode.data?.config || {};

    if (key === "webhook") {
      return {
        type: "webhook",
        webhook: {
          token: config.token || null,
          secret: config.secret || null,
        },
      };
    }

    if (key === "schedule") {
      let cron = config.cron || "";

      if (!cron) {
        if (config.frequency === "Every hour") {
          cron = "0 * * * *";
        } else if (
          config.frequency === "Every day"
        ) {
          cron = "0 9 * * *";
        } else if (
          config.frequency === "Every week"
        ) {
          cron = "0 9 * * 1";
        } else if (
          config.frequency === "Every month"
        ) {
          cron = "0 9 1 * *";
        }
      }

      return {
        type: "schedule",
        schedule: {
          cron: cron || null,
          timezone:
            config.timezone || "UTC",
        },
      };
    }

    if (key === "newLead") {
      return {
        type: "event",
        event: {
          name:
            config.eventName ||
            "lead.created",
        },
      };
    }

    if (key === "formSubmission") {
      return {
        type: "event",
        event: {
          name:
            config.eventName ||
            "form.submitted",
        },
      };
    }

    return {
      type: "manual",
    };
  }, [nodes]);

  /* ---------------------------------------------------------------------- */
  /* VALIDATION                                                             */
  /* ---------------------------------------------------------------------- */

  const validateWorkflow = useCallback(() => {
    if (!workflowName.trim()) {
      showFeedback("Workflow name is required");
      return false;
    }

    if (nodes.length === 0) {
      showFeedback("Add at least one node");
      return false;
    }

    const triggerNodes = nodes.filter(
      (node) =>
        node.data?.kind === "trigger"
    );

    if (triggerNodes.length === 0) {
      showFeedback("Add a trigger node");
      return false;
    }

    if (triggerNodes.length > 1) {
      showFeedback(
        "A workflow can have only one trigger"
      );
      return false;
    }

    const trigger = triggerNodes[0];

    if (trigger.data?.key === "schedule") {
      const config =
        trigger.data?.config || {};

      if (
        !config.cron &&
        !config.frequency
      ) {
        showFeedback(
          "Configure the schedule first"
        );

        return false;
      }
    }

    if (trigger.data?.key === "webhook") {
      const config =
        trigger.data?.config || {};

      if (
        config.secret &&
        typeof config.secret !== "string"
      ) {
        showFeedback(
          "Webhook secret is invalid"
        );

        return false;
      }
    }

    return true;
  }, [nodes, workflowName, showFeedback]);

  /* ---------------------------------------------------------------------- */
  /* PAYLOAD                                                                */
  /* ---------------------------------------------------------------------- */

  const buildPayload = useCallback(
    (status) => {
      return {
        name: workflowName.trim(),

        description: "",

        nodes: serializeNodes(),

        edges: serializeEdges(),

        trigger: buildTrigger(),

        status:
          status ||
          workflowStatus ||
          "Draft",
      };
    },
    [
      workflowName,
      serializeNodes,
      serializeEdges,
      buildTrigger,
      workflowStatus,
    ]
  );

  /* ---------------------------------------------------------------------- */
  /* SAVE                                                                    */
  /* ---------------------------------------------------------------------- */

  const handleSave = useCallback(
    async (customStatus = null) => {
      if (!validateWorkflow()) {
        return null;
      }

      setIsSaving(true);

      try {
        const payload = buildPayload(customStatus);

        // UPDATE EXISTING WORKFLOW
        if (workflowId) {
          const updated = await updateWorkflow(
            workflowId,
            payload
          );

          const normalized =
            updated?.workflow || updated;

          if (!normalized?._id) {
            throw new Error(
              "Workflow was updated but no ID was returned"
            );
          }

          let finalWorkflow = normalized;

          try {
            const refreshed =
              await getWorkflowById(normalized._id);

            if (refreshed) {
              finalWorkflow = refreshed;
            }
          } catch (refreshError) {
            console.warn(
              "Could not refresh updated workflow:",
              refreshError
            );
          }

          setWorkflowId(finalWorkflow._id);

          setWorkflowStatus(
            finalWorkflow.status ||
            customStatus ||
            workflowStatus ||
            "Draft"
          );

          setNodes((currentNodes) =>
            mergeWebhookTriggerIntoNodes(
              finalWorkflow,
              currentNodes
            )
          );

          showFeedback("Workflow saved");

          return finalWorkflow;
        }

        // CREATE NEW WORKFLOW
        const created = await createWorkflow(payload);

        const normalized =
          created?.workflow || created;

        if (!normalized?._id) {
          throw new Error(
            "Workflow was created but no ID was returned"
          );
        }

        let finalWorkflow = normalized;

        try {
          const refreshed =
            await getWorkflowById(normalized._id);

          if (refreshed) {
            finalWorkflow = refreshed;
          }
        } catch (refreshError) {
          console.warn(
            "Could not refresh newly created workflow:",
            refreshError
          );
        }

        setWorkflowId(finalWorkflow._id);

        setWorkflowStatus(
          finalWorkflow.status ||
          customStatus ||
          "Draft"
        );

        setNodes((currentNodes) =>
          mergeWebhookTriggerIntoNodes(
            finalWorkflow,
            currentNodes
          )
        );

        navigate(
          `/workflows/${finalWorkflow._id}`,
          {
            replace: true,
          }
        );

        showFeedback("Workflow created");

        return finalWorkflow;
      } catch (error) {
        console.error(
          "Failed to save workflow:",
          error
        );

        showFeedback(
          error.response?.data?.message ||
          error.message ||
          "Failed to save workflow"
        );

        return null;
      } finally {
        setIsSaving(false);
      }
    },
    [
      buildPayload,
      navigate,
      showFeedback,
      validateWorkflow,
      workflowId,
      workflowStatus,
      setNodes,
    ]
  );

  /* ---------------------------------------------------------------------- */
  /* TEST RUN                                                                */
  /* ---------------------------------------------------------------------- */

  const handleTestRun = useCallback(async () => {
    if (!validateWorkflow()) {
      return;
    }

    setIsRunning(true);

    try {
      let idToRun = workflowId;

      if (!idToRun) {
        const created =
          await handleSave("Draft");

        if (!created?._id) {
          return;
        }

        idToRun = created._id;
      } else {
        const saved =
          await handleSave(
            workflowStatus
          );

        if (!saved) {
          return;
        }
      }

      await runWorkflow(idToRun);

      showFeedback(
        "Execution queued successfully"
      );
    } catch (error) {
      console.error(
        "Failed to run workflow:",
        error
      );

      showFeedback(
        error.response?.data?.message ||
        error.message ||
        "Run failed"
      );
    } finally {
      setIsRunning(false);
    }
  }, [
    handleSave,
    showFeedback,
    validateWorkflow,
    workflowId,
    workflowStatus,
  ]);

  /* ---------------------------------------------------------------------- */
  /* PUBLISH                                                                 */
  /* ---------------------------------------------------------------------- */

  const handlePublish = useCallback(async () => {
    if (!validateWorkflow()) {
      return;
    }

    setIsPublishing(true);

    try {
      const saved =
        await handleSave("Active");

      if (!saved?._id) {
        return;
      }

      setWorkflowId(saved._id);
      setWorkflowStatus(
        saved.status || "Active"
      );

      showFeedback(
        "Workflow published successfully"
      );
    } catch (error) {
      console.error(
        "Failed to publish workflow:",
        error
      );

      showFeedback(
        error.response?.data?.message ||
        error.message ||
        "Publish failed"
      );
    } finally {
      setIsPublishing(false);
    }
  }, [
    handleSave,
    showFeedback,
    validateWorkflow,
  ]);

  /* ---------------------------------------------------------------------- */
  /* PAUSE                                                                   */
  /* ---------------------------------------------------------------------- */

  const handlePause = useCallback(async () => {
    if (!workflowId) {
      return;
    }

    setIsSaving(true);

    try {
      const updated =
        await updateWorkflow(
          workflowId,
          buildPayload("Paused")
        );

      const normalized =
        updated?.workflow ||
        updated;

      setWorkflowStatus(
        normalized?.status || "Paused"
      );

      showFeedback(
        "Workflow paused"
      );
    } catch (error) {
      console.error(
        "Failed to pause workflow:",
        error
      );

      showFeedback(
        error.response?.data?.message ||
        error.message ||
        "Pause failed"
      );
    } finally {
      setIsSaving(false);
    }
  }, [
    buildPayload,
    showFeedback,
    workflowId,
  ]);

  /* ---------------------------------------------------------------------- */
  /* DRAG START                                                              */
  /* ---------------------------------------------------------------------- */

  const handlePaletteDragStart = (
    event,
    item
  ) => {
    event.dataTransfer.setData(
      "application/cortexflow-node",
      item.key
    );

    event.dataTransfer.effectAllowed =
      "move";
  };

  /* ---------------------------------------------------------------------- */
  /* LOADING                                                                 */
  /* ---------------------------------------------------------------------- */

  if (isLoadingWorkflow) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-[#030303] text-white">
        <Loader2
          size={22}
          className="animate-spin text-[#168FFF]"
        />

        <p className="mt-3 text-[11px] text-zinc-600">
          Loading workflow...
        </p>
      </div>
    );
  }

  /* ---------------------------------------------------------------------- */
  /* UI                                                                      */
  /* ---------------------------------------------------------------------- */

  return (
    <div className="flex h-screen flex-col bg-[#030303] text-white">
      {/* HEADER */}
      <header className="flex h-[64px] shrink-0 items-center justify-between border-b border-white/[0.07] bg-[#050609] px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-4">
          <button
            type="button"
            onClick={() =>
              navigate("/workflows")
            }
            aria-label="Back to workflows"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/[0.07] text-zinc-500 transition hover:border-white/[0.13] hover:text-zinc-200"
          >
            <ArrowLeft
              size={15}
              strokeWidth={1.8}
            />
          </button>

          <div className="hidden h-6 w-px bg-white/[0.08] sm:block" />

          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[#168FFF]/30 bg-[#168FFF]/10">
              <Sparkles
                size={13}
                strokeWidth={1.8}
                className="text-[#168FFF]"
              />
            </div>

            <input
              type="text"
              value={workflowName}
              onChange={(event) =>
                setWorkflowName(
                  event.target.value
                )
              }
              className="w-full min-w-0 bg-transparent text-[13px] font-medium text-white outline-none"
              placeholder="Workflow name"
            />
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {feedback && (
            <span className="hidden items-center gap-1.5 text-[9px] text-[#168FFF] sm:flex">
              <Check
                size={12}
                strokeWidth={2}
              />
              {feedback}
            </span>
          )}

          {/* STATUS */}
          <span
            className={`hidden items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[9px] sm:flex ${workflowStatus === "Active"
              ? "border-[#168FFF]/20 bg-[#168FFF]/10 text-[#168FFF]"
              : workflowStatus === "Paused"
                ? "border-yellow-500/20 bg-yellow-500/10 text-yellow-400"
                : "border-white/[0.07] text-zinc-600"
              }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${workflowStatus === "Active"
                ? "bg-[#168FFF]"
                : workflowStatus ===
                  "Paused"
                  ? "bg-yellow-400"
                  : "bg-zinc-700"
                }`}
            />

            {workflowStatus}
          </span>

          {/* SAVE */}
          <button
            type="button"
            onClick={() =>
              handleSave()
            }
            disabled={
              isSaving ||
              isPublishing ||
              isRunning
            }
            className="flex h-8 items-center gap-2 rounded-lg border border-white/[0.07] px-3 text-[10px] font-medium text-zinc-400 transition hover:border-white/[0.13] hover:text-zinc-200 disabled:opacity-50"
          >
            {isSaving ? (
              <Loader2
                size={13}
                className="animate-spin"
              />
            ) : (
              <Save
                size={13}
                strokeWidth={1.8}
              />
            )}

            <span className="hidden sm:inline">
              Save
            </span>
          </button>

          {/* TEST RUN */}
          <button
            type="button"
            onClick={handleTestRun}
            disabled={
              isRunning ||
              isSaving ||
              isPublishing
            }
            className="flex h-8 items-center gap-2 rounded-lg border border-white/[0.07] bg-white/[0.03] px-3 text-[10px] font-medium text-zinc-300 transition hover:border-white/[0.13] hover:bg-white/[0.06] disabled:opacity-50"
          >
            {isRunning ? (
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

            <span className="hidden sm:inline">
              Test Run
            </span>
          </button>

          {/* PAUSE */}
          {workflowStatus === "Active" && (
            <button
              type="button"
              onClick={handlePause}
              disabled={
                isSaving ||
                isPublishing ||
                isRunning
              }
              className="hidden h-8 items-center gap-2 rounded-lg border border-yellow-500/20 bg-yellow-500/[0.05] px-3 text-[10px] font-medium text-yellow-400 transition hover:bg-yellow-500/[0.1] disabled:opacity-50 lg:flex"
            >
              <Pause
                size={12}
                strokeWidth={1.8}
              />
              Pause
            </button>
          )}

          {/* PUBLISH */}
          <button
            type="button"
            onClick={handlePublish}
            disabled={
              isPublishing ||
              isSaving ||
              isRunning
            }
            className="flex h-8 items-center gap-2 rounded-lg bg-[#168FFF] px-3.5 text-[10px] font-semibold text-black transition hover:bg-[#38A8FF] hover:shadow-[0_0_25px_rgba(22,143,255,0.2)] disabled:opacity-50"
          >
            {isPublishing ? (
              <Loader2
                size={12}
                className="animate-spin"
              />
            ) : (
              <Rocket
                size={12}
                strokeWidth={1.8}
              />
            )}

            <span>
              {workflowStatus === "Active"
                ? "Published"
                : "Publish"}
            </span>
          </button>
        </div>
      </header>

      {/* BUILDER */}
      <div className="flex min-h-0 flex-1">
        {/* PALETTE */}
        <aside className="hidden w-[240px] shrink-0 overflow-y-auto border-r border-white/[0.07] bg-[#050609] p-4 lg:block">
          <p className="mb-1 px-1 text-[9px] font-medium uppercase tracking-[0.22em] text-zinc-700">
            Add Nodes
          </p>

          <p className="mb-4 px-1 text-[9px] text-zinc-800">
            Drag a node onto the canvas
          </p>

          <div className="space-y-6">
            {nodeGroups.map((group) => (
              <div key={group.label}>
                <p className="mb-2 px-1 text-[9px] font-medium uppercase tracking-[0.18em] text-zinc-700">
                  {group.label}
                </p>

                <div className="space-y-1">
                  {group.items.map((item) => {
                    const Icon = item.icon;

                    return (
                      <button
                        key={item.key}
                        type="button"
                        draggable
                        onDragStart={(event) =>
                          handlePaletteDragStart(
                            event,
                            item
                          )
                        }
                        className="group flex w-full cursor-grab items-center gap-2.5 rounded-lg border border-transparent px-2.5 py-2 text-left transition hover:border-white/[0.07] hover:bg-white/[0.03] active:cursor-grabbing"
                      >
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-white/[0.07] bg-white/[0.02]">
                          <Icon
                            size={13}
                            strokeWidth={1.7}
                            className="text-zinc-500 transition-colors group-hover:text-[#168FFF]"
                          />
                        </div>

                        <span className="truncate text-[10.5px] text-zinc-400 transition-colors group-hover:text-zinc-200">
                          {item.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* CANVAS */}
        <main className="relative flex-1 overflow-hidden bg-[#030303]">
          <ReactFlowProvider>
            <FlowCanvas
              nodes={nodes}
              setNodes={setNodes}
              onNodesChange={onNodesChange}
              edges={edges}
              setEdges={setEdges}
              onEdgesChange={onEdgesChange}
            />
          </ReactFlowProvider>
        </main>
      </div>
    </div>
  );
};

export default WorkflowBuilder;