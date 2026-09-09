/*
|--------------------------------------------------------------------------
| CortexFlow AI Providers
|--------------------------------------------------------------------------
|
| Supports:
| - Gemini
| - OpenAI
|
| Compatible with aiService.js calling:
|
| providers.complete({
|   userPrompt,
|   systemPrompt,
|   provider,
|   model,
|   temperature
| })
|
|--------------------------------------------------------------------------
*/


const PROVIDERS = {
  GEMINI: "gemini",
  OPENAI: "openai",
};


/*
|--------------------------------------------------------------------------
| GET CONFIGURED PROVIDER
|--------------------------------------------------------------------------
*/

const getConfiguredProvider = () => {
  if (
    process.env.GEMINI_API_KEY &&
    process.env.GEMINI_API_KEY.trim()
  ) {
    return PROVIDERS.GEMINI;
  }

  if (
    process.env.OPENAI_API_KEY &&
    process.env.OPENAI_API_KEY.trim()
  ) {
    return PROVIDERS.OPENAI;
  }

  return null;
};


/*
|--------------------------------------------------------------------------
| GEMINI COMPLETION
|--------------------------------------------------------------------------
*/

const completeWithGemini = async ({
  prompt,
  systemPrompt = "",
  model = null,
  temperature = 0.4,
}) => {
  const apiKey =
    process.env.GEMINI_API_KEY?.trim();

  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is not configured."
    );
  }

  const selectedModel =
    model ||
    process.env.GEMINI_MODEL ||
    "gemini-2.0-flash";

  const finalPrompt = [
    systemPrompt
      ? `System instructions:\n${systemPrompt}`
      : "",

    prompt
      ? `User request:\n${prompt}`
      : "",
  ]
    .filter(Boolean)
    .join("\n\n");


  if (!finalPrompt.trim()) {
    throw new Error(
      "AI prompt is required."
    );
  }


  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${encodeURIComponent(
      apiKey
    )}`;


  const response = await fetch(
    url,
    {
      method: "POST",

      headers: {
        "Content-Type":
          "application/json",
      },

      body: JSON.stringify({
        contents: [
          {
            role: "user",

            parts: [
              {
                text:
                  finalPrompt,
              },
            ],
          },
        ],

        generationConfig: {
          temperature,
        },
      }),
    }
  );


  const data =
    await response.json();


  if (!response.ok) {
    const message =
      data?.error?.message ||
      `Gemini request failed with status ${response.status}`;

    throw new Error(message);
  }


  const text =
    data?.candidates?.[0]?.content
      ?.parts
      ?.map(
        (part) =>
          part?.text || ""
      )
      .join("")
      .trim();


  if (!text) {
    throw new Error(
      "Gemini returned an empty response."
    );
  }


  return {
    provider:
      PROVIDERS.GEMINI,

    model:
      selectedModel,

    text,

    raw:
      data,
  };
};


/*
|--------------------------------------------------------------------------
| OPENAI COMPLETION
|--------------------------------------------------------------------------
*/

const completeWithOpenAI = async ({
  prompt,
  systemPrompt = "",
  model = null,
  temperature = 0.4,
}) => {
  const apiKey =
    process.env.OPENAI_API_KEY?.trim();


  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY is not configured."
    );
  }


  const selectedModel =
    model ||
    process.env.OPENAI_MODEL ||
    "gpt-4o-mini";


  const messages = [];


  if (systemPrompt) {
    messages.push({
      role: "system",
      content:
        systemPrompt,
    });
  }


  messages.push({
    role: "user",

    content:
      prompt || "",
  });


  const response =
    await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",

          Authorization:
            `Bearer ${apiKey}`,
        },

        body: JSON.stringify({
          model:
            selectedModel,

          messages,

          temperature,
        }),
      }
    );


  const data =
    await response.json();


  if (!response.ok) {
    const message =
      data?.error?.message ||
      `OpenAI request failed with status ${response.status}`;

    throw new Error(message);
  }


  const text =
    data?.choices?.[0]?.message
      ?.content
      ?.trim();


  if (!text) {
    throw new Error(
      "OpenAI returned an empty response."
    );
  }


  return {
    provider:
      PROVIDERS.OPENAI,

    model:
      selectedModel,

    text,

    raw:
      data,
  };
};


/*
|--------------------------------------------------------------------------
| MAIN COMPLETE FUNCTION
|--------------------------------------------------------------------------
|
| Supports BOTH:
|
| prompt
|
| and:
|
| userPrompt
|
| This fixes the "AI prompt is required" mismatch between
| aiService.js and providers.js.
|
|--------------------------------------------------------------------------
*/

const complete = async ({
  prompt,
  userPrompt,
  systemPrompt = "",
  provider = null,
  model = null,
  temperature = 0.4,
  json = false,
} = {}) => {
  const finalPrompt =
    userPrompt ||
    prompt ||
    "";


  if (
    !String(finalPrompt).trim()
  ) {
    throw new Error(
      "AI prompt is required."
    );
  }


  const requestedProvider =
    provider
      ? String(provider)
          .trim()
          .toLowerCase()
      : null;


  const activeProvider =
    requestedProvider ||
    getConfiguredProvider();


  if (!activeProvider) {
    throw new Error(
      "No AI provider is configured. Set GEMINI_API_KEY or OPENAI_API_KEY in server/.env."
    );
  }


  if (
    activeProvider ===
    PROVIDERS.GEMINI
  ) {
    return completeWithGemini({
      prompt:
        String(finalPrompt),

      systemPrompt,

      model,

      temperature,

      json,
    });
  }


  if (
    activeProvider ===
    PROVIDERS.OPENAI
  ) {
    return completeWithOpenAI({
      prompt:
        String(finalPrompt),

      systemPrompt,

      model,

      temperature,

      json,
    });
  }


  throw new Error(
    `Unsupported AI provider: ${activeProvider}`
  );
};


/*
|--------------------------------------------------------------------------
| CHECK IF AI PROVIDER EXISTS
|--------------------------------------------------------------------------
*/

const hasConfiguredProvider = () => {
  return Boolean(
    getConfiguredProvider()
  );
};


/*
|--------------------------------------------------------------------------
| EXPORTS
|--------------------------------------------------------------------------
*/

module.exports = {
  PROVIDERS,

  getConfiguredProvider,

  hasConfiguredProvider,

  complete,

  completeWithGemini,

  completeWithOpenAI,
};