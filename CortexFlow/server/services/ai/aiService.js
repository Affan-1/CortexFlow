const providers = require("./providers");
const { interpolate } = require("../templateUtils");

/*
|--------------------------------------------------------------------------
| CORTEXFLOW AI SERVICE
|--------------------------------------------------------------------------
|
| Executes every AI-powered workflow node:
|
| AI Agent
| AI Classifier
| AI Extractor
| AI Generator
| AI Decision
|
|--------------------------------------------------------------------------
*/

/*
|--------------------------------------------------------------------------
| HELPERS
|--------------------------------------------------------------------------
*/

const safeJsonParse = (text) => {
  if (!text) {
    return null;
  }

  const cleaned = String(text)
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch (error) {
    // Try finding a JSON object inside the AI response.
    const objectMatch = cleaned.match(/\{[\s\S]*\}/);

    if (objectMatch) {
      try {
        return JSON.parse(objectMatch[0]);
      } catch (innerError) {
        // Ignore and continue.
      }
    }

    // Try finding a JSON array.
    const arrayMatch = cleaned.match(/\[[\s\S]*\]/);

    if (arrayMatch) {
      try {
        return JSON.parse(arrayMatch[0]);
      } catch (innerError) {
        // Ignore.
      }
    }

    return null;
  }
};

/*
|--------------------------------------------------------------------------
| NORMALIZE TEMPERATURE
|--------------------------------------------------------------------------
*/

const normalizeTemperature = (value, fallback = 0.4) => {
  const number = Number(value);

  if (Number.isNaN(number)) {
    return fallback;
  }

  return Math.max(
    0,
    Math.min(number, 2)
  );
};

/*
|--------------------------------------------------------------------------
| CONTEXT TO TEXT
|--------------------------------------------------------------------------
|
| Gives AI nodes access to workflow data without crashing when the
| context contains unexpected values.
|
|--------------------------------------------------------------------------
*/

const contextToText = (context) => {
  try {
    return JSON.stringify(
      context || {},
      null,
      2
    ).slice(0, 8000);
  } catch (error) {
    return "{}";
  }
};

/*
|--------------------------------------------------------------------------
| AI AGENT
|--------------------------------------------------------------------------
|
| General-purpose AI node.
|
| Examples:
|
| - Explain something
| - Analyze a lead
| - Summarize information
| - Answer questions
| - Reason about workflow data
|
|--------------------------------------------------------------------------
*/

const runAgent = async ({
  config,
  context,
}) => {
  const systemPrompt = interpolate(
    config.systemPrompt ||
      "You are an intelligent AI agent inside CortexFlow, an automation platform. Follow the user's instructions accurately.",
    context
  );

  const userPrompt = interpolate(
    config.prompt || "",
    context
  );

  if (!userPrompt.trim()) {
    throw new Error(
      "AI Agent node has no prompt configured."
    );
  }

  const { text } =
    await providers.complete({
      provider: config.provider,
      model: config.model,
      temperature:
        normalizeTemperature(
          config.temperature,
          0.4
        ),
      systemPrompt,
      userPrompt,
    });

  return {
    subtype: "agent",

    prompt: userPrompt,

    response: text,

    output: text,
  };
};

/*
|--------------------------------------------------------------------------
| AI CLASSIFIER
|--------------------------------------------------------------------------
|
| Classifies data into categories.
|
| Example instruction:
|
| Classify this lead as High, Medium, or Low quality.
|
|--------------------------------------------------------------------------
*/

const runClassifier = async ({
  config,
  context,
}) => {
  const instruction = interpolate(
    config.prompt ||
      "Classify the provided workflow information.",
    context
  );

  /*
  |--------------------------------------------------------------------------
  | LABELS
  |--------------------------------------------------------------------------
  |
  | Advanced workflows can provide config.labels.
  |
  | Otherwise CortexFlow uses common classification labels.
  |
  */

  const labels =
    Array.isArray(config.labels) &&
    config.labels.length > 0
      ? config.labels.map(String)
      : [
          "High",
          "Medium",
          "Low",
        ];

  const input =
    config.input
      ? interpolate(
          config.input,
          context
        )
      : contextToText(context);

  const systemPrompt = `
You are an AI classification engine inside CortexFlow.

Your job is to classify workflow data.

Return ONLY valid JSON.

Required format:

{
  "label": "one allowed label",
  "confidence": 0.95,
  "reasoning": "short explanation"
}

Allowed labels:

${labels.join(", ")}

confidence must be between 0 and 1.
`.trim();

  const userPrompt = `
Classification instructions:

${instruction}

Workflow data:

${input}
`.trim();

  const { text } =
    await providers.complete({
      provider: config.provider,
      model: config.model,
      temperature: 0,
      json: true,
      systemPrompt,
      userPrompt,
    });

  const parsed =
    safeJsonParse(text) || {};

  const normalizedLabel =
    labels.find(
      (label) =>
        String(label).toLowerCase() ===
        String(
          parsed.label || ""
        ).toLowerCase()
    ) || labels[0];

  let confidence =
    Number(parsed.confidence);

  if (Number.isNaN(confidence)) {
    confidence = null;
  } else {
    confidence = Math.max(
      0,
      Math.min(confidence, 1)
    );
  }

  return {
    subtype: "classifier",

    labels,

    label: normalizedLabel,

    confidence,

    reasoning:
      parsed.reasoning || "",

    branch: normalizedLabel,

    output: {
      label: normalizedLabel,
      confidence,
      reasoning:
        parsed.reasoning || "",
    },
  };
};

/*
|--------------------------------------------------------------------------
| AI EXTRACTOR
|--------------------------------------------------------------------------
|
| Extracts structured data.
|
| Example instruction:
|
| Extract name, email and company from the incoming lead.
|
|--------------------------------------------------------------------------
*/

const runExtractor = async ({
  config,
  context,
}) => {
  const instruction = interpolate(
    config.prompt ||
      "Extract the important structured information from the workflow data.",
    context
  );

  const input =
    config.input
      ? interpolate(
          config.input,
          context
        )
      : contextToText(context);

  const systemPrompt = `
You are a structured-data extraction engine inside CortexFlow.

Extract the information requested by the user.

Return ONLY a valid JSON object.

Do not wrap the response in markdown.

If requested information does not exist, use null.
`.trim();

  const userPrompt = `
Extraction instructions:

${instruction}

Workflow data:

${input}
`.trim();

  const { text } =
    await providers.complete({
      provider: config.provider,
      model: config.model,
      temperature: 0,
      json: true,
      systemPrompt,
      userPrompt,
    });

  const parsed =
    safeJsonParse(text);

  const extracted =
    parsed &&
    typeof parsed === "object" &&
    !Array.isArray(parsed)
      ? parsed
      : {
          result: text,
        };

  return {
    subtype: "extractor",

    instruction,

    extracted,

    output: extracted,
  };
};

/*
|--------------------------------------------------------------------------
| AI GENERATOR
|--------------------------------------------------------------------------
|
| Generates text/content.
|
| Examples:
|
| - Sales email
| - Blog paragraph
| - Customer response
| - Summary
| - Marketing content
|
|--------------------------------------------------------------------------
*/

const runGenerator = async ({
  config,
  context,
}) => {
  const prompt = interpolate(
    config.prompt || "",
    context
  );

  if (!prompt.trim()) {
    throw new Error(
      "AI Generator node has no prompt configured."
    );
  }

  const tone = config.tone
    ? `Tone: ${config.tone}.`
    : "";

  const format = config.format
    ? `Format: ${config.format}.`
    : "";

  const systemPrompt = `
You are an AI content generator inside CortexFlow.

Generate useful, accurate content according to the user's instructions.

${tone}

${format}
`.trim();

  const { text } =
    await providers.complete({
      provider: config.provider,
      model: config.model,
      temperature:
        normalizeTemperature(
          config.temperature,
          0.7
        ),
      systemPrompt,
      userPrompt: prompt,
    });

  return {
    subtype: "generator",

    prompt,

    content: text,

    output: text,
  };
};

/*
|--------------------------------------------------------------------------
| AI DECISION
|--------------------------------------------------------------------------
|
| Makes a workflow branching decision.
|
| Default branches:
|
| YES
| NO
|
|--------------------------------------------------------------------------
*/

const runDecision = async ({
  config,
  context,
}) => {
  const instruction = interpolate(
    config.prompt ||
      config.question ||
      "Should this workflow continue?",
    context
  );

  const options =
    Array.isArray(config.options) &&
    config.options.length > 0
      ? config.options.map((item) =>
          String(item).toLowerCase()
        )
      : ["yes", "no"];

  const systemPrompt = `
You are an AI decision engine inside CortexFlow.

You must make exactly one workflow decision.

Return ONLY valid JSON.

Required format:

{
  "decision": "yes",
  "reasoning": "short explanation"
}

The decision MUST be exactly one of:

${options.join(", ")}
`.trim();

  const userPrompt = `
Decision instructions:

${instruction}

Workflow context:

${contextToText(context)}
`.trim();

  const { text } =
    await providers.complete({
      provider: config.provider,
      model: config.model,
      temperature: 0,
      json: true,
      systemPrompt,
      userPrompt,
    });

  const parsed =
    safeJsonParse(text) || {};

  const modelDecision = String(
    parsed.decision || ""
  ).toLowerCase();

  const decision =
    options.includes(modelDecision)
      ? modelDecision
      : options[0];

  return {
    subtype: "decision",

    instruction,

    options,

    decision,

    reasoning:
      parsed.reasoning || "",

    branch: decision,

    output: {
      decision,
      reasoning:
        parsed.reasoning || "",
    },
  };
};

/*
|--------------------------------------------------------------------------
| AI NODE HANDLERS
|--------------------------------------------------------------------------
|
| IMPORTANT:
|
| Frontend CortexFlow keys:
|
| aiAgent
| aiClassifier
| aiExtractor
| aiGenerator
| aiDecision
|
| We also keep shorter aliases for compatibility with older workflows.
|
|--------------------------------------------------------------------------
*/

const AI_NODE_HANDLERS = {
  aiAgent: runAgent,

  aiClassifier: runClassifier,

  aiExtractor: runExtractor,

  aiGenerator: runGenerator,

  aiDecision: runDecision,

  // Legacy / compatibility aliases

  agent: runAgent,

  classifier: runClassifier,

  extractor: runExtractor,

  generator: runGenerator,

  decision: runDecision,
};

/*
|--------------------------------------------------------------------------
| EXECUTE AI NODE
|--------------------------------------------------------------------------
*/

const executeAINode = async (
  node,
  context
) => {
  if (!node) {
    throw new Error(
      "AI node is missing."
    );
  }

  const config =
    node.data?.config || {};

  const key =
    node.data?.key ||
    "aiAgent";

  const handler =
    AI_NODE_HANDLERS[key];

  /*
  |--------------------------------------------------------------------------
  | DON'T SILENTLY RUN WRONG AI NODE
  |--------------------------------------------------------------------------
  |
  | Previously an unknown node automatically ran as AI Agent.
  |
  | That could hide configuration problems.
  |
  */

  if (!handler) {
    throw new Error(
      `Unsupported AI node type: ${key}`
    );
  }

  try {
    return await handler({
      config,
      context:
        context || {},
    });
  } catch (error) {
    throw new Error(
      `${node.data?.label || "AI node"} failed: ${
        error.message ||
        "Unknown AI error"
      }`
    );
  }
};

module.exports = {
  executeAINode,

  AI_NODE_HANDLERS,
};