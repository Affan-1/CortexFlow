import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  Search,
  ArrowUpRight,
  Bot,
  Sparkles,
  Mail,
  MessageSquare,
  FileText,
  Users,
  ShieldCheck,
  Workflow,
} from "lucide-react";

const categories = [
  "All",
  "Sales",
  "Support",
  "Marketing",
  "Operations",
];

const createNode = (
  id,
  label,
  kind,
  key,
  x,
  y,
  config = {}
) => ({
  id,
  type: "custom",
  position: {
    x,
    y,
  },
  data: {
    label,
    kind,
    key,
    config,
  },
});

const createEdge = (
  id,
  source,
  target,
  sourceHandle = null
) => ({
  id,
  source,
  target,
  sourceHandle,
  targetHandle: null,
  branch: sourceHandle,
  label: sourceHandle
    ? sourceHandle.toUpperCase()
    : "",
});

const templates = [
  {
    id: "lead-qualification",

    name: "Lead Qualification",

    description:
      "Analyze incoming leads with AI, qualify them, create CRM records, and notify your sales team.",

    category: "Sales",

    icon: Bot,

    workflow: {
      nodes: [
        createNode(
          "lead-trigger",
          "New Lead",
          "trigger",
          "newLead",
          0,
          180,
          {
            source: "Website",
          }
        ),

        createNode(
          "lead-ai",
          "AI Lead Classifier",
          "ai",
          "aiClassifier",
          280,
          180,
          {
            prompt:
              "Analyze the incoming lead and classify it as QUALIFIED or NOT_QUALIFIED based on buying intent.",
            model: "gemini-3.6-flash",
          }
        ),

        createNode(
          "lead-condition",
          "Qualified Lead?",
          "logic",
          "condition",
          580,
          180,
          {
            field: "ai.output",
            operator: "contains",
            value: "QUALIFIED",
          }
        ),

        createNode(
          "lead-crm",
          "Create CRM Contact",
          "action",
          "hubspotUpsert",
          880,
          70,
          {
            email: "{{trigger.email}}",
            firstName: "{{trigger.firstName}}",
            lastName: "{{trigger.lastName}}",
            company: "{{trigger.company}}",
          }
        ),

        createNode(
          "lead-slack",
          "Notify Sales Team",
          "action",
          "slackMessage",
          1170,
          70,
          {
            channel: "#sales",
            message:
              "New qualified lead detected by CortexFlow.",
          }
        ),

        createNode(
          "lead-generator",
          "Generate Follow-up",
          "ai",
          "aiGenerator",
          880,
          310,
          {
            prompt:
              "Write a short and friendly follow-up email for this lead.",
            model: "gemini-3.6-flash",
            temperature: 0.7,
          }
        ),

        createNode(
          "lead-email",
          "Send Follow-up Email",
          "action",
          "sendEmail",
          1170,
          310,
          {
            to: "{{trigger.email}}",
            subject: "Thanks for your interest",
            body: "{{ai.output}}",
          }
        ),
      ],

      edges: [
        createEdge(
          "lead-edge-1",
          "lead-trigger",
          "lead-ai"
        ),

        createEdge(
          "lead-edge-2",
          "lead-ai",
          "lead-condition"
        ),

        createEdge(
          "lead-edge-3",
          "lead-condition",
          "lead-crm",
          "yes"
        ),

        createEdge(
          "lead-edge-4",
          "lead-crm",
          "lead-slack"
        ),

        createEdge(
          "lead-edge-5",
          "lead-condition",
          "lead-generator",
          "no"
        ),

        createEdge(
          "lead-edge-6",
          "lead-generator",
          "lead-email"
        ),
      ],
    },
  },

  {
    id: "customer-support-agent",

    name: "AI Customer Support Agent",

    description:
      "Understand support requests with AI and route complex requests to your support team.",

    category: "Support",

    icon: Sparkles,

    workflow: {
      nodes: [
        createNode(
          "support-trigger",
          "Form Submission",
          "trigger",
          "formSubmission",
          0,
          180,
          {
            formName: "Support Form",
          }
        ),

        createNode(
          "support-ai",
          "Analyze Request",
          "ai",
          "aiAgent",
          280,
          180,
          {
            prompt:
              "Analyze this support request. Return COMPLEX if human support is required, otherwise return SIMPLE.",
            model: "gemini-3.6-flash",
            temperature: 0.2,
          }
        ),

        createNode(
          "support-condition",
          "Complex Request?",
          "logic",
          "condition",
          580,
          180,
          {
            field: "ai.output",
            operator: "contains",
            value: "COMPLEX",
          }
        ),

        createNode(
          "support-slack",
          "Notify Support",
          "action",
          "slackMessage",
          880,
          70,
          {
            channel: "#support",
            message:
              "Complex customer support request requires human attention.",
          }
        ),

        createNode(
          "support-generator",
          "Generate AI Reply",
          "ai",
          "aiGenerator",
          880,
          310,
          {
            prompt:
              "Generate a helpful response to the customer's support question.",
            model: "gemini-3.6-flash",
            temperature: 0.5,
          }
        ),

        createNode(
          "support-email",
          "Send Customer Reply",
          "action",
          "sendEmail",
          1170,
          310,
          {
            to: "{{trigger.email}}",
            subject: "Support response",
            body: "{{ai.output}}",
          }
        ),
      ],

      edges: [
        createEdge(
          "support-edge-1",
          "support-trigger",
          "support-ai"
        ),

        createEdge(
          "support-edge-2",
          "support-ai",
          "support-condition"
        ),

        createEdge(
          "support-edge-3",
          "support-condition",
          "support-slack",
          "yes"
        ),

        createEdge(
          "support-edge-4",
          "support-condition",
          "support-generator",
          "no"
        ),

        createEdge(
          "support-edge-5",
          "support-generator",
          "support-email"
        ),
      ],
    },
  },

  {
    id: "personalized-email-sequence",

    name: "Personalized Email Sequence",

    description:
      "Generate and send personalized follow-up emails for incoming leads.",

    category: "Marketing",

    icon: Mail,

    workflow: {
      nodes: [
        createNode(
          "email-trigger",
          "New Lead",
          "trigger",
          "newLead",
          0,
          180,
          {
            source: "Marketing Campaign",
          }
        ),

        createNode(
          "email-ai",
          "Analyze Lead",
          "ai",
          "aiAgent",
          280,
          180,
          {
            prompt:
              "Analyze this lead's interests and identify what they are most likely interested in.",
            model: "gemini-3.6-flash",
            temperature: 0.4,
          }
        ),

        createNode(
          "email-generator",
          "Generate Email",
          "ai",
          "aiGenerator",
          570,
          180,
          {
            prompt:
              "Write a personalized marketing follow-up email based on the lead analysis.",
            model: "gemini-3.6-flash",
            temperature: 0.7,
          }
        ),

        createNode(
          "email-delay",
          "Wait Before Sending",
          "logic",
          "delay",
          860,
          180,
          {
            duration: 5,
            unit: "Minutes",
          }
        ),

        createNode(
          "email-send",
          "Send Email",
          "action",
          "sendEmail",
          1150,
          180,
          {
            to: "{{trigger.email}}",
            subject: "A message just for you",
            body: "{{ai.output}}",
          }
        ),
      ],

      edges: [
        createEdge(
          "email-edge-1",
          "email-trigger",
          "email-ai"
        ),

        createEdge(
          "email-edge-2",
          "email-ai",
          "email-generator"
        ),

        createEdge(
          "email-edge-3",
          "email-generator",
          "email-delay"
        ),

        createEdge(
          "email-edge-4",
          "email-delay",
          "email-send"
        ),
      ],
    },
  },

  {
    id: "slack-notification-router",

    name: "Slack Notification Router",

    description:
      "Analyze incoming webhook events and send important events to your Slack workspace.",

    category: "Operations",

    icon: MessageSquare,

    workflow: {
      nodes: [
        createNode(
          "router-trigger",
          "Webhook",
          "trigger",
          "webhook",
          0,
          180
        ),

        createNode(
          "router-ai",
          "Classify Priority",
          "ai",
          "aiClassifier",
          300,
          180,
          {
            prompt:
              "Classify the incoming event as HIGH or NORMAL priority.",
            model: "gemini-3.6-flash",
          }
        ),

        createNode(
          "router-condition",
          "High Priority?",
          "logic",
          "condition",
          600,
          180,
          {
            field: "ai.output",
            operator: "contains",
            value: "HIGH",
          }
        ),

        createNode(
          "router-slack-high",
          "Urgent Slack Alert",
          "action",
          "slackMessage",
          910,
          80,
          {
            channel: "#urgent",
            message:
              "URGENT CortexFlow event received.",
          }
        ),

        createNode(
          "router-slack-normal",
          "Normal Slack Alert",
          "action",
          "slackMessage",
          910,
          300,
          {
            channel: "#general",
            message:
              "New CortexFlow event received.",
          }
        ),
      ],

      edges: [
        createEdge(
          "router-edge-1",
          "router-trigger",
          "router-ai"
        ),

        createEdge(
          "router-edge-2",
          "router-ai",
          "router-condition"
        ),

        createEdge(
          "router-edge-3",
          "router-condition",
          "router-slack-high",
          "yes"
        ),

        createEdge(
          "router-edge-4",
          "router-condition",
          "router-slack-normal",
          "no"
        ),
      ],
    },
  },

  {
    id: "invoice-data-extraction",

    name: "Invoice Data Extraction",

    description:
      "Extract structured invoice information using AI and save it automatically to Google Sheets.",

    category: "Operations",

    icon: FileText,

    workflow: {
      nodes: [
        createNode(
          "invoice-trigger",
          "Webhook",
          "trigger",
          "webhook",
          0,
          180
        ),

        createNode(
          "invoice-extractor",
          "Extract Invoice Data",
          "ai",
          "aiExtractor",
          300,
          180,
          {
            prompt:
              "Extract invoice number, vendor, total amount, date and customer name.",
            model: "gemini-3.6-flash",
          }
        ),

        createNode(
          "invoice-condition",
          "Data Extracted?",
          "logic",
          "condition",
          600,
          180,
          {
            field: "ai.output",
            operator: "exists",
            value: "",
          }
        ),

        createNode(
          "invoice-sheet",
          "Save To Google Sheets",
          "action",
          "googleSheetsAppend",
          910,
          80,
          {
            spreadsheetId: "",
            sheetName: "Invoices",
            values:
              '["{{ai.output}}"]',
          }
        ),

        createNode(
          "invoice-slack",
          "Notify Operations",
          "action",
          "slackMessage",
          1210,
          80,
          {
            channel: "#operations",
            message:
              "Invoice processed successfully.",
          }
        ),

        createNode(
          "invoice-error",
          "Extraction Failed Alert",
          "action",
          "slackMessage",
          910,
          310,
          {
            channel: "#operations",
            message:
              "Invoice extraction failed and requires review.",
          }
        ),
      ],

      edges: [
        createEdge(
          "invoice-edge-1",
          "invoice-trigger",
          "invoice-extractor"
        ),

        createEdge(
          "invoice-edge-2",
          "invoice-extractor",
          "invoice-condition"
        ),

        createEdge(
          "invoice-edge-3",
          "invoice-condition",
          "invoice-sheet",
          "yes"
        ),

        createEdge(
          "invoice-edge-4",
          "invoice-sheet",
          "invoice-slack"
        ),

        createEdge(
          "invoice-edge-5",
          "invoice-condition",
          "invoice-error",
          "no"
        ),
      ],
    },
  },

  {
    id: "signup-onboarding",

    name: "New Signup Onboarding",

    description:
      "Welcome new users automatically and notify your team when a new customer signs up.",

    category: "Marketing",

    icon: Users,

    workflow: {
      nodes: [
        createNode(
          "signup-trigger",
          "Form Submission",
          "trigger",
          "formSubmission",
          0,
          180,
          {
            formName: "Signup Form",
          }
        ),

        createNode(
          "signup-welcome",
          "Generate Welcome Email",
          "ai",
          "aiGenerator",
          300,
          180,
          {
            prompt:
              "Write a short professional welcome email for a new CortexFlow user.",
            model: "gemini-3.6-flash",
            temperature: 0.6,
          }
        ),

        createNode(
          "signup-email",
          "Send Welcome Email",
          "action",
          "sendEmail",
          600,
          180,
          {
            to: "{{trigger.email}}",
            subject: "Welcome to CortexFlow",
            body: "{{ai.output}}",
          }
        ),

        createNode(
          "signup-delay",
          "Wait",
          "logic",
          "delay",
          900,
          180,
          {
            duration: 10,
            unit: "Minutes",
          }
        ),

        createNode(
          "signup-slack",
          "Notify Team",
          "action",
          "slackMessage",
          1200,
          180,
          {
            channel: "#new-signups",
            message:
              "A new user has completed CortexFlow onboarding.",
          }
        ),
      ],

      edges: [
        createEdge(
          "signup-edge-1",
          "signup-trigger",
          "signup-welcome"
        ),

        createEdge(
          "signup-edge-2",
          "signup-welcome",
          "signup-email"
        ),

        createEdge(
          "signup-edge-3",
          "signup-email",
          "signup-delay"
        ),

        createEdge(
          "signup-edge-4",
          "signup-delay",
          "signup-slack"
        ),
      ],
    },
  },

  {
    id: "churn-risk-detector",

    name: "Churn Risk Detector",

    description:
      "Analyze customer activity with AI and alert your success team when churn risk is detected.",

    category: "Support",

    icon: ShieldCheck,

    workflow: {
      nodes: [
        createNode(
          "churn-trigger",
          "Schedule",
          "trigger",
          "schedule",
          0,
          180,
          {
            frequency: "Every day",
            cron: "0 9 * * *",
            timezone: "Asia/Karachi",
          }
        ),

        createNode(
          "churn-ai",
          "Analyze Churn Risk",
          "ai",
          "aiAgent",
          300,
          180,
          {
            prompt:
              "Analyze customer activity. Return HIGH_RISK if the customer shows strong churn signals, otherwise return HEALTHY.",
            model: "gemini-3.6-flash",
            temperature: 0.2,
          }
        ),

        createNode(
          "churn-condition",
          "High Churn Risk?",
          "logic",
          "condition",
          600,
          180,
          {
            field: "ai.output",
            operator: "contains",
            value: "HIGH_RISK",
          }
        ),

        createNode(
          "churn-slack",
          "Alert Success Team",
          "action",
          "slackMessage",
          910,
          80,
          {
            channel: "#customer-success",
            message:
              "High churn-risk customer detected.",
          }
        ),

        createNode(
          "churn-email-generator",
          "Generate Retention Email",
          "ai",
          "aiGenerator",
          1210,
          80,
          {
            prompt:
              "Write a personalized customer retention email.",
            model: "gemini-3.6-flash",
            temperature: 0.6,
          }
        ),

        createNode(
          "churn-email",
          "Send Retention Email",
          "action",
          "sendEmail",
          1510,
          80,
          {
            to: "{{trigger.email}}",
            subject: "We'd love to keep working with you",
            body: "{{ai.output}}",
          }
        ),
      ],

      edges: [
        createEdge(
          "churn-edge-1",
          "churn-trigger",
          "churn-ai"
        ),

        createEdge(
          "churn-edge-2",
          "churn-ai",
          "churn-condition"
        ),

        createEdge(
          "churn-edge-3",
          "churn-condition",
          "churn-slack",
          "yes"
        ),

        createEdge(
          "churn-edge-4",
          "churn-slack",
          "churn-email-generator"
        ),

        createEdge(
          "churn-edge-5",
          "churn-email-generator",
          "churn-email"
        ),
      ],
    },
  },

  {
    id: "custom-workflow",

    name: "Custom Workflow",

    description:
      "Start from a blank canvas and build a fully custom automation from scratch.",

    category: "Operations",

    icon: Workflow,

    workflow: null,
  },
];

const Templates = () => {
  const navigate = useNavigate();

  const [activeCategory, setActiveCategory] =
    useState("All");

  const [query, setQuery] = useState("");

  const filteredTemplates = templates.filter(
    (template) => {
      const matchesCategory =
        activeCategory === "All" ||
        template.category === activeCategory;

      const matchesQuery =
        template.name
          .toLowerCase()
          .includes(query.toLowerCase()) ||
        template.description
          .toLowerCase()
          .includes(query.toLowerCase());

      return matchesCategory && matchesQuery;
    }
  );

  const handleUseTemplate = (template) => {
    if (!template.workflow) {
      navigate("/workflows/new");
      return;
    }

    navigate("/workflows/new", {
      state: {
        template: {
          id: template.id,
          name: template.name,
          nodes: template.workflow.nodes,
          edges: template.workflow.edges,
        },
      },
    });
  };

  return (
    <div className="relative min-h-[calc(100vh-76px)] overflow-hidden bg-[#030303]">
      {/* Background glow */}

      <div className="pointer-events-none absolute left-1/2 top-0 h-[300px] w-[600px] -translate-x-1/2 rounded-full bg-[#168FFF]/[0.035] blur-[120px]" />

      <div className="relative mx-auto w-full max-w-[1600px] px-5 py-7 sm:px-7 lg:px-8 lg:py-9">
        {/* Header */}

        <section className="mb-8">
          <div className="mb-3 flex items-center gap-2">
            <span className="h-px w-5 bg-[#168FFF]" />

            <span className="text-[9px] font-medium uppercase tracking-[0.25em] text-[#168FFF]">
              Get started faster
            </span>
          </div>

          <h2 className="text-2xl font-medium tracking-[-0.035em] text-white sm:text-3xl">
            Templates
          </h2>

          <p className="mt-2 max-w-xl text-xs leading-6 text-zinc-600">
            Start from a ready-made automation and
            customize it to fit your workflow.
          </p>
        </section>

        {/* Search + Filters */}

        <section className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex h-10 w-full items-center gap-3 rounded-lg border border-white/[0.07] bg-[#080A0E] px-3.5 sm:max-w-xs">
            <Search
              size={14}
              strokeWidth={1.7}
              className="text-zinc-600"
            />

            <input
              type="text"
              value={query}
              onChange={(event) =>
                setQuery(event.target.value)
              }
              placeholder="Search templates..."
              className="w-full bg-transparent text-[11px] text-zinc-200 placeholder:text-zinc-700 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto">
            {categories.map((category) => {
              const isActive =
                activeCategory === category;

              return (
                <button
                  key={category}
                  type="button"
                  onClick={() =>
                    setActiveCategory(category)
                  }
                  className={`shrink-0 rounded-lg border px-3.5 py-2 text-[10px] font-medium transition-all duration-300 ${
                    isActive
                      ? "border-[#168FFF]/30 bg-[#168FFF]/10 text-[#168FFF]"
                      : "border-white/[0.07] text-zinc-500 hover:border-white/[0.13] hover:text-zinc-200"
                  }`}
                >
                  {category}
                </button>
              );
            })}
          </div>
        </section>

        {/* Template cards */}

        {filteredTemplates.length > 0 ? (
          <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {filteredTemplates.map(
              (template) => {
                const Icon = template.icon;

                const nodeCount =
                  template.workflow?.nodes
                    ?.length || 0;

                return (
                  <div
                    key={template.id}
                    className="group flex flex-col rounded-xl border border-white/[0.07] bg-[#080A0E] p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-white/[0.13] hover:bg-[#0A0D12]"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/[0.07] bg-white/[0.025]">
                        <Icon
                          size={17}
                          strokeWidth={1.6}
                          className="text-zinc-500 transition-colors duration-300 group-hover:text-[#168FFF]"
                        />
                      </div>

                      <span className="rounded-md border border-white/[0.07] px-2 py-1 text-[8px] uppercase tracking-[0.1em] text-zinc-600">
                        {template.category}
                      </span>
                    </div>

                    <div className="mt-4 flex-1">
                      <h3 className="text-[13px] font-medium text-zinc-100">
                        {template.name}
                      </h3>

                      <p className="mt-1.5 text-[10px] leading-5 text-zinc-600">
                        {template.description}
                      </p>
                    </div>

                    <div className="mt-5 flex items-center justify-between border-t border-white/[0.06] pt-4">
                      <span className="text-[8px] uppercase tracking-[0.12em] text-zinc-800">
                        {nodeCount > 0
                          ? `${nodeCount} nodes`
                          : "Blank canvas"}
                      </span>

                      <button
                        type="button"
                        onClick={() =>
                          handleUseTemplate(template)
                        }
                        className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] px-3 py-1.5 text-[9px] font-medium text-zinc-400 transition-all duration-300 hover:border-[#168FFF]/30 hover:bg-[#168FFF]/10 hover:text-[#168FFF]"
                      >
                        {template.workflow
                          ? "Use template"
                          : "Start blank"}

                        <ArrowUpRight
                          size={11}
                          strokeWidth={2}
                        />
                      </button>
                    </div>
                  </div>
                );
              }
            )}
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
              No templates found
            </p>

            <p className="mt-1.5 max-w-xs text-[10px] leading-5 text-zinc-600">
              Try a different search term or category.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Templates;