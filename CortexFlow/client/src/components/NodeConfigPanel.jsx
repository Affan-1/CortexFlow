import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Trash2 } from "lucide-react";

const kindLabel = {
  trigger: "Trigger",
  ai: "AI",
  logic: "Logic",
  action: "Action",
};

/*
|--------------------------------------------------------------------------
| GEMINI MODELS
|--------------------------------------------------------------------------
|
| Keep the model options in one place so we don't have to update every
| AI node separately in the future.
|
|--------------------------------------------------------------------------
*/

const GEMINI_MODELS = [
  "gemini-3.6-flash",
];

/*
|--------------------------------------------------------------------------
| NODE CONFIGURATION FIELDS
|--------------------------------------------------------------------------
*/

const NODE_FIELDS = {
  // --------------------------------------------------
  // TRIGGERS
  // --------------------------------------------------

  webhook: [
    {
      name: "url",
      label: "Webhook URL",
      type: "text",
      placeholder: "https://your-api.com/webhook",
    },
    {
      name: "secret",
      label: "Webhook secret",
      type: "text",
      placeholder: "Optional secret",
    },
  ],

  schedule: [
    {
      name: "frequency",
      label: "Frequency",
      type: "select",
      options: [
        "Every hour",
        "Every day",
        "Every week",
        "Custom (cron)",
      ],
    },
    {
      name: "cron",
      label: "Cron expression",
      type: "text",
      placeholder: "0 * * * *",
    },
    {
      name: "timezone",
      label: "Timezone",
      type: "text",
      placeholder: "Asia/Karachi",
    },
  ],

  newLead: [
    {
      name: "source",
      label: "Lead source",
      type: "text",
      placeholder: "e.g. Website form",
    },
  ],

  formSubmission: [
    {
      name: "formName",
      label: "Form name",
      type: "text",
      placeholder: "e.g. Contact Us",
    },
  ],

  // --------------------------------------------------
  // AI
  // --------------------------------------------------

  aiAgent: [
    {
      name: "prompt",
      label: "Instructions",
      type: "textarea",
      placeholder:
        "Describe what this AI agent should analyze or decide...",
    },
    {
      name: "model",
      label: "Model",
      type: "select",
      options: GEMINI_MODELS,
    },
    {
      name: "temperature",
      label: "Temperature",
      type: "number",
      placeholder: "0.7",
      min: 0,
      max: 2,
      step: 0.1,
    },
  ],

  aiClassifier: [
    {
      name: "prompt",
      label: "Classification prompt",
      type: "textarea",
      placeholder:
        "Classify the input as HIGH, MEDIUM, or LOW value...",
    },
    {
      name: "model",
      label: "Model",
      type: "select",
      options: GEMINI_MODELS,
    },
  ],

  aiExtractor: [
    {
      name: "prompt",
      label: "Fields to extract",
      type: "textarea",
      placeholder:
        "e.g. name, company, email, project type",
    },
    {
      name: "model",
      label: "Model",
      type: "select",
      options: GEMINI_MODELS,
    },
  ],

  aiGenerator: [
    {
      name: "prompt",
      label: "Generation prompt",
      type: "textarea",
      placeholder:
        "e.g. Write a personalized sales follow-up email",
    },
    {
      name: "model",
      label: "Model",
      type: "select",
      options: GEMINI_MODELS,
    },
    {
      name: "temperature",
      label: "Temperature",
      type: "number",
      placeholder: "0.7",
      min: 0,
      max: 2,
      step: 0.1,
    },
  ],

  aiDecision: [
    {
      name: "prompt",
      label: "Decision instructions",
      type: "textarea",
      placeholder:
        "Decide which path should be taken based on the input...",
    },
    {
      name: "model",
      label: "Model",
      type: "select",
      options: GEMINI_MODELS,
    },
  ],

  // --------------------------------------------------
  // LOGIC
  // --------------------------------------------------

  condition: [
    {
      name: "field",
      label: "Field",
      type: "text",
      placeholder: "e.g. lead.score",
    },
    {
      name: "operator",
      label: "Operator",
      type: "select",
      options: [
        "equals",
        "not equals",
        "contains",
        "does not contain",
        "greater than",
        "greater than or equal",
        "less than",
        "less than or equal",
        "exists",
        "is empty",
      ],
    },
    {
      name: "value",
      label: "Value",
      type: "text",
      placeholder: "e.g. 80",
    },
  ],

  filter: [
    {
      name: "expression",
      label: "Filter expression",
      type: "textarea",
      placeholder:
        "e.g. continue only when status is active",
    },
  ],

  delay: [
    {
      name: "duration",
      label: "Duration",
      type: "number",
      placeholder: "10",
      min: 0,
    },
    {
      name: "unit",
      label: "Unit",
      type: "select",
      options: [
        "Seconds",
        "Minutes",
        "Hours",
      ],
    },
  ],

  // --------------------------------------------------
  // ACTIONS
  // --------------------------------------------------

  sendEmail: [
    {
      name: "to",
      label: "To",
      type: "text",
      placeholder: "{{trigger.payload.email}}",
    },
    {
      name: "cc",
      label: "CC",
      type: "text",
      placeholder: "Optional — email@example.com",
    },
    {
      name: "bcc",
      label: "BCC",
      type: "text",
      placeholder: "Optional — email@example.com",
    },
    {
      name: "subject",
      label: "Subject",
      type: "text",
      placeholder: "e.g. Welcome to CortexFlow",
    },
    {
      name: "body",
      label: "Email body",
      type: "textarea",
      placeholder:
        "Write your email here. You can use {{ai.output}} or other workflow variables.",
    },
    {
      name: "html",
      label: "HTML body",
      type: "textarea",
      placeholder:
        "<h1>Hello</h1><p>Your HTML email content...</p>",
    },
    {
      name: "replyTo",
      label: "Reply-To",
      type: "text",
      placeholder: "Optional — support@example.com",
    },
    {
      name: "fromName",
      label: "Sender name",
      type: "text",
      placeholder: "CortexFlow",
    },
  ],

  slackMessage: [
    {
      name: "channel",
      label: "Channel",
      type: "text",
      placeholder: "#sales",
    },
    {
      name: "message",
      label: "Message",
      type: "textarea",
      placeholder: "Message text...",
    },
  ],

  discordMessage: [
    {
      name: "channel",
      label: "Channel",
      type: "text",
      placeholder: "Discord channel",
    },
    {
      name: "message",
      label: "Message",
      type: "textarea",
      placeholder: "Message text...",
    },
  ],

  googleSheetsAppend: [
    {
      name: "spreadsheetId",
      label: "Spreadsheet ID",
      type: "text",
      placeholder: "Google spreadsheet ID",
    },
    {
      name: "sheetName",
      label: "Sheet name",
      type: "text",
      placeholder: "Sheet1",
    },
    {
      name: "values",
      label: "Row values",
      type: "textarea",
      placeholder:
        '["{{lead.name}}", "{{lead.email}}", "{{lead.company}}"]',
    },
  ],

  notionCreatePage: [
    {
      name: "parentPageId",
      label: "Parent page ID",
      type: "text",
      placeholder: "Notion page ID",
    },
    {
      name: "title",
      label: "Page title",
      type: "text",
      placeholder: "{{lead.name}}",
    },
    {
      name: "content",
      label: "Page content",
      type: "textarea",
      placeholder:
        "Content to create inside the Notion page...",
    },
  ],

  hubspotUpsert: [
    {
      name: "email",
      label: "Contact email",
      type: "text",
      placeholder: "{{lead.email}}",
    },
    {
      name: "firstName",
      label: "First name",
      type: "text",
      placeholder: "{{lead.firstName}}",
    },
    {
      name: "lastName",
      label: "Last name",
      type: "text",
      placeholder: "{{lead.lastName}}",
    },
    {
      name: "company",
      label: "Company",
      type: "text",
      placeholder: "{{lead.company}}",
    },
  ],

  webhookCall: [
    {
      name: "url",
      label: "Target URL",
      type: "text",
      placeholder: "https://api.example.com/webhook",
    },
    {
      name: "method",
      label: "HTTP method",
      type: "select",
      options: [
        "POST",
        "GET",
        "PUT",
        "PATCH",
        "DELETE",
      ],
    },
    {
      name: "headers",
      label: "Headers (JSON)",
      type: "textarea",
      placeholder:
        '{"Authorization":"Bearer YOUR_TOKEN","X-Source":"CortexFlow"}',
    },
    {
      name: "query",
      label: "Query parameters (JSON)",
      type: "textarea",
      placeholder:
        '{"source":"cortexflow","leadId":"{{trigger.payload.id}}"}',
    },
    {
      name: "body",
      label: "Request body",
      type: "textarea",
      placeholder:
        '{"name":"{{trigger.payload.name}}","email":"{{trigger.payload.email}}"}',
    },
    {
      name: "timeout",
      label: "Timeout (milliseconds)",
      type: "number",
      placeholder: "15000",
      min: 1000,
      max: 60000,
      step: 1000,
    },
  ],
};

/*
|--------------------------------------------------------------------------
| REUSABLE FIELD INPUT
|--------------------------------------------------------------------------
*/

const FieldInput = ({
  field,
  value,
  onChange,
}) => {
  const commonClasses =
    "w-full rounded-lg border border-white/[0.08] bg-[#0A0D12] px-3 py-2.5 text-[11px] text-zinc-200 placeholder:text-zinc-700 focus:border-[#168FFF]/50 focus:outline-none";

  if (field.type === "textarea") {
    return (
      <textarea
        rows={4}
        value={value ?? ""}
        onChange={(event) =>
          onChange(
            field.name,
            event.target.value
          )
        }
        placeholder={field.placeholder}
        className={`${commonClasses} resize-none`}
      />
    );
  }

  if (field.type === "select") {
    /*
    |--------------------------------------------------------------------------
    | SELECT VALUE
    |--------------------------------------------------------------------------
    |
    | If an old saved model such as gemini-2.5-flash exists in MongoDB,
    | the select should automatically display the first currently supported
    | model rather than keeping an invalid hidden value.
    |
    |--------------------------------------------------------------------------
    */

    const validValue =
      value &&
        field.options.includes(value)
        ? value
        : field.options[0];

    return (
      <select
        value={validValue}
        onChange={(event) =>
          onChange(
            field.name,
            event.target.value
          )
        }
        className={commonClasses}
      >
        {field.options.map((option) => (
          <option
            key={option}
            value={option}
            className="bg-[#0A0D12]"
          >
            {option}
          </option>
        ))}
      </select>
    );
  }

  return (
    <input
      type={
        field.type === "number"
          ? "number"
          : "text"
      }
      value={value ?? ""}
      min={field.min}
      max={field.max}
      step={field.step}
      onChange={(event) =>
        onChange(
          field.name,
          event.target.value
        )
      }
      placeholder={field.placeholder}
      className={commonClasses}
    />
  );
};

/*
|--------------------------------------------------------------------------
| NODE CONFIG PANEL
|--------------------------------------------------------------------------
*/

const NodeConfigPanel = ({
  node,
  onClose,
  onUpdate,
  onDelete,
}) => {
  if (!node) return null;

  const Icon = node.data?.icon;

  const fields =
    NODE_FIELDS[node.data?.key] || [];

  const config =
    node.data?.config || {};

  /*
  |--------------------------------------------------------------------------
  | NODE NAME
  |--------------------------------------------------------------------------
  */

  const handleLabelChange = (event) => {
    onUpdate(node.id, {
      ...node.data,

      label:
        event.target.value,
    });
  };

  /*
  |--------------------------------------------------------------------------
  | NODE CONFIG UPDATE
  |--------------------------------------------------------------------------
  */

  const handleFieldChange = (
    fieldName,
    value
  ) => {
    onUpdate(node.id, {
      ...node.data,

      config: {
        ...config,

        [fieldName]:
          value,
      },
    });
  };

  /*
  |--------------------------------------------------------------------------
  | NORMALIZE OLD AI MODEL
  |--------------------------------------------------------------------------
  |
  | Existing workflows may already contain:
  |
  | gemini-2.5-flash
  |
  | This automatically updates the node configuration to the current model
  | when the panel is opened.
  |
  |--------------------------------------------------------------------------
  */

  React.useEffect(() => {
    const isAiNode =
      node.data?.kind === "ai";

    if (!isAiNode) {
      return;
    }

    const currentModel =
      node.data?.config?.model;

    if (
      !currentModel ||
      !GEMINI_MODELS.includes(
        currentModel
      )
    ) {
      onUpdate(node.id, {
        ...node.data,

        config: {
          ...node.data?.config,

          model:
            GEMINI_MODELS[0],
        },
      });
    }
  }, [
    node.id,
    node.data,
    onUpdate,
  ]);

  return (
    <AnimatePresence>
      <motion.div
        key={node.id}
        initial={{
          x: 320,
          opacity: 0,
        }}
        animate={{
          x: 0,
          opacity: 1,
        }}
        exit={{
          x: 320,
          opacity: 0,
        }}
        transition={{
          duration: 0.35,

          ease: [
            0.16,
            1,
            0.3,
            1,
          ],
        }}
        className="absolute right-0 top-0 z-20 flex h-full w-[320px] flex-col border-l border-white/[0.08] bg-[#050609]/95 backdrop-blur-xl"
      >
        {/* HEADER */}

        <div className="flex items-center justify-between border-b border-white/[0.07] px-4 py-4">
          <div className="flex min-w-0 items-center gap-2.5">

            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#168FFF]/25 bg-[#168FFF]/10">

              {Icon ? (
                <Icon
                  size={15}
                  strokeWidth={1.7}
                  className="text-[#168FFF]"
                />
              ) : null}

            </div>

            <div className="min-w-0">

              <p className="text-[8px] uppercase tracking-[0.16em] text-zinc-600">
                {kindLabel[
                  node.data?.kind
                ] || "Workflow"}{" "}
                node
              </p>

              <p className="mt-1 truncate text-[11px] font-medium text-zinc-200">
                {node.data?.label ||
                  "Node"}
              </p>

            </div>

          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close panel"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-zinc-600 transition-colors hover:bg-white/[0.06] hover:text-zinc-200"
          >
            <X size={14} />
          </button>

        </div>

        {/* BODY */}

        <div className="flex-1 overflow-y-auto px-4 py-5">

          {/* NODE NAME */}

          <div className="mb-6">

            <label className="mb-2 block text-[9px] font-medium uppercase tracking-[0.14em] text-zinc-600">
              Node name
            </label>

            <input
              type="text"
              value={
                node.data?.label ||
                ""
              }
              onChange={
                handleLabelChange
              }
              className="w-full rounded-lg border border-white/[0.08] bg-[#0A0D12] px-3 py-2.5 text-[11px] text-zinc-200 placeholder:text-zinc-700 focus:border-[#168FFF]/50 focus:outline-none"
            />

          </div>

          {/* TYPE-SPECIFIC CONFIG */}

          {fields.length > 0 ? (
            <div className="space-y-5">

              {fields.map(
                (field) => (
                  <div
                    key={
                      field.name
                    }
                  >

                    <label className="mb-2 block text-[9px] font-medium uppercase tracking-[0.14em] text-zinc-600">
                      {
                        field.label
                      }
                    </label>

                    <FieldInput
                      field={
                        field
                      }
                      value={
                        config[
                        field.name
                        ]
                      }
                      onChange={
                        handleFieldChange
                      }
                    />

                  </div>
                )
              )}

            </div>
          ) : (
            <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">

              <p className="text-[10px] leading-5 text-zinc-600">
                This node does
                not require
                additional
                configuration
                yet.
              </p>

            </div>
          )}

          {/* VARIABLE HINT */}

          <div className="mt-7 rounded-lg border border-[#168FFF]/10 bg-[#168FFF]/[0.04] p-3">

            <p className="mb-1 text-[9px] font-medium uppercase tracking-[0.14em] text-[#168FFF]/70">
              Dynamic values
            </p>

            <p className="text-[9px] leading-5 text-zinc-600">
              You can use
              workflow data
              inside fields
              with variables
              such as:
            </p>

            <code className="mt-2 block text-[9px] text-zinc-500">
              {
                "{{lead.email}}"
              }
            </code>

            <code className="mt-1 block text-[9px] text-zinc-500">
              {
                "{{lead.name}}"
              }
            </code>

            <code className="mt-1 block text-[9px] text-zinc-500">
              {
                "{{ai.output}}"
              }
            </code>

          </div>

        </div>

        {/* FOOTER */}

        <div className="border-t border-white/[0.07] p-4">

          <button
            type="button"
            onClick={() =>
              onDelete(node.id)
            }
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-500/20 bg-red-500/[0.06] py-2.5 text-[10px] font-medium text-red-400 transition-all duration-300 hover:border-red-500/40 hover:bg-red-500/10"
          >

            <Trash2
              size={13}
              strokeWidth={1.8}
            />

            Delete node

          </button>

        </div>

      </motion.div>
    </AnimatePresence>
  );
};

export default NodeConfigPanel;