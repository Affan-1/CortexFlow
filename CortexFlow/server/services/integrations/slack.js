/*
|--------------------------------------------------------------------------
| CORTEXFLOW SLACK INTEGRATION
|--------------------------------------------------------------------------
|
| Sends real Slack messages from the "Slack Message" Action Node.
|
| Supported authentication methods:
|
| 1. Slack Incoming Webhook
|    credentials.webhookUrl
|
| 2. Slack Bot Token
|    credentials.botToken
|    config.channel / credentials.defaultChannel
|
|--------------------------------------------------------------------------
*/

const SLACK_API_URL =
  "https://slack.com/api/chat.postMessage";

const DEFAULT_TIMEOUT_MS = 15000;

/*
|--------------------------------------------------------------------------
| TIMEOUT FETCH
|--------------------------------------------------------------------------
*/

const fetchWithTimeout = async (
  url,
  options = {},
  timeoutMs = DEFAULT_TIMEOUT_MS
) => {
  const controller =
    new AbortController();

  const timeout =
    setTimeout(
      () => controller.abort(),
      timeoutMs
    );

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } catch (error) {
    if (
      error?.name === "AbortError"
    ) {
      throw new Error(
        `Slack request timed out after ${timeoutMs}ms.`
      );
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
};

/*
|--------------------------------------------------------------------------
| VALIDATE WEBHOOK URL
|--------------------------------------------------------------------------
*/

const validateWebhookUrl = (
  webhookUrl
) => {
  let parsed;

  try {
    parsed = new URL(
      webhookUrl
    );
  } catch (error) {
    throw new Error(
      "Slack Incoming Webhook URL is invalid."
    );
  }

  if (
    parsed.protocol !== "https:"
  ) {
    throw new Error(
      "Slack Incoming Webhook URL must use HTTPS."
    );
  }

  if (
    parsed.hostname !==
      "hooks.slack.com"
  ) {
    throw new Error(
      "Slack Incoming Webhook URL must use hooks.slack.com."
    );
  }

  return parsed.toString();
};

/*
|--------------------------------------------------------------------------
| SEND WITH BOT TOKEN
|--------------------------------------------------------------------------
*/

const sendWithBotToken =
  async ({
    botToken,
    channel,
    text,
    config,
  }) => {
    if (!channel) {
      throw new Error(
        "Slack node is missing a target channel."
      );
    }

    const payload = {
      channel,
      text,
    };

    /*
    |--------------------------------------------------------------------------
    | OPTIONAL SLACK MESSAGE OPTIONS
    |--------------------------------------------------------------------------
    */

    if (config.threadTs) {
      payload.thread_ts =
        config.threadTs;
    }

    if (
      config.unfurlLinks !==
      undefined
    ) {
      payload.unfurl_links =
        Boolean(
          config.unfurlLinks
        );
    }

    const response =
      await fetchWithTimeout(
        SLACK_API_URL,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json; charset=utf-8",

            Authorization:
              `Bearer ${botToken}`,
          },

          body: JSON.stringify(
            payload
          ),
        }
      );

    let data = {};

    try {
      data =
        await response.json();
    } catch (error) {
      throw new Error(
        "Slack returned an invalid API response."
      );
    }

    if (
      !response.ok ||
      data.ok === false
    ) {
      throw new Error(
        `Slack API request failed: ${
          data.error ||
          response.statusText ||
          `HTTP ${response.status}`
        }`
      );
    }

    return {
      provider: "slack",

      success: true,

      method: "bot_token",

      channel:
        data.channel ||
        channel,

      ts:
        data.ts ||
        null,

      message:
        data.message ||
        null,
    };
  };

/*
|--------------------------------------------------------------------------
| SEND WITH INCOMING WEBHOOK
|--------------------------------------------------------------------------
*/

const sendWithWebhook =
  async ({
    webhookUrl,
    text,
  }) => {
    const validUrl =
      validateWebhookUrl(
        webhookUrl
      );

    const response =
      await fetchWithTimeout(
        validUrl,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            text,
          }),
        }
      );

    const responseText =
      await response
        .text()
        .catch(() => "");

    if (!response.ok) {
      throw new Error(
        `Slack webhook failed (${response.status} ${
          response.statusText
        })${
          responseText
            ? `: ${responseText}`
            : ""
        }`
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Slack normally returns "ok" for a successful Incoming Webhook request.
    |--------------------------------------------------------------------------
    */

    if (
      responseText &&
      responseText.trim() !==
        "ok"
    ) {
      throw new Error(
        `Slack webhook returned an unexpected response: ${responseText}`
      );
    }

    return {
      provider: "slack",

      success: true,

      method:
        "webhook",

      response:
        responseText ||
        "ok",
    };
  };

/*
|--------------------------------------------------------------------------
| MAIN SEND FUNCTION
|--------------------------------------------------------------------------
*/

const send = async ({
  credentials = {},
  config = {},
}) => {
  /*
  |--------------------------------------------------------------------------
  | MESSAGE
  |--------------------------------------------------------------------------
  */

  const text =
    String(
      config.message || ""
    ).trim();

  if (!text) {
    throw new Error(
      "Slack node is missing a message."
    );
  }

  /*
  |--------------------------------------------------------------------------
  | OPTIONAL TIMEOUT
  |--------------------------------------------------------------------------
  */

  const timeout =
    Number(
      config.timeout ||
      DEFAULT_TIMEOUT_MS
    );

  if (
    Number.isFinite(timeout) &&
    timeout > 0
  ) {
    /*
    |--------------------------------------------------------------------------
    | Reserved for configurable timeout support.
    | Current transport uses the safe 15-second default.
    |--------------------------------------------------------------------------
    */
  }

  /*
  |--------------------------------------------------------------------------
  | BOT TOKEN MODE
  |--------------------------------------------------------------------------
  |
  | Prefer Bot Token when one has been configured because it supports
  | selecting channels dynamically.
  |
  |--------------------------------------------------------------------------
  */

  const botToken =
    String(
      credentials.botToken ||
      ""
    ).trim();

  if (botToken) {
    const channel =
      String(
        config.channel ||
        credentials.defaultChannel ||
        ""
      ).trim();

    try {
      return await sendWithBotToken({
        botToken,
        channel,
        text,
        config,
      });
    } catch (error) {
      throw new Error(
        `Slack message failed: ${
          error?.message ||
          "Unknown Slack error"
        }`
      );
    }
  }

  /*
  |--------------------------------------------------------------------------
  | INCOMING WEBHOOK MODE
  |--------------------------------------------------------------------------
  */

  const webhookUrl =
    String(
      credentials.webhookUrl ||
      ""
    ).trim();

  if (webhookUrl) {
    try {
      return await sendWithWebhook({
        webhookUrl,
        text,
      });
    } catch (error) {
      throw new Error(
        `Slack message failed: ${
          error?.message ||
          "Unknown Slack error"
        }`
      );
    }
  }

  /*
  |--------------------------------------------------------------------------
  | NO AUTHENTICATION
  |--------------------------------------------------------------------------
  */

  throw new Error(
    "Slack integration has no Incoming Webhook URL or Bot Token configured."
  );
};

module.exports = {
  send,
};