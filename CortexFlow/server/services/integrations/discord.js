/*
|--------------------------------------------------------------------------
| CORTEXFLOW DISCORD INTEGRATION
|--------------------------------------------------------------------------
|
| Sends real Discord messages using a Discord Incoming Webhook.
|
| Required:
|   credentials.webhookUrl
|   config.message
|
| Optional:
|   config.username
|   config.avatarUrl
|
|--------------------------------------------------------------------------
*/

const DEFAULT_TIMEOUT_MS = 15000;

/*
|--------------------------------------------------------------------------
| FETCH WITH TIMEOUT
|--------------------------------------------------------------------------
*/

const fetchWithTimeout = async (
  url,
  options = {},
  timeoutMs = DEFAULT_TIMEOUT_MS
) => {
  const controller = new AbortController();

  const timeout = setTimeout(
    () => controller.abort(),
    timeoutMs
  );

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error(
        `Discord request timed out after ${timeoutMs}ms.`
      );
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
};

/*
|--------------------------------------------------------------------------
| VALIDATE DISCORD WEBHOOK URL
|--------------------------------------------------------------------------
*/

const validateWebhookUrl = (webhookUrl) => {
  let parsed;

  try {
    parsed = new URL(webhookUrl);
  } catch (error) {
    throw new Error(
      "Discord Incoming Webhook URL is invalid."
    );
  }

  if (parsed.protocol !== "https:") {
    throw new Error(
      "Discord Incoming Webhook URL must use HTTPS."
    );
  }

  const allowedHosts = [
    "discord.com",
    "www.discord.com",
    "discordapp.com",
    "www.discordapp.com",
  ];

  if (!allowedHosts.includes(parsed.hostname)) {
    throw new Error(
      "Discord Incoming Webhook URL must use discord.com."
    );
  }

  if (!parsed.pathname.includes("/api/webhooks/")) {
    throw new Error(
      "Discord Incoming Webhook URL format is invalid."
    );
  }

  return parsed.toString();
};

/*
|--------------------------------------------------------------------------
| SEND DISCORD MESSAGE
|--------------------------------------------------------------------------
*/

const send = async ({
  credentials = {},
  config = {},
}) => {
  const webhookUrl = String(
    credentials.webhookUrl || ""
  ).trim();

  if (!webhookUrl) {
    throw new Error(
      "Discord integration has no webhookUrl configured."
    );
  }

  const content = String(
    config.message || ""
  ).trim();

  if (!content) {
    throw new Error(
      "Discord node is missing a message."
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Discord message content limit
  |--------------------------------------------------------------------------
  */

  if (content.length > 2000) {
    throw new Error(
      "Discord message cannot exceed 2000 characters."
    );
  }

  const validUrl =
    validateWebhookUrl(webhookUrl);

  /*
  |--------------------------------------------------------------------------
  | BUILD PAYLOAD
  |--------------------------------------------------------------------------
  */

  const payload = {
    content,

    username:
      String(
        config.username ||
          "CortexFlow"
      ).trim() ||
      "CortexFlow",
  };

  /*
  |--------------------------------------------------------------------------
  | OPTIONAL AVATAR
  |--------------------------------------------------------------------------
  */

  if (config.avatarUrl) {
    const avatarUrl = String(
      config.avatarUrl
    ).trim();

    try {
      const parsedAvatar =
        new URL(avatarUrl);

      if (
        parsedAvatar.protocol ===
          "https:" ||
        parsedAvatar.protocol ===
          "http:"
      ) {
        payload.avatar_url =
          avatarUrl;
      }
    } catch (error) {
      throw new Error(
        "Discord avatar URL is invalid."
      );
    }
  }

  /*
  |--------------------------------------------------------------------------
  | SEND REQUEST
  |--------------------------------------------------------------------------
  |
  | wait=true makes Discord return the created message as JSON instead of
  | only returning HTTP 204.
  |
  |--------------------------------------------------------------------------
  */

  const requestUrl = new URL(
    validUrl
  );

  requestUrl.searchParams.set(
    "wait",
    "true"
  );

  let response;

  try {
    response =
      await fetchWithTimeout(
        requestUrl.toString(),
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify(
            payload
          ),
        }
      );
  } catch (error) {
    throw new Error(
      `Discord message failed: ${
        error?.message ||
        "Network request failed."
      }`
    );
  }

  /*
  |--------------------------------------------------------------------------
  | READ RESPONSE
  |--------------------------------------------------------------------------
  */

  const responseText =
    await response
      .text()
      .catch(() => "");

  let data = {};

  if (responseText) {
    try {
      data =
        JSON.parse(responseText);
    } catch (error) {
      data = {
        raw: responseText,
      };
    }
  }

  /*
  |--------------------------------------------------------------------------
  | HANDLE DISCORD ERROR
  |--------------------------------------------------------------------------
  */

  if (!response.ok) {
    const discordMessage =
      data?.message ||
      responseText ||
      response.statusText ||
      "Unknown Discord error";

    throw new Error(
      `Discord webhook failed (${response.status}): ${discordMessage}`
    );
  }

  /*
  |--------------------------------------------------------------------------
  | SUCCESS
  |--------------------------------------------------------------------------
  */

  return {
    provider: "discord",

    success: true,

    method: "webhook",

    messageId:
      data?.id ||
      null,

    channelId:
      data?.channel_id ||
      null,

    content:
      data?.content ||
      content,

    username:
      payload.username,
  };
};

module.exports = {
  send,
};