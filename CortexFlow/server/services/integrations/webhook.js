/*
|--------------------------------------------------------------------------
| CORTEXFLOW GENERIC WEBHOOK INTEGRATION
|--------------------------------------------------------------------------
|
| Executes outbound HTTP requests from the "Webhook Call" Action Node.
|
| Supports:
|
| GET
| POST
| PUT
| PATCH
| DELETE
|
| Custom headers
| JSON request bodies
| Query parameters
| Saved webhook credentials
| Request timeout
| Response parsing
| HTTP error handling
|
|--------------------------------------------------------------------------
*/

/*
|--------------------------------------------------------------------------
| CONSTANTS
|--------------------------------------------------------------------------
*/

const ALLOWED_METHODS = [
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
];

const DEFAULT_TIMEOUT_MS = 15000;

const MAX_TIMEOUT_MS = 60000;

/*
|--------------------------------------------------------------------------
| SAFE JSON PARSER
|--------------------------------------------------------------------------
*/

const tryParseJson = (value) => {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return null;
  }

  if (
    typeof value === "object"
  ) {
    return value;
  }

  try {
    return JSON.parse(
      String(value)
    );
  } catch (error) {
    return null;
  }
};

/*
|--------------------------------------------------------------------------
| NORMALIZE HEADERS
|--------------------------------------------------------------------------
|
| Headers can come from:
|
| 1. Saved Webhook Integration
| 2. Workflow node configuration
|
| They may be stored as an object or JSON string.
|
|--------------------------------------------------------------------------
*/

const normalizeHeaders = (
  value
) => {
  if (!value) {
    return {};
  }

  if (
    typeof value === "object" &&
    !Array.isArray(value)
  ) {
    return value;
  }

  const parsed =
    tryParseJson(value);

  if (
    parsed &&
    typeof parsed === "object" &&
    !Array.isArray(parsed)
  ) {
    return parsed;
  }

  throw new Error(
    "Webhook headers must be a valid JSON object."
  );
};

/*
|--------------------------------------------------------------------------
| NORMALIZE BODY
|--------------------------------------------------------------------------
*/

const normalizeBody = (
  value
) => {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return {};
  }

  if (
    typeof value === "object"
  ) {
    return value;
  }

  const parsed =
    tryParseJson(value);

  /*
  |--------------------------------------------------------------------------
  | VALID JSON STRING
  |--------------------------------------------------------------------------
  */

  if (parsed !== null) {
    return parsed;
  }

  /*
  |--------------------------------------------------------------------------
  | PLAIN TEXT
  |--------------------------------------------------------------------------
  */

  return String(value);
};

/*
|--------------------------------------------------------------------------
| QUERY PARAMETERS
|--------------------------------------------------------------------------
|
| Supports:
|
| {
|   "source": "cortexflow",
|   "leadId": "123"
| }
|
| or a JSON string containing the same object.
|
|--------------------------------------------------------------------------
*/

const appendQueryParams = (
  rawUrl,
  query
) => {
  if (!query) {
    return rawUrl;
  }

  let queryObject =
    query;

  if (
    typeof query === "string"
  ) {
    queryObject =
      tryParseJson(query);

    if (!queryObject) {
      throw new Error(
        "Webhook query parameters must be valid JSON."
      );
    }
  }

  if (
    typeof queryObject !==
      "object" ||
    Array.isArray(queryObject)
  ) {
    throw new Error(
      "Webhook query parameters must be an object."
    );
  }

  const url =
    new URL(rawUrl);

  Object.entries(
    queryObject
  ).forEach(
    ([key, value]) => {
      if (
        value === undefined ||
        value === null
      ) {
        return;
      }

      if (
        Array.isArray(value)
      ) {
        value.forEach(
          (item) =>
            url.searchParams.append(
              key,
              String(item)
            )
        );

        return;
      }

      url.searchParams.set(
        key,
        String(value)
      );
    }
  );

  return url.toString();
};

/*
|--------------------------------------------------------------------------
| RESPONSE BODY PARSER
|--------------------------------------------------------------------------
*/

const parseResponseBody =
  async (response) => {
    const text =
      await response
        .text()
        .catch(() => "");

    if (!text) {
      return null;
    }

    const contentType =
      response.headers.get(
        "content-type"
      ) || "";

    if (
      contentType.includes(
        "application/json"
      )
    ) {
      try {
        return JSON.parse(
          text
        );
      } catch (error) {
        return text;
      }
    }

    /*
    |--------------------------------------------------------------------------
    | Some APIs return JSON without the correct Content-Type.
    |--------------------------------------------------------------------------
    */

    const parsed =
      tryParseJson(text);

    return parsed !== null
      ? parsed
      : text;
  };

/*
|--------------------------------------------------------------------------
| RESPONSE HEADERS
|--------------------------------------------------------------------------
*/

const responseHeadersToObject = (
  headers
) => {
  const result = {};

  try {
    headers.forEach(
      (value, key) => {
        result[key] = value;
      }
    );
  } catch (error) {
    // Headers are optional metadata.
  }

  return result;
};

/*
|--------------------------------------------------------------------------
| ERROR BODY FORMATTER
|--------------------------------------------------------------------------
*/

const formatErrorBody = (
  body
) => {
  if (
    body === undefined ||
    body === null
  ) {
    return "";
  }

  if (
    typeof body === "string"
  ) {
    return body.slice(
      0,
      1000
    );
  }

  try {
    return JSON.stringify(
      body
    ).slice(0, 1000);
  } catch (error) {
    return String(body).slice(
      0,
      1000
    );
  }
};

/*
|--------------------------------------------------------------------------
| EXECUTE WEBHOOK
|--------------------------------------------------------------------------
*/

const call = async ({
  credentials = {},
  config = {},
}) => {
  /*
  |--------------------------------------------------------------------------
  | URL
  |--------------------------------------------------------------------------
  */

  const rawUrl =
    String(
      config.url ||
        credentials.url ||
        ""
    ).trim();

  if (!rawUrl) {
    throw new Error(
      "Webhook node is missing a target URL."
    );
  }

  /*
  |--------------------------------------------------------------------------
  | VALIDATE URL
  |--------------------------------------------------------------------------
  */

  let parsedUrl;

  try {
    parsedUrl =
      new URL(rawUrl);
  } catch (error) {
    throw new Error(
      "Webhook target URL is invalid."
    );
  }

  if (
    ![
      "http:",
      "https:",
    ].includes(
      parsedUrl.protocol
    )
  ) {
    throw new Error(
      "Webhook URL must use HTTP or HTTPS."
    );
  }

  /*
  |--------------------------------------------------------------------------
  | METHOD
  |--------------------------------------------------------------------------
  */

  const method =
    String(
      config.method ||
        "POST"
    )
      .trim()
      .toUpperCase();

  if (
    !ALLOWED_METHODS.includes(
      method
    )
  ) {
    throw new Error(
      `Unsupported webhook HTTP method: ${method}`
    );
  }

  /*
  |--------------------------------------------------------------------------
  | HEADERS
  |--------------------------------------------------------------------------
  */

  const credentialHeaders =
    normalizeHeaders(
      credentials.headers
    );

  const configHeaders =
    normalizeHeaders(
      config.headers
    );

  const headers = {
    ...credentialHeaders,
    ...configHeaders,
  };

  /*
  |--------------------------------------------------------------------------
  | AUTH TOKEN
  |--------------------------------------------------------------------------
  |
  | Allows a saved generic Webhook integration to provide a bearer token.
  |
  |--------------------------------------------------------------------------
  */

  const token =
    config.token ||
    credentials.token;

  if (
    token &&
    !headers.Authorization &&
    !headers.authorization
  ) {
    headers.Authorization =
      `Bearer ${token}`;
  }

  /*
  |--------------------------------------------------------------------------
  | QUERY PARAMETERS
  |--------------------------------------------------------------------------
  */

  const url =
    appendQueryParams(
      parsedUrl.toString(),
      config.query ||
        config.queryParams
    );

  /*
  |--------------------------------------------------------------------------
  | REQUEST BODY
  |--------------------------------------------------------------------------
  */

  const canHaveBody =
    ![
      "GET",
      "HEAD",
    ].includes(method);

  let body;

  if (canHaveBody) {
    const normalizedBody =
      normalizeBody(
        config.body
      );

    /*
    |--------------------------------------------------------------------------
    | STRING BODY
    |--------------------------------------------------------------------------
    */

    if (
      typeof normalizedBody ===
      "string"
    ) {
      body =
        normalizedBody;

      if (
        !headers[
          "Content-Type"
        ] &&
        !headers[
          "content-type"
        ]
      ) {
        headers[
          "Content-Type"
        ] = "text/plain";
      }
    } else {
      body =
        JSON.stringify(
          normalizedBody
        );

      if (
        !headers[
          "Content-Type"
        ] &&
        !headers[
          "content-type"
        ]
      ) {
        headers[
          "Content-Type"
        ] =
          "application/json";
      }
    }
  }

  /*
  |--------------------------------------------------------------------------
  | TIMEOUT
  |--------------------------------------------------------------------------
  */

  const configuredTimeout =
    Number(
      config.timeout ||
        credentials.timeout ||
        DEFAULT_TIMEOUT_MS
    );

  const timeoutMs =
    Number.isFinite(
      configuredTimeout
    ) &&
    configuredTimeout > 0
      ? Math.min(
          configuredTimeout,
          MAX_TIMEOUT_MS
        )
      : DEFAULT_TIMEOUT_MS;

  const controller =
    new AbortController();

  const timeout =
    setTimeout(
      () =>
        controller.abort(),
      timeoutMs
    );

  /*
  |--------------------------------------------------------------------------
  | HTTP REQUEST
  |--------------------------------------------------------------------------
  */

  const startedAt =
    Date.now();

  try {
    const response =
      await fetch(url, {
        method,
        headers,
        body,
        signal:
          controller.signal,
      });

    const duration =
      Date.now() -
      startedAt;

    const responseBody =
      await parseResponseBody(
        response
      );

    const responseHeaders =
      responseHeadersToObject(
        response.headers
      );

    /*
    |--------------------------------------------------------------------------
    | HTTP ERROR
    |--------------------------------------------------------------------------
    */

    if (!response.ok) {
      const errorBody =
        formatErrorBody(
          responseBody
        );

      throw new Error(
        `Webhook call failed (${response.status} ${response.statusText})${
          errorBody
            ? `: ${errorBody}`
            : ""
        }`
      );
    }

    /*
    |--------------------------------------------------------------------------
    | SUCCESS
    |--------------------------------------------------------------------------
    */

    return {
      provider:
        "webhook",

      success: true,

      method,

      url,

      status:
        response.status,

      statusText:
        response.statusText,

      duration,

      headers:
        responseHeaders,

      body:
        responseBody,
    };
  } catch (error) {
    /*
    |--------------------------------------------------------------------------
    | TIMEOUT ERROR
    |--------------------------------------------------------------------------
    */

    if (
      error?.name ===
      "AbortError"
    ) {
      throw new Error(
        `Webhook request timed out after ${timeoutMs}ms.`
      );
    }

    /*
    |--------------------------------------------------------------------------
    | NETWORK / API ERROR
    |--------------------------------------------------------------------------
    */

    throw error;
  } finally {
    clearTimeout(
      timeout
    );
  }
};

module.exports = {
  call,
};