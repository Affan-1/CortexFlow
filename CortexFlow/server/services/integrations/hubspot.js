/*
|--------------------------------------------------------------------------
| CORTEXFLOW HUBSPOT INTEGRATION
|--------------------------------------------------------------------------
|
| Upserts a HubSpot contact by email using HubSpot CRM v3.
|
| Supported credentials:
|
|   credentials.accessToken
|   credentials.apiKey
|
| Required config:
|
|   config.email
|
| Optional:
|
|   config.firstName
|   config.lastName
|   config.phone
|   config.company
|   config.properties
|
|--------------------------------------------------------------------------
*/

const HUBSPOT_BASE_URL =
  "https://api.hubapi.com";

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
        `HubSpot request timed out after ${timeoutMs}ms.`
      );
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
};

/*
|--------------------------------------------------------------------------
| READ JSON RESPONSE
|--------------------------------------------------------------------------
*/

const readJson = async (response) => {
  try {
    return await response.json();
  } catch (error) {
    return {};
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
    return {};
  }

  if (
    typeof properties ===
    "object" &&
    !Array.isArray(properties)
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
      return {};
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
        "HubSpot properties must be valid JSON."
      );
    }
  }

  throw new Error(
    "HubSpot properties must be an object or valid JSON."
  );
};

/*
|--------------------------------------------------------------------------
| BUILD CONTACT PROPERTIES
|--------------------------------------------------------------------------
*/

const buildContactProperties = (
  config = {}
) => {
  const email = String(
    config.email || ""
  ).trim();

  if (!email) {
    throw new Error(
      "HubSpot node is missing a contact email."
    );
  }

  const properties = {
    email,
    ...normalizeProperties(
      config.properties
    ),
  };

  if (config.firstName) {
    properties.firstname =
      String(
        config.firstName
      ).trim();
  }

  if (config.lastName) {
    properties.lastname =
      String(
        config.lastName
      ).trim();
  }

  if (config.phone) {
    properties.phone =
      String(
        config.phone
      ).trim();
  }

  if (config.company) {
    properties.company =
      String(
        config.company
      ).trim();
  }

  return properties;
};

/*
|--------------------------------------------------------------------------
| SEARCH CONTACT BY EMAIL
|--------------------------------------------------------------------------
*/

const findContactByEmail = async ({
  accessToken,
  email,
}) => {
  const response =
    await fetchWithTimeout(
      `${HUBSPOT_BASE_URL}/crm/v3/objects/contacts/search`,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",

          Authorization:
            `Bearer ${accessToken}`,
        },

        body: JSON.stringify({
          filterGroups: [
            {
              filters: [
                {
                  propertyName:
                    "email",

                  operator:
                    "EQ",

                  value:
                    email,
                },
              ],
            },
          ],

          properties: [
            "email",
            "firstname",
            "lastname",
            "phone",
            "company",
          ],

          limit: 1,
        }),
      }
    );

  const data =
    await readJson(response);

  if (!response.ok) {
    throw new Error(
      data?.message ||
      `HubSpot contact search failed (${response.status}).`
    );
  }

  return data?.results?.[0] || null;
};

/*
|--------------------------------------------------------------------------
| CREATE CONTACT
|--------------------------------------------------------------------------
*/

const createContact = async ({
  accessToken,
  properties,
}) => {
  const response =
    await fetchWithTimeout(
      `${HUBSPOT_BASE_URL}/crm/v3/objects/contacts`,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",

          Authorization:
            `Bearer ${accessToken}`,
        },

        body: JSON.stringify({
          properties,
        }),
      }
    );

  const data =
    await readJson(response);

  if (!response.ok) {
    throw new Error(
      data?.message ||
      `HubSpot contact creation failed (${response.status}).`
    );
  }

  return data;
};

/*
|--------------------------------------------------------------------------
| UPDATE CONTACT
|--------------------------------------------------------------------------
*/

const updateContact = async ({
  accessToken,
  contactId,
  properties,
}) => {
  const response =
    await fetchWithTimeout(
      `${HUBSPOT_BASE_URL}/crm/v3/objects/contacts/${contactId}`,
      {
        method: "PATCH",

        headers: {
          "Content-Type":
            "application/json",

          Authorization:
            `Bearer ${accessToken}`,
        },

        body: JSON.stringify({
          properties,
        }),
      }
    );

  const data =
    await readJson(response);

  if (!response.ok) {
    throw new Error(
      data?.message ||
      `HubSpot contact update failed (${response.status}).`
    );
  }

  return data;
};

/*
|--------------------------------------------------------------------------
| MAIN UPSERT
|--------------------------------------------------------------------------
*/

const upsertContact = async ({
  credentials = {},
  config = {},
}) => {
  const startedAt = Date.now();

  const accessToken =
    String(
      credentials.accessToken ||
      credentials.apiKey ||
      ""
    ).trim();

  if (!accessToken) {
    throw new Error(
      "HubSpot integration is missing an access token."
    );
  }

  const properties =
    buildContactProperties(
      config
    );

  const email =
    properties.email;

  try {
    /*
    |--------------------------------------------------------------------------
    | SEARCH FIRST
    |--------------------------------------------------------------------------
    */

    const existingContact =
      await findContactByEmail({
        accessToken,
        email,
      });

    /*
    |--------------------------------------------------------------------------
    | UPDATE EXISTING
    |--------------------------------------------------------------------------
    */

    if (existingContact?.id) {
      const updated =
        await updateContact({
          accessToken,

          contactId:
            existingContact.id,

          properties,
        });

      return {
        provider:
          "hubspot",

        success: true,

        action:
          "updated",

        contactId:
          updated?.id ||
          existingContact.id,

        email,

        properties:
          updated?.properties ||
          properties,

        duration:
          Date.now() -
          startedAt,
      };
    }

    /*
    |--------------------------------------------------------------------------
    | CREATE NEW
    |--------------------------------------------------------------------------
    */

    const created =
      await createContact({
        accessToken,
        properties,
      });

    return {
      provider:
        "hubspot",

      success: true,

      action:
        "created",

      contactId:
        created?.id ||
        null,

      email,

      properties:
        created?.properties ||
        properties,

      duration:
        Date.now() -
        startedAt,
    };
  } catch (error) {
    const message =
      error?.message ||
      "Unknown HubSpot error";

    throw new Error(
      `HubSpot upsert failed: ${message}`
    );
  }
};

module.exports = {
  upsertContact,
};