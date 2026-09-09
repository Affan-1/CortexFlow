/*
|--------------------------------------------------------------------------
| CORTEXFLOW NOTION INTEGRATION
|--------------------------------------------------------------------------
|
| Creates a real Notion page using a Notion Internal Integration.
|
| Supported credentials:
|
|   credentials.token
|   credentials.apiKey
|
| Supported targets:
|
|   1. Database / data source
|   2. Normal Notion page
|
|--------------------------------------------------------------------------
*/

const NOTION_API_URL =
  "https://api.notion.com/v1/pages";

const NOTION_VERSION =
  "2022-06-28";

const DEFAULT_TIMEOUT_MS =
  15000;

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
      error?.name ===
      "AbortError"
    ) {
      throw new Error(
        `Notion request timed out after ${timeoutMs}ms.`
      );
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
};

/*
|--------------------------------------------------------------------------
| NORMALIZE NOTION ID
|--------------------------------------------------------------------------
|
| Accepts:
|
|   abcdef123456...
|
| or a Notion URL:
|
|   https://www.notion.so/...-abcdef123456...
|
|--------------------------------------------------------------------------
*/

const normalizeNotionId = (
  value
) => {
  if (!value) {
    return "";
  }

  const input =
    String(value).trim();

  /*
  |--------------------------------------------------------------------------
  | Plain ID
  |--------------------------------------------------------------------------
  */

  if (
    !input.startsWith(
      "http://"
    ) &&
    !input.startsWith(
      "https://"
    )
  ) {
    return input.replace(
      /-/g,
      ""
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Extract ID from URL
  |--------------------------------------------------------------------------
  */

  try {
    const parsed =
      new URL(input);

    const pathname =
      decodeURIComponent(
        parsed.pathname
      );

    const matches =
      pathname.match(
        /([a-f0-9]{32})(?:$|[/?])/i
      );

    if (matches?.[1]) {
      return matches[1];
    }

    /*
    |--------------------------------------------------------------------------
    | Notion URLs often contain hyphenated UUIDs.
    |--------------------------------------------------------------------------
    */

    const uuidMatch =
      pathname.match(
        /([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i
      );

    if (uuidMatch?.[1]) {
      return uuidMatch[1].replace(
        /-/g,
        ""
      );
    }

    return input;
  } catch (error) {
    return input;
  }
};

/*
|--------------------------------------------------------------------------
| NORMALIZE PROPERTIES
|--------------------------------------------------------------------------
*/

const normalizeProperties = (
  properties
) => {
  if (!properties) {
    return null;
  }

  if (
    typeof properties ===
    "object"
  ) {
    return properties;
  }

  if (
    typeof properties ===
    "string"
  ) {
    const trimmed =
      properties.trim();

    if (!trimmed) {
      return null;
    }

    try {
      const parsed =
        JSON.parse(trimmed);

      if (
        !parsed ||
        typeof parsed !==
          "object" ||
        Array.isArray(parsed)
      ) {
        throw new Error();
      }

      return parsed;
    } catch (error) {
      throw new Error(
        "Notion properties must be valid JSON."
      );
    }
  }

  throw new Error(
    "Notion properties must be an object or JSON object."
  );
};

/*
|--------------------------------------------------------------------------
| BUILD TITLE PROPERTY
|--------------------------------------------------------------------------
*/

const buildTitleProperties = ({
  title,
  titleField = "Name",
}) => {
  const cleanTitle =
    String(title || "").trim();

  if (!cleanTitle) {
    return null;
  }

  return {
    [titleField]: {
      title: [
        {
          text: {
            content:
              cleanTitle,
          },
        },
      ],
    },
  };
};

/*
|--------------------------------------------------------------------------
| MAIN CREATE PAGE
|--------------------------------------------------------------------------
*/

const createPage = async ({
  credentials = {},
  config = {},
}) => {
  const startedAt =
    Date.now();

  /*
  |--------------------------------------------------------------------------
  | AUTHENTICATION
  |--------------------------------------------------------------------------
  */

  const apiKey =
    String(
      credentials.token ||
        credentials.apiKey ||
        ""
    ).trim();

  if (!apiKey) {
    throw new Error(
      "Notion integration is missing an integration token."
    );
  }

  /*
  |--------------------------------------------------------------------------
  | TARGET
  |--------------------------------------------------------------------------
  |
  | Current CortexFlow action primarily uses a database/data-source target.
  |
  |--------------------------------------------------------------------------
  */

  const databaseId =
    normalizeNotionId(
      config.databaseId ||
        config.parentPageId ||
        credentials.databaseId ||
        credentials.defaultDatabaseId
    );

  if (!databaseId) {
    throw new Error(
      "Notion node is missing a database/page ID."
    );
  }

  /*
  |--------------------------------------------------------------------------
  | PROPERTIES
  |--------------------------------------------------------------------------
  */

  let properties =
    normalizeProperties(
      config.properties
    );

  if (!properties) {
    properties =
      buildTitleProperties({
        title:
          config.title,

        titleField:
          config.titleField ||
          "Name",
      });
  }

  if (!properties) {
    throw new Error(
      "Notion node is missing a page title or properties."
    );
  }

  /*
  |--------------------------------------------------------------------------
  | REQUEST BODY
  |--------------------------------------------------------------------------
  */

  const requestBody = {
    parent: {
      database_id:
        databaseId,
    },

    properties,
  };

  /*
  |--------------------------------------------------------------------------
  | CREATE PAGE
  |--------------------------------------------------------------------------
  */

  let response;

  try {
    response =
      await fetchWithTimeout(
        NOTION_API_URL,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",

            Authorization:
              `Bearer ${apiKey}`,

            "Notion-Version":
              NOTION_VERSION,
          },

          body:
            JSON.stringify(
              requestBody
            ),
        }
      );
  } catch (error) {
    throw new Error(
      `Notion request failed: ${
        error?.message ||
        "Network request failed."
      }`
    );
  }

  /*
  |--------------------------------------------------------------------------
  | RESPONSE
  |--------------------------------------------------------------------------
  */

  let data = {};

  try {
    data =
      await response.json();
  } catch (error) {
    data = {};
  }

  /*
  |--------------------------------------------------------------------------
  | ERROR HANDLING
  |--------------------------------------------------------------------------
  */

  if (!response.ok) {
    const message =
      data?.message ||
      response.statusText ||
      "Unknown Notion error";

    if (
      response.status === 401
    ) {
      throw new Error(
        `Notion authentication failed: ${message}`
      );
    }

    if (
      response.status === 403
    ) {
      throw new Error(
        `Notion access denied: ${message}. Make sure the target page/database is connected to the CortexFlow integration.`
      );
    }

    if (
      response.status === 404
    ) {
      throw new Error(
        `Notion target was not found: ${message}. Check the database/page ID and integration access.`
      );
    }

    throw new Error(
      `Notion request failed (${response.status}): ${message}`
    );
  }

  /*
  |--------------------------------------------------------------------------
  | SUCCESS
  |--------------------------------------------------------------------------
  */

  return {
    provider:
      "notion",

    success: true,

    pageId:
      data?.id ||
      null,

    url:
      data?.url ||
      null,

    createdTime:
      data?.created_time ||
      null,

    duration:
      Date.now() -
      startedAt,
  };
};

module.exports = {
  createPage,
};